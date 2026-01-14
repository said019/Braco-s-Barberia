import cron from 'node-cron';
import { query } from '../config/database.js';
import { sendDepositCancellation } from '../services/whatsappService.js';

/**
 * Cron Job: Auto-cancel pending appointments that exceeded deposit timeout (1 hour)
 * Runs every 5 minutes
 */
const initDepositTimeoutJob = () => {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        console.log('[CRON] Checking for expired deposit appointments...');

        try {
            // Find pending appointments that have expired
            const expiredResult = await query(`
                SELECT a.id, a.appointment_date, a.start_time, a.deposit_expires_at,
                       c.name as client_name, c.phone as client_phone, c.whatsapp_enabled,
                       s.name as service_name
                FROM appointments a
                JOIN clients c ON a.client_id = c.id
                JOIN services s ON a.service_id = s.id
                WHERE a.status = 'pending'
                  AND a.deposit_expires_at IS NOT NULL
                  AND a.deposit_expires_at < NOW()
            `);

            if (expiredResult.rows.length === 0) {
                console.log('[CRON] No expired deposit appointments found.');
                return;
            }

            console.log(`[CRON] Found ${expiredResult.rows.length} expired appointments to cancel.`);

            for (const apt of expiredResult.rows) {
                try {
                    // Cancel the appointment
                    await query(`
                        UPDATE appointments 
                        SET status = 'cancelled',
                            notes = COALESCE(notes, '') || ' [AUTO-CANCELADO: Depósito no recibido en 1 hora]',
                            cancelled_reason = 'Depósito no recibido dentro del tiempo límite',
                            updated_at = NOW()
                        WHERE id = $1
                    `, [apt.id]);

                    console.log(`[CRON] Auto-cancelled appointment ${apt.id} for ${apt.client_name} - Deposit timeout expired`);

                    // Send WhatsApp notification to client
                    if (apt.client_phone && apt.whatsapp_enabled !== false) {
                        // Format date for message - handle Date object or string
                        const dateVal = apt.appointment_date;
                        let formattedDate = 'fecha programada';
                        try {
                            // PostgreSQL can return Date object or string
                            let dateToFormat;
                            if (dateVal instanceof Date) {
                                // Use the date parts directly to avoid timezone shift
                                const year = dateVal.getFullYear();
                                const month = dateVal.getMonth();
                                const day = dateVal.getDate();
                                dateToFormat = new Date(year, month, day, 12, 0, 0);
                            } else if (typeof dateVal === 'string') {
                                const datePart = dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
                                const [y, m, d] = datePart.split('-').map(Number);
                                dateToFormat = new Date(y, m - 1, d, 12, 0, 0);
                            } else {
                                dateToFormat = new Date();
                            }
                            formattedDate = dateToFormat.toLocaleDateString('es-MX', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long'
                            });
                        } catch (e) {
                            console.warn('[CRON] Error formatting date:', e);
                            formattedDate = 'tu cita';
                        }

                        const whatsappRes = await sendDepositCancellation({
                            phone: apt.client_phone,
                            name: apt.client_name,
                            date: formattedDate,
                            bookingUrl: process.env.PUBLIC_URL ? `${process.env.PUBLIC_URL}/agendar.html` : 'https://bracos-barberia-production.up.railway.app/agendar.html'
                        });

                        if (whatsappRes.success) {
                            console.log(`[CRON] Sent cancellation WhatsApp to ${apt.client_name}: ${whatsappRes.id}`);
                        } else {
                            console.warn(`[CRON] Failed to send WhatsApp to ${apt.client_name}: ${whatsappRes.error}`);
                        }
                    }

                } catch (cancelError) {
                    console.error(`[CRON] Error cancelling appointment ${apt.id}:`, cancelError);
                }
            }

            console.log(`[CRON] Deposit timeout check complete. Cancelled ${expiredResult.rows.length} appointments.`);

        } catch (error) {
            console.error('[CRON] Error in deposit timeout job:', error);
        }
    });

    console.log('[CRON] Deposit timeout job initialized (runs every 5 minutes)');
};

export { initDepositTimeoutJob };
export default initDepositTimeoutJob;


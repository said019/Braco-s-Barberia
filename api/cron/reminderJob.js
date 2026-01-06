import cron from 'node-cron';
import { query } from '../config/database.js';
import whatsappService from '../services/whatsappService.js';

// Cron Job: Ejecutar cada 10 minutos para verificar recordatorios
const initReminderJob = () => {
    cron.schedule('*/10 * * * *', async () => {
        console.log('[CRON] Checking for appointment reminders...');

        try {
            // ============================================
            // RECORDATORIO 24 HORAS ANTES
            // Buscar citas entre 20h y 28h en el futuro
            // ============================================
            const reminder24hResult = await query(`
                SELECT a.id, a.start_time, a.appointment_date, a.checkout_code,
                       c.name, c.phone, c.whatsapp_enabled, s.name as service_name
                FROM appointments a
                JOIN clients c ON a.client_id = c.id
                JOIN services s ON a.service_id = s.id
                WHERE a.status IN ('scheduled', 'confirmed')
                  AND a.reminder_sent = FALSE
                  AND c.whatsapp_enabled = TRUE
                  AND c.phone IS NOT NULL
                  AND (a.appointment_date || ' ' || a.start_time)::timestamp
                      BETWEEN (NOW() AT TIME ZONE 'America/Mexico_City') + INTERVAL '20 hours'
                          AND (NOW() AT TIME ZONE 'America/Mexico_City') + INTERVAL '28 hours'
            `);

            if (reminder24hResult.rows.length > 0) {
                console.log(`[CRON] Found ${reminder24hResult.rows.length} 24h reminders to send.`);

                for (const appt of reminder24hResult.rows) {
                    try {
                        const timeStr = appt.start_time.substring(0, 5);
                        const res = await whatsappService.sendReminder24h({
                            phone: appt.phone,
                            name: appt.name,
                            service: appt.service_name,
                            time: timeStr,
                            code: appt.checkout_code
                        });

                        if (res.success) {
                            await query('UPDATE appointments SET reminder_sent = TRUE WHERE id = $1', [appt.id]);
                            console.log(`[CRON] 24h reminder sent for appt ${appt.id}`);
                        } else {
                            console.error(`[CRON] Failed 24h reminder for appt ${appt.id}: ${res.error}`);
                        }
                    } catch (err) {
                        console.error(`[CRON] Error 24h reminder appt ${appt.id}:`, err);
                    }
                }
            }

            // ============================================
            // RECORDATORIO 2 HORAS ANTES
            // Buscar citas entre 1.5h y 2.5h en el futuro
            // ============================================
            const reminder2hResult = await query(`
                SELECT a.id, a.start_time, a.appointment_date, a.checkout_code,
                       c.name, c.phone, c.whatsapp_enabled, s.name as service_name
                FROM appointments a
                JOIN clients c ON a.client_id = c.id
                JOIN services s ON a.service_id = s.id
                WHERE a.status IN ('scheduled', 'confirmed')
                  AND a.reminder_2h_sent = FALSE
                  AND c.whatsapp_enabled = TRUE
                  AND c.phone IS NOT NULL
                  AND (a.appointment_date || ' ' || a.start_time)::timestamp
                      BETWEEN (NOW() AT TIME ZONE 'America/Mexico_City') + INTERVAL '90 minutes'
                          AND (NOW() AT TIME ZONE 'America/Mexico_City') + INTERVAL '150 minutes'
            `);

            if (reminder2hResult.rows.length > 0) {
                console.log(`[CRON] Found ${reminder2hResult.rows.length} 2h reminders to send.`);

                for (const appt of reminder2hResult.rows) {
                    try {
                        const timeStr = appt.start_time.substring(0, 5);
                        const res = await whatsappService.sendReminder2h({
                            phone: appt.phone,
                            name: appt.name,
                            service: appt.service_name,
                            time: timeStr,
                            code: appt.checkout_code
                        });

                        if (res.success) {
                            await query('UPDATE appointments SET reminder_2h_sent = TRUE WHERE id = $1', [appt.id]);
                            console.log(`[CRON] 2h reminder sent for appt ${appt.id}`);
                        } else {
                            console.error(`[CRON] Failed 2h reminder for appt ${appt.id}: ${res.error}`);
                        }
                    } catch (err) {
                        console.error(`[CRON] Error 2h reminder appt ${appt.id}:`, err);
                    }
                }
            }

            if (reminder24hResult.rows.length === 0 && reminder2hResult.rows.length === 0) {
                console.log('[CRON] No reminders needed this cycle.');
            }

        } catch (error) {
            console.error('[CRON] Error in reminder job:', error);
        }
    });

    console.log('[CRON] Reminder job initialized (running every 10 minutes).');
};

export default initReminderJob;

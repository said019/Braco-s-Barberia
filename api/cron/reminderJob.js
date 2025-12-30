import cron from 'node-cron';
import { query } from '../config/database.js';
import whatsappService from '../services/whatsappService.js';

// Cron Job: Ejecutar cada hora a los minutos 0
// Verificar citas que ocurren en las próximas 20-28 horas (ventana amplia para no perder ninguna)
// y que no se les haya enviado recordatorio.
const initReminderJob = () => {
    // Programar para correr al minuto 0 de cada hora: '0 * * * *'
    cron.schedule('0 * * * *', async () => {
        console.log('[CRON] Checking for appointment reminders...');

        try {
            // Buscar citas entre 20h y 28h en el futuro (ventana amplia de 8 horas)
            // Esto asegura que no perdemos ninguna cita por desfases de minutos/segundos
            // IMPORTANTE: Usar timezone de México porque las citas se guardan en hora local
            const hourlyResult = await query(`
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

            const appointments = hourlyResult.rows;

            if (appointments.length > 0) {
                console.log(`[CRON] Found ${appointments.length} appointments reminders to send.`);

                for (const appt of appointments) {
                    try {
                        const timeStr = appt.start_time.substring(0, 5); // 10:00:00 -> 10:00
                        const res = await whatsappService.sendReminder24h({
                            phone: appt.phone,
                            name: appt.name,
                            service: appt.service_name,
                            time: timeStr,
                            code: appt.checkout_code
                        });

                        if (res.success) {
                            // Solo actualizar reminder_sent, sin whatsapp_message_id que no existe
                            await query('UPDATE appointments SET reminder_sent = TRUE WHERE id = $1', [appt.id]);
                            console.log(`[CRON] Reminder sent for appt ${appt.id}`);
                        } else {
                            console.error(`[CRON] Failed to send reminder for appt ${appt.id}: ${res.error}`);
                        }
                    } catch (err) {
                        console.error(`[CRON] Error process appt ${appt.id}:`, err);
                    }
                }
            } else {
                console.log('[CRON] No reminders needed this hour.');
            }

        } catch (error) {
            console.error('[CRON] Error in reminder job:', error);
        }
    });

    console.log('[CRON] Reminder job initialized (running hourly).');
};

export default initReminderJob;

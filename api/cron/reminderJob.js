import cron from 'node-cron';
import { query } from '../config/database.js';
import whatsappService from '../services/whatsappService.js';

// Cron Job: Ejecutar cada hora a los minutos 0
// Verificar citas que ocurren en el rango de 23 a 25 horas en el futuro
// y que no se les haya enviado recordatorio.
const initReminderJob = () => {
    // Programar para correr al minuto 0 de cada hora: '0 * * * *'
    cron.schedule('0 * * * *', async () => {
        console.log('[CRON] Checking for appointment reminders...');

        try {
            // Buscar citas para mañana (entre 23h y 25h desde ahora) que no tengan recordatorio enviado
            // y que sean status 'scheduled' o 'confirmed'
            const result = await query(`
                SELECT a.id, a.start_time, a.appointment_date, a.checkout_code, 
                       c.name, c.phone, c.whatsapp_enabled, s.name as service_name
                FROM appointments a
                JOIN clients c ON a.client_id = c.id
                JOIN services s ON a.service_id = s.id
                WHERE a.status IN ('scheduled', 'confirmed')
                  AND a.reminder_sent = FALSE
                  AND a.appointment_date = CURRENT_DATE + INTERVAL '1 day'
                  AND c.phone IS NOT NULL
            `);
            // Nota: La condición de fecha CURRENT_DATE + INTERVAL '1 day' es simple y efectiva si corremos esto diario.
            // Pero si corremos cada hora, queremos cierta precisión.
            // Mejor lógica:
            // "Donde (fecha + hora) sea > ahora + 23h Y (fecha + hora) < ahora + 25h"

            // Re-refinando query para precisión horaria:
            /*
            SELECT ...
            FROM appointments a ...
            WHERE a.status IN ('scheduled', 'confirmed')
            AND a.reminder_sent = FALSE
            AND (a.appointment_date || ' ' || a.start_time)::timestamp 
                BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
            */

            const hourlyResult = await query(`
                SELECT a.id, a.start_time, a.appointment_date, a.checkout_code, 
                       c.name, c.phone, c.whatsapp_enabled, s.name as service_name
                FROM appointments a
                JOIN clients c ON a.client_id = c.id
                JOIN services s ON a.service_id = s.id
                WHERE a.status IN ('scheduled', 'confirmed')
                  AND a.reminder_sent = FALSE
                  AND (a.appointment_date || ' ' || a.start_time)::timestamp 
                      BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
            `);

            const appointments = hourlyResult.rows;

            if (appointments.length > 0) {
                console.log(`[CRON] Found ${appointments.length} appointments reminders to send.`);

                for (const appt of appointments) {
                    if (appt.whatsapp_enabled === false) continue;

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
                            await query('UPDATE appointments SET reminder_sent = TRUE, whatsapp_message_id = $1 WHERE id = $2', [res.id, appt.id]);
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

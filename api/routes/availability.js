import express from 'express';
import db from '../config/database.js';

// Importar motor de disponibilidad
import {
    timeToMinutes,
    minutesToTime,
    formatTimeDisplay,
    timesOverlap,
    generateAvailableSlots
} from '../utils/availability-engine.js';

const router = express.Router();

/**
 * GET /api/availability/slots
 * 
 * Query params:
 * - service_id: ID del servicio
 * - date: Fecha YYYY-MM-DD
 */
router.get('/slots', async (req, res, next) => {
    try {
        const { service_id, date } = req.query;

        // Validar parámetros
        if (!service_id || !date) {
            return res.status(400).json({
                error: 'Se requiere service_id y date'
            });
        }

        // Validar formato de fecha
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                error: 'Formato de fecha inválido. Use YYYY-MM-DD'
            });
        }

        // 1. Obtener duración del servicio
        const serviceResult = await db.query(
            'SELECT duration_minutes, name FROM services WHERE id = $1 AND is_active = true',
            [service_id]
        );

        if (serviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        const serviceDuration = serviceResult.rows[0].duration_minutes;
        const serviceName = serviceResult.rows[0].name;

        // 2. Verificar si la fecha está bloqueada (día completo)
        const blockedResult = await db.query(
            'SELECT reason FROM blocked_dates WHERE blocked_date = $1 AND start_time IS NULL',
            [date]
        );

        if (blockedResult.rows.length > 0) {
            return res.json({
                date,
                service_id: parseInt(service_id),
                service_name: serviceName,
                service_duration: serviceDuration,
                blocked: true,
                blocked_reason: blockedResult.rows[0].reason,
                slots: []
            });
        }

        // 3. Obtener día de la semana (0=Domingo)
        const dateObj = new Date(date + 'T12:00:00');
        const dayOfWeek = dateObj.getDay();

        // 4. Obtener horario del negocio para ese día
        const hoursResult = await db.query(
            'SELECT * FROM business_hours WHERE day_of_week = $1',
            [dayOfWeek]
        );

        if (hoursResult.rows.length === 0 || !hoursResult.rows[0].is_open) {
            return res.json({
                date,
                service_id: parseInt(service_id),
                service_name: serviceName,
                service_duration: serviceDuration,
                closed: true,
                slots: []
            });
        }

        const businessHours = hoursResult.rows[0];

        // 5. Obtener citas existentes para ese día (NO canceladas)
        const appointmentsResult = await db.query(`
            SELECT start_time, end_time 
            FROM appointments 
            WHERE appointment_date = $1 
            AND status NOT IN ('cancelled', 'no_show')
            ORDER BY start_time
        `, [date]);

        // 6. Obtener intervalo de configuración
        const settingsResult = await db.query(
            "SELECT value FROM system_settings WHERE key = 'slot_interval_minutes'"
        );
        const slotInterval = settingsResult.rows.length > 0
            ? parseInt(settingsResult.rows[0].value)
            : 30;

        // 7. Obtener horarios bloqueados para esa fecha (parciales)
        const blockedSlotsResult = await db.query(`
            SELECT start_time, end_time, reason
            FROM blocked_dates
            WHERE blocked_date = $1 AND start_time IS NOT NULL
            ORDER BY start_time
        `, [date]);

        // 8. Generar slots con el algoritmo inteligente
        let slots = generateAvailableSlots({
            serviceDuration,
            businessHours: {
                open_time: businessHours.open_time,
                close_time: businessHours.close_time,
                break_start: businessHours.break_start,
                break_end: businessHours.break_end,
                is_open: businessHours.is_open
            },
            existingAppointments: appointmentsResult.rows,
            blockedSlots: blockedSlotsResult.rows,
            slotInterval
        });

        // 9. Filtrar slots pasados si es HOY (usando timezone Mexico City)
        const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Mexico_City' });

        if (date === todayStr) {
            // Get current time in Mexico City
            const nowInMexico = new Date().toLocaleString("en-US", { timeZone: "America/Mexico_City" });
            const mexicoNow = new Date(nowInMexico);
            const currentMinutes = mexicoNow.getHours() * 60 + mexicoNow.getMinutes();

            console.log(`[AVAILABILITY] Today detected. Mexico time: ${mexicoNow.toTimeString()}, currentMinutes: ${currentMinutes}`);

            // Filter out past slots - mark them as unavailable
            slots = slots.map(slot => {
                const slotMinutes = timeToMinutes(slot.time);
                if (slotMinutes <= currentMinutes) {
                    return { ...slot, available: false, past: true };
                }
                return slot;
            });

            // Only return available (future) slots
            slots = slots.filter(slot => slot.available);
        }

        res.json({
            date,
            service_id: parseInt(service_id),
            service_name: serviceName,
            service_duration: serviceDuration,
            business_hours: {
                open: businessHours.open_time,
                close: businessHours.close_time,
                break_start: businessHours.break_start,
                break_end: businessHours.break_end
            },
            existing_appointments: appointmentsResult.rows.length,
            total_slots: slots.length,
            available_slots: slots.filter(s => s.available).length,
            slots
        });

    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/availability/dates
 * Obtiene fechas disponibles para un servicio
 */
router.get('/dates', async (req, res, next) => {
    try {
        const { service_id, days = 30 } = req.query;

        if (!service_id) {
            return res.status(400).json({ error: 'Se requiere service_id' });
        }

        // Obtener servicio
        const serviceResult = await db.query(
            'SELECT duration_minutes FROM services WHERE id = $1 AND is_active = true',
            [service_id]
        );

        if (serviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        const serviceDuration = serviceResult.rows[0].duration_minutes;

        // Obtener horarios de negocio
        const hoursResult = await db.query(
            'SELECT * FROM business_hours ORDER BY day_of_week'
        );
        const businessHoursMap = {};
        hoursResult.rows.forEach(h => {
            businessHoursMap[h.day_of_week] = h;
        });

        // Obtener días bloqueados
        const blockedResult = await db.query(
            'SELECT blocked_date FROM blocked_dates WHERE blocked_date >= CURRENT_DATE'
        );
        const blockedDates = new Set(
            blockedResult.rows.map(r => r.blocked_date.toISOString().split('T')[0])
        );

        // Obtener días de anticipación de configuración
        const settingsResult = await db.query(
            "SELECT value FROM system_settings WHERE key = 'advance_booking_days'"
        );
        const maxDays = settingsResult.rows.length > 0
            ? Math.min(parseInt(settingsResult.rows[0].value), parseInt(days))
            : parseInt(days);

        const availableDates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < maxDays; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();

            // Verificar bloqueado
            if (blockedDates.has(dateStr)) continue;

            // Verificar si abre ese día
            const bh = businessHoursMap[dayOfWeek];
            if (!bh || !bh.is_open) continue;

            // Verificar que el servicio quepa en el día
            const openMinutes = timeToMinutes(bh.open_time);
            const closeMinutes = timeToMinutes(bh.close_time);

            if (closeMinutes - openMinutes >= serviceDuration) {
                availableDates.push({
                    date: dateStr,
                    dayOfWeek,
                    dayName: date.toLocaleDateString('es-MX', { weekday: 'long' }),
                    displayDate: date.toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short'
                    })
                });
            }
        }

        res.json({
            service_id: parseInt(service_id),
            service_duration: serviceDuration,
            total_available_days: availableDates.length,
            dates: availableDates
        });

    } catch (error) {
        next(error);
    }
});

export default router;

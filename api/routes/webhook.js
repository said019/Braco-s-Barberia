import express from 'express';
import { query } from '../config/database.js';
import whatsappService from '../services/whatsappService.js';
import googleCalendar from '../services/googleCalendarService.js';

const router = express.Router();

// POST /api/webhooks/whatsapp
router.post('/whatsapp', async (req, res) => {
    try {
        const { From, Body } = req.body;
        console.log(`[WEBHOOK] Received WhatsApp from ${From}: ${Body}`);

        // Limpiar teléfono (Twilio envía 'whatsapp:+521...')
        const phone = From ? From.replace('whatsapp:', '').replace('+', '') : '';
        const message = Body ? Body.trim() : '';

        if (message === 'Confirmar Asistencia') {
            await handleConfirmation(phone);
        } else if (message === 'Modificar / Cancelar') {
            await handleCancellationRequest(phone);
        } else {
            console.log(`[WEBHOOK] Unhandled message: ${message}`);
        }

        // Twilio espera XML o nada
        res.status(200).send('<Response></Response>');

    } catch (error) {
        console.error('[WEBHOOK] Error handling message:', error);
        res.status(500).send('Error');
    }
});

// ============================================================================
// HANDLER: CONFIRMACIÓN DE ASISTENCIA
// ============================================================================
async function handleConfirmation(phone) {
    const cleanPhone = phone.slice(-10);
    console.log(`[WEBHOOK] Attempting confirmation for phone ending in ${cleanPhone}`);

    // Buscar cita programada más próxima
    const result = await query(`
        SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.notes, a.checkout_code, a.status,
               c.name as client_name, c.phone as client_phone,
               s.name as service_name
        FROM appointments a
        JOIN clients c ON a.client_id = c.id
        JOIN services s ON a.service_id = s.id
        WHERE c.phone LIKE '%' || $1
          AND a.status = 'scheduled'
          AND a.appointment_date >= CURRENT_DATE
        ORDER BY a.appointment_date ASC, a.start_time ASC
        LIMIT 1
    `, [cleanPhone]);

    if (result.rows.length > 0) {
        const appt = result.rows[0];

        // 1. Actualizar status en BD
        await query(`UPDATE appointments SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [appt.id]);
        console.log(`[WEBHOOK] Appointment ${appt.id} confirmed via WhatsApp for ${appt.client_name}`);

        // 2. Sincronizar con Google Calendar (cambia color a verde)
        try {
            await googleCalendar.updateEvent(appt.id, {
                ...appt,
                status: 'confirmed'
            });
            console.log(`[WEBHOOK] Google Calendar updated for appointment ${appt.id}`);
        } catch (gcalError) {
            console.error(`[WEBHOOK] Google Calendar update failed:`, gcalError.message);
        }

        // 3. Enviar respuesta de confirmación usando TEMPLATE
        await whatsappService.sendConfirmationResponse(phone);
        console.log(`[WEBHOOK] Confirmation response sent to ${phone}`);

    } else {
        console.log(`[WEBHOOK] No scheduled appointment found for phone ${phone} to confirm.`);
        // Fallback a texto libre ya que no hay template para este caso
        await whatsappService.sendTextMessage(phone, "No encontramos una cita pendiente próxima para confirmar. Si tienes dudas, contáctanos.");
    }
}

// ============================================================================
// HANDLER: CANCELACIÓN / MODIFICACIÓN
// ============================================================================
async function handleCancellationRequest(phone) {
    const cleanPhone = phone.slice(-10);
    const url = process.env.PUBLIC_URL || 'https://bracos-barberia-production.up.railway.app';

    console.log(`[WEBHOOK] Cancellation/Modification request from phone ending in ${cleanPhone}`);

    // Buscar la cita más próxima
    const result = await query(`
        SELECT a.id, a.appointment_date, a.start_time,
               c.name as client_name,
               s.name as service_name
        FROM appointments a
        JOIN clients c ON a.client_id = c.id
        JOIN services s ON a.service_id = s.id
        WHERE c.phone LIKE '%' || $1
          AND a.status IN ('scheduled', 'confirmed', 'pending')
          AND a.appointment_date >= CURRENT_DATE
        ORDER BY a.appointment_date ASC, a.start_time ASC
        LIMIT 1
    `, [cleanPhone]);

    if (result.rows.length > 0) {
        const appt = result.rows[0];

        // Formatear fecha para el mensaje
        const dateFormatted = new Date(appt.appointment_date).toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long'
        });

        // 1. Cancelar la cita en BD
        await query(`UPDATE appointments SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [appt.id]);
        console.log(`[WEBHOOK] Appointment ${appt.id} cancelled via WhatsApp`);

        // 2. Actualizar en Google Calendar (no eliminar para mantener historial)
        try {
            await googleCalendar.updateEvent(appt.id, {
                ...appt,
                status: 'cancelled'
            });
            console.log(`[WEBHOOK] Google Calendar event updated to cancelled for appointment ${appt.id}`);
        } catch (gcalError) {
            console.error(`[WEBHOOK] Google Calendar update failed:`, gcalError.message);
        }

        // 3. Enviar respuesta de cancelación usando TEMPLATE
        // Template: "Hemos cancelado tu cita de {{1}} programada para el {{2}}. ¿Deseas agendar una nueva cita? Hazlo aquí: {{3}}"
        await whatsappService.sendCancellationResponse({
            phone: phone,
            service: appt.service_name,
            date: dateFormatted,
            bookingUrl: `${url}/agendar.html`
        });
        console.log(`[WEBHOOK] Cancellation response sent to ${phone}`);

    } else {
        // No hay cita pero igual enviar instrucciones
        await whatsappService.sendTextMessage(phone, `No encontramos una cita activa para cancelar. Si deseas agendar una nueva, visita: ${url}/agendar.html`);
    }

    console.log(`[WEBHOOK] Cancellation flow completed for ${phone}`);
}

export default router;

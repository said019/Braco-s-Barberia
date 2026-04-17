import express from 'express';
import { query } from '../config/database.js';
import whatsappService from '../services/whatsappService.js';
import googleCalendar from '../services/googleCalendarService.js';

const router = express.Router();

// POST /api/webhook/evolution
router.post('/', async (req, res) => {
    try {
        const { event, data } = req.body;
        console.log(`[Evolution Webhook] Evento: ${event}`);

        if (event === 'messages.upsert') {
            const message = data?.messages?.[0];
            if (!message || message.key?.fromMe) {
                return res.status(200).json({ received: true });
            }

            const rawPhone = message.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
            const phone = rawPhone.replace(/\D/g, '');

            // Detectar respuesta de Poll
            if (data?.pollUpdate?.votes) {
                const votes = data.pollUpdate.votes;
                const selectedOption = (votes[0]?.optionName || '').toLowerCase();
                console.log(`[Evolution Webhook] Poll de ${phone}: "${selectedOption}"`);

                if (selectedOption.includes('confirmar')) {
                    await handleConfirmation(phone);
                } else if (selectedOption.includes('cancelar') || selectedOption.includes('modificar')) {
                    await handleCancellationRequest(phone);
                }
                return res.status(200).json({ received: true });
            }

            // Detectar mensaje de texto plano
            const text = (
                message.message?.conversation ||
                message.message?.extendedTextMessage?.text || ''
            ).trim();

            if (text) {
                console.log(`[Evolution Webhook] Texto de ${phone}: "${text}"`);
                const lower = text.toLowerCase();
                if (lower.includes('confirmar')) {
                    await handleConfirmation(phone);
                } else if (lower.includes('cancelar') || lower.includes('modificar')) {
                    await handleCancellationRequest(phone);
                }
            }
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('[Evolution Webhook] Error:', error);
        res.status(200).json({ received: true });
    }
});

// ============================================================================
// HANDLER: CONFIRMACIÓN DE ASISTENCIA
// ============================================================================
async function handleConfirmation(phone) {
    const cleanPhone = phone.slice(-10);
    console.log(`[Evolution Webhook] Confirmando cita para teléfono: ...${cleanPhone}`);

    const result = await query(`
        SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.notes, a.checkout_code, a.status,
               c.name as client_name, c.phone as client_phone,
               s.name as service_name
        FROM appointments a
        JOIN clients c ON a.client_id = c.id
        JOIN services s ON a.service_id = s.id
        WHERE c.phone LIKE '%' || $1
          AND a.status IN ('scheduled', 'confirmed')
          AND a.appointment_date >= CURRENT_DATE
        ORDER BY a.appointment_date ASC, a.start_time ASC
        LIMIT 1
    `, [cleanPhone]);

    if (result.rows.length > 0) {
        const appt = result.rows[0];

        await query(
            `UPDATE appointments SET status = 'confirmed', reminder_sent = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [appt.id]
        );
        console.log(`[Evolution Webhook] Cita ${appt.id} confirmada por ${appt.client_name}`);

        try {
            await googleCalendar.updateEvent(appt.id, { ...appt, status: 'confirmed' });
        } catch (gcalError) {
            console.error('[Evolution Webhook] Google Calendar error:', gcalError.message);
        }

        await whatsappService.sendConfirmationResponse(phone);
    } else {
        console.log(`[Evolution Webhook] No se encontró cita para ${phone}`);
        await whatsappService.sendTextMessage(phone, 'No encontramos una cita pendiente próxima para confirmar. Si tienes dudas, contáctanos.');
    }
}

// ============================================================================
// HANDLER: CANCELACIÓN / MODIFICACIÓN
// ============================================================================
async function handleCancellationRequest(phone) {
    const cleanPhone = phone.slice(-10);
    const url = process.env.PUBLIC_URL || 'https://braco-s-barberia-production.up.railway.app';

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

        const dateFormatted = new Date(appt.appointment_date).toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long'
        });

        await query(
            `UPDATE appointments SET status = 'cancelled', reminder_sent = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [appt.id]
        );
        console.log(`[Evolution Webhook] Cita ${appt.id} cancelada vía WhatsApp`);

        try {
            await googleCalendar.updateEvent(appt.id, { ...appt, status: 'cancelled' });
        } catch (gcalError) {
            try { await googleCalendar.deleteEvent(appt.id); } catch (_) {}
        }

        await whatsappService.sendCancellationResponse({
            phone,
            service: appt.service_name,
            date: dateFormatted,
            bookingUrl: `${url}/agendar.html`
        });

        try {
            await whatsappService.sendAdminCancellation({
                clientName: appt.client_name,
                clientPhone: cleanPhone,
                serviceName: appt.service_name,
                date: dateFormatted,
                time: appt.start_time
            });
        } catch (err) {
            console.error('[Evolution Webhook] Error notificando admin:', err.message);
        }
    } else {
        await whatsappService.sendTextMessage(phone, `No encontramos una cita activa para cancelar. Si deseas agendar, visita: ${url}/agendar.html`);
    }
}

export default router;

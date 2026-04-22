import express from 'express';
import { query } from '../config/database.js';
import whatsappService from '../services/whatsappService.js';
import googleCalendar from '../services/googleCalendarService.js';

const router = express.Router();

// ============================================================================
// Normaliza texto: quita acentos, emojis, lowercase, colapsa espacios
// ============================================================================
function normalizeText(text) {
    return (text || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')     // acentos
        .replace(/[^a-z0-9\s]/g, ' ')        // emojis / símbolos
        .replace(/\s+/g, ' ')
        .trim();
}

// ============================================================================
// Extrae respuesta de poll en cualquier formato conocido de Evolution API
// ============================================================================
function extractPollAnswer(message, data) {
    // Formato A: data.pollUpdate.votes[0].optionName
    const votes = data?.pollUpdate?.votes;
    if (Array.isArray(votes) && votes.length > 0) {
        return votes[0]?.optionName || votes[0]?.name || votes[0]?.selectedOptions?.[0];
    }
    // Formato B: message.message.pollUpdateMessage.selectedOptions[0]
    const selected = message?.message?.pollUpdateMessage?.selectedOptions;
    if (Array.isArray(selected) && selected.length > 0) {
        return selected[0]?.name || selected[0];
    }
    // Formato C: message.pollUpdates[0].vote.selectedOptions
    const pollUpdates = message?.pollUpdates;
    if (Array.isArray(pollUpdates) && pollUpdates.length > 0) {
        const opts = pollUpdates[0]?.vote?.selectedOptions;
        if (Array.isArray(opts) && opts.length > 0) return opts[0];
    }
    // Formato D: messageType pollUpdateMessage en raíz
    if (data?.messageType === 'pollUpdateMessage') {
        const opt = data?.message?.pollUpdateMessage?.selectedOptions?.[0];
        if (opt) return opt?.name || opt;
    }
    return null;
}

// ============================================================================
// Extrae texto plano del mensaje
// ============================================================================
function extractText(message) {
    return (
        message?.message?.conversation ||
        message?.message?.extendedTextMessage?.text ||
        message?.message?.buttonsResponseMessage?.selectedDisplayText ||
        message?.message?.listResponseMessage?.title ||
        message?.body ||
        ''
    ).trim();
}

// ============================================================================
// POST /api/webhook/evolution
// ============================================================================
router.post('/', async (req, res) => {
    // Responder 200 de inmediato para que Evolution no hace retry
    res.status(200).json({ received: true });

    try {
        const { event, data, instance } = req.body || {};
        console.log(`[Evolution Webhook] Evento: ${event} | Instance: ${instance}`);

        if (!event || !event.startsWith('messages')) return;

        // Soportar data directo (v2) o data.messages[0] (v1)
        let message = data;
        if (Array.isArray(data?.messages) && data.messages.length > 0) {
            message = data.messages[0];
        }
        if (!message) return;

        if (message.key?.fromMe) {
            console.log('[Evolution Webhook] Ignorando mensaje propio');
            return;
        }

        const rawPhone = message.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
        const phone = rawPhone.replace(/\D/g, '');
        if (!phone) return;

        // 1) Intentar detectar poll
        const pollAnswer = extractPollAnswer(message, data);
        if (pollAnswer) {
            console.log(`[Evolution Webhook] 🗳️  Poll de ${phone}: "${pollAnswer}"`);
            await routeAction(phone, pollAnswer);
            return;
        }

        // 2) Texto plano
        const text = extractText(message);
        if (text) {
            console.log(`[Evolution Webhook] 💬 Texto de ${phone}: "${text}"`);
            await routeAction(phone, text);
        }
    } catch (error) {
        console.error('[Evolution Webhook] Error:', error);
    }
});

// ============================================================================
// ROUTER: Detecta intención del mensaje/poll y dispara el handler adecuado
// ============================================================================
async function routeAction(phone, rawText) {
    const text = normalizeText(rawText);
    console.log(`[Evolution Webhook] Normalizado: "${text}"`);

    const includesAny = (arr) => arr.some(k => text.includes(k));

    // ---- CANCELAR (checamos primero porque "no puedo" no debe ser confirmar) ----
    const cancelarKeywords = [
        'cancelar', 'cancela', 'cancelo', 'cancelacion', 'cancelada', 'cancelado',
        'anular', 'anula', 'anulo', 'anulacion',
        'no puedo', 'no podre', 'no voy', 'no ire', 'no asistire', 'no asisto',
        'no voy a poder', 'no podre ir', 'ya no voy', 'ya no puedo',
        'quiero cancelar', 'deseo cancelar', 'favor de cancelar', 'por favor cancelar'
    ];

    // ---- REAGENDAR / MODIFICAR ----
    const reagendarKeywords = [
        'reagendar', 'reagenda', 'reagendo', 'reagendacion', 'reagendame',
        'reprogramar', 'reprograma', 'reprogramo', 'reprogramacion',
        'modificar', 'modifica', 'modifico', 'modificacion',
        'cambiar', 'cambia', 'cambio', 'cambiame',
        'mover', 'mueve', 'muevo', 'muevame',
        'posponer', 'pospone', 'pospongo',
        'otra fecha', 'otra hora', 'otro dia', 'otro horario', 'nueva fecha',
        'para otro dia', 'para otra fecha'
    ];

    // ---- CONFIRMAR ----
    const confirmarKeywords = [
        'confirmar', 'confirma', 'confirmo', 'confirmacion', 'confirmada', 'confirmado',
        'ahi estare', 'ahi voy', 'ahi nos vemos', 'ahi llego',
        'todo bien', 'todo en orden', 'todo ok', 'todo listo', 'todo perfecto',
        'si voy', 'si ire', 'si asistire', 'si asisto', 'si estare', 'si confirmo',
        'asistire', 'asisto', 'voy a ir', 'ahi estoy',
        'ok', 'okay', 'vale', 'listo', 'perfecto', 'de acuerdo', 'claro',
        'dale', 'hecho', 'entendido', 'recibido', 'enterado', 'gracias'
    ];

    // "si" solo como palabra completa
    const isShortYes = /^(si|s)$/.test(text);

    if (includesAny(cancelarKeywords)) {
        await handleCancellationRequest(phone);
    } else if (includesAny(reagendarKeywords)) {
        await handleRescheduleRequest(phone);
    } else if (isShortYes || includesAny(confirmarKeywords)) {
        await handleConfirmation(phone);
    } else {
        console.log(`[Evolution Webhook] ⚠️  Opción no reconocida: "${text}"`);
        try {
            await whatsappService.sendTextMessage(
                phone,
                `No entendí tu mensaje. Por favor responde:\n\n` +
                `✅ CONFIRMAR — para confirmar tu cita\n` +
                `🔄 REAGENDAR — para cambiar fecha u hora\n` +
                `❌ CANCELAR — para cancelar tu cita`
            );
        } catch (_) {}
    }
}

// ============================================================================
// HANDLER: CONFIRMACIÓN DE ASISTENCIA
// ============================================================================
async function handleConfirmation(phone) {
    const cleanPhone = phone.slice(-10);
    console.log(`[Evolution Webhook] ✅ Confirmando cita para ...${cleanPhone}`);

    const result = await query(`
        SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.notes, a.checkout_code, a.status,
               c.name as client_name, c.phone as client_phone,
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

        await query(
            `UPDATE appointments
             SET status = 'confirmed',
                 reminder_sent = TRUE,
                 reminder_2h_sent = TRUE,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [appt.id]
        );
        console.log(`[Evolution Webhook] ✅ Cita ${appt.id} confirmada por ${appt.client_name}`);

        try {
            await googleCalendar.updateEvent(appt.id, { ...appt, status: 'confirmed' });
        } catch (gcalError) {
            console.error('[Evolution Webhook] Google Calendar error:', gcalError.message);
        }

        await whatsappService.sendConfirmationResponse(phone);
    } else {
        console.log(`[Evolution Webhook] ❌ No se encontró cita para ${phone}`);
        await whatsappService.sendTextMessage(phone, 'No encontramos una cita pendiente próxima para confirmar. Si tienes dudas, contáctanos.');
    }
}

// ============================================================================
// HANDLER: CANCELACIÓN
// ============================================================================
async function handleCancellationRequest(phone) {
    const cleanPhone = phone.slice(-10);
    const url = process.env.PUBLIC_URL || 'https://braco-s-barberia-production.up.railway.app';
    console.log(`[Evolution Webhook] ❌ Cancelando cita para ...${cleanPhone}`);

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
            `UPDATE appointments
             SET status = 'cancelled',
                 reminder_sent = TRUE,
                 reminder_2h_sent = TRUE,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [appt.id]
        );
        console.log(`[Evolution Webhook] ❌ Cita ${appt.id} cancelada vía WhatsApp`);

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

// ============================================================================
// HANDLER: REAGENDAR CITA
// ============================================================================
async function handleRescheduleRequest(phone) {
    const cleanPhone = phone.slice(-10);
    const url = process.env.PUBLIC_URL || 'https://braco-s-barberia-production.up.railway.app';
    console.log(`[Evolution Webhook] 🔄 Reagendando cita para ...${cleanPhone}`);

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
            `UPDATE appointments
             SET status = 'cancelled',
                 reminder_sent = TRUE,
                 reminder_2h_sent = TRUE,
                 notes = COALESCE(notes, '') || ' [Reagendar solicitado vía WhatsApp]',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [appt.id]
        );
        console.log(`[Evolution Webhook] 🔄 Cita ${appt.id} liberada para reagendar`);

        try {
            await googleCalendar.updateEvent(appt.id, { ...appt, status: 'cancelled' });
        } catch (_) {
            try { await googleCalendar.deleteEvent(appt.id); } catch (_) {}
        }

        await whatsappService.sendTextMessage(
            phone,
            `🔄 *Reagendar cita*

Tu cita de ${appt.service_name} del ${dateFormatted} fue liberada.

Agenda una nueva fecha aquí:
${url}/agendar.html`
        );

        try {
            await whatsappService.sendAdminModification({
                clientName: appt.client_name,
                clientPhone: cleanPhone,
                oldService: appt.service_name,
                oldDate: dateFormatted,
                oldTime: appt.start_time,
                newService: 'Pendiente',
                newDate: 'Pendiente',
                newTime: 'Pendiente'
            });
        } catch (err) {
            console.error('[Evolution Webhook] Error notificando admin (reagendar):', err.message);
        }
    } else {
        await whatsappService.sendTextMessage(phone, `No encontramos una cita para reagendar. Agenda aquí: ${url}/agendar.html`);
    }
}

export default router;

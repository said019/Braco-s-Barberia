import express from 'express';
import { query } from '../config/database.js';
import whatsappService from '../services/whatsappService.js';

const router = express.Router();

// POST /api/webhooks/whatsapp
router.post('/whatsapp', async (req, res) => {
    try {
        const { From, Body } = req.body;
        console.log(`[WEBHOOK] Received WhatsApp from ${From}: ${Body}`);

        // Limpiar teléfono (Twilio envía 'whatsapp:+521...', nuestra DB tiene '521...')
        // Asumiendo DB tiene formato limpio o formato con país.
        // Si DB tiene '5512345678', y Twilio 'whatsapp:+5215512345678'.
        // Vamos a normalizar buscando coincidencias parciales si es necesario o limpiando el prefijo.
        const phone = From.replace('whatsapp:', '').replace('+', '');

        const message = Body ? Body.trim() : '';

        if (message === 'Confirmar Asistencia') {
            await handleConfirmation(phone);
        } else if (message === 'Modificar / Cancelar') {
            await handleCancellationRequest(phone);
        } else {
            // Mensaje genérico, quizás loguear o auto-responder "Contacta al admin"
            console.log(`[WEBHOOK] Unhandled message: ${message}`);
        }

        // Twilio espera XML o nada si content-type es xml, pero json vacio funciona pa no error
        res.status(200).send('<Response></Response>');

    } catch (error) {
        console.error('[WEBHOOK] Error handling message:', error);
        res.status(500).send('Error');
    }
});

async function handleConfirmation(phone) {
    // Buscar la cita más próxima futura que esté 'scheduled' para este teléfono
    // Podría haber varias, tomamos la más cercana.
    const result = await query(`
        SELECT a.id, c.name 
        FROM appointments a
        JOIN clients c ON a.client_id = c.id
        WHERE c.phone LIKE '%' || $1
          AND a.status = 'scheduled'
          AND a.appointment_date >= CURRENT_DATE
        ORDER BY a.appointment_date ASC, a.start_time ASC
        LIMIT 1
    `, [phone.slice(-10)]); // Usamos los últimos 10 dígitos para matching seguro

    if (result.rows.length > 0) {
        const appt = result.rows[0];
        await query(`UPDATE appointments SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [appt.id]);
        console.log(`[WEBHOOK] Appointment ${appt.id} confirmed via WhatsApp for ${appt.name}`);

        // Opcional: Enviar mensaje de "Gracias por confirmar"
        // await whatsappService.sendTextMessage(phone, "¡Gracias! Tu asistencia ha sido confirmada. ✅");
    } else {
        console.log(`[WEBHOOK] No schedule appointment found for phone ${phone} to confirm.`);
    }
}

async function handleCancellationRequest(phone) {
    // Enviar mensaje automático con instrucciones
    // Como no tenemos un metodo sendText simple expuesto en whatsappService (solo templates),
    // tendriamos que tener un template para esto o usar el modo 'session' de twilio (24h window).
    // Por ahora, solo logueamos. El admin verá el mensaje en su celular si tiene la sesión abierta o en Twilio logs.
    console.log(`[WEBHOOK] Cancellation requested by ${phone}`);
}

export default router;

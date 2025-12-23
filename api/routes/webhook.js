import express from 'express';
import { query } from '../config/database.js';
import whatsappService from '../services/whatsappService.js';

const router = express.Router();

// POST /api/webhooks/whatsapp
router.post('/whatsapp', async (req, res) => {
    try {
        const { From, Body } = req.body;
        console.log(`[WEBHOOK] Received WhatsApp from ${From}: ${Body}`);

        // Limpiar teléfono (Twilio envía 'whatsapp:+521...')
        // Asumiendo DB tiene formato limpio. 
        // Si viene +521... lo dejamos como 521... (sin +)
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

async function handleConfirmation(phone) {
    // Buscar la cita más próxima futura que esté 'scheduled'
    // Usamos LIKE con los últimos 10 dígitos para ser robustos ante prefijos de país variables
    const cleanPhone = phone.slice(-10);

    console.log(`[WEBHOOK] Attempting confirmation for phone ending in ${cleanPhone}`);

    const result = await query(`
        SELECT a.id, c.name 
        FROM appointments a
        JOIN clients c ON a.client_id = c.id
        WHERE c.phone LIKE '%' || $1
          AND a.status = 'scheduled'
          AND a.appointment_date >= CURRENT_DATE
        ORDER BY a.appointment_date ASC, a.start_time ASC
        LIMIT 1
    `, [cleanPhone]);

    if (result.rows.length > 0) {
        const appt = result.rows[0];
        await query(`UPDATE appointments SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [appt.id]);
        console.log(`[WEBHOOK] Appointment ${appt.id} confirmed via WhatsApp for ${appt.name}`);

        // Confirmación interactiva
        await whatsappService.sendTextMessage(phone, "¡Gracias! Tu asistencia ha sido confirmada correctamente. ✅ Nos vemos pronto.");
    } else {
        console.log(`[WEBHOOK] No schedule appointment found for phone ${phone} to confirm.`);
        await whatsappService.sendTextMessage(phone, "No encontramos una cita pendiente próxima para confirmar.");
    }
}

async function handleCancellationRequest(phone) {
    const url = process.env.PUBLIC_URL || 'https://bracos-barberia.up.railway.app';
    await whatsappService.sendTextMessage(phone, `Entendido. Para modificar o cancelar, por favor llámanos o gestiona tu cita aquí: ${url}/agendar.html`);
    console.log(`[WEBHOOK] Cancellation instructions sent to ${phone}`);
}

export default router;

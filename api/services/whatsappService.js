import axios from 'axios';

// Evolution API Config
const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || 'bracos-barberia';
const ENABLED = process.env.WHATSAPP_ENABLED !== 'false';
const BOOKING_URL = process.env.PUBLIC_URL || 'https://braco-s-barberia-production.up.railway.app';

function formatPhone(phone) {
    if (!phone) return null;
    let cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 10) cleaned = '52' + cleaned;
    else if (cleaned.length < 10) cleaned = '52' + cleaned;
    // Quitar el 1 extra de México si viene como 521XXXXXXXXXX (13 dígitos)
    // Evolution API espera 521XXXXXXXXXX para México (12 dígitos)
    return cleaned;
}

async function sendText(to, message) {
    if (!ENABLED) {
        console.log('[Evolution] WhatsApp deshabilitado, omitiendo mensaje');
        return { success: false, error: 'Disabled' };
    }
    if (!EVOLUTION_URL || !EVOLUTION_KEY) {
        console.error('[Evolution] Faltan credenciales (EVOLUTION_API_URL / EVOLUTION_API_KEY)');
        return { success: false, error: 'Credentials missing' };
    }
    const phone = formatPhone(to);
    if (!phone) return { success: false, error: 'No phone' };

    try {
        const res = await axios.post(
            `${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
            { number: phone, text: message },
            { headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY }, timeout: 15000 }
        );
        console.log(`[Evolution] Mensaje enviado a ${to}`);
        return { success: true, id: res.data?.key?.id };
    } catch (err) {
        console.error(`[Evolution] Error enviando a ${to}:`, err.response?.data || err.message);
        return { success: false, error: err.message };
    }
}

async function sendPoll(to, question, options) {
    if (!ENABLED || !EVOLUTION_URL || !EVOLUTION_KEY) return { success: false, error: 'Not configured' };
    const phone = formatPhone(to);
    if (!phone) return { success: false, error: 'No phone' };

    try {
        const res = await axios.post(
            `${EVOLUTION_URL}/message/sendPoll/${EVOLUTION_INSTANCE}`,
            {
                number: phone,
                pollMessage: {
                    name: question,
                    selectableCount: 1,
                    values: options
                }
            },
            { headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY }, timeout: 15000 }
        );
        console.log(`[Evolution] Poll enviado a ${to}`);
        return { success: true, id: res.data?.key?.id };
    } catch (err) {
        console.error(`[Evolution] Error enviando poll a ${to}:`, err.response?.data || err.message);
        return { success: false, error: err.message };
    }
}

function getAdminPhones() {
    const str = process.env.WA_ADMIN_PHONES || process.env.TWILIO_ADMIN_PHONES || process.env.TWILIO_ADMIN_PHONE || '';
    return str.split(',').map(p => p.trim()).filter(Boolean);
}

async function sendTextToAllAdmins(message) {
    const phones = getAdminPhones();
    if (!phones.length) return { success: false, error: 'No admin phones configured' };
    const results = await Promise.all(phones.map(p => sendText(p, message)));
    return { success: results.some(r => r.success), results };
}

// ============================================================================
// 1. Confirmación de cita agendada (+ poll con opciones)
// ============================================================================
export const sendBookingConfirmation = async ({ phone, name, service, date, time, code }) => {
    const msg = `✅ *Cita confirmada en Braco's Barbería*

👤 ${name}
✂️ ${service}
📅 ${date} a las ${time}
🔑 Código: *${code || '----'}*

Te esperamos. 💈`;
    await sendText(phone, msg);
    return sendPoll(
        phone,
        `¿Necesitas hacer algún cambio?`,
        ['✅ Todo bien', '🔄 Reagendar', '❌ Cancelar']
    );
};

export const sendWhatsAppBookingConfirmation = sendBookingConfirmation;

// ============================================================================
// 2. Depósito confirmado (clientes nuevos) + poll con opciones
// ============================================================================
export const sendDepositConfirmed = async ({ phone, name, service, date, time, code }) => {
    const msg = `🎉 *¡Depósito recibido!*

Hola ${name}, confirmamos tu cita en Braco's Barbería:

✂️ ${service}
📅 ${date} a las ${time}
🔑 Código: *${code || '----'}*

¡Te esperamos! 💈`;
    await sendText(phone, msg);
    return sendPoll(
        phone,
        `¿Necesitas hacer algún cambio?`,
        ['✅ Todo bien', '🔄 Reagendar', '❌ Cancelar']
    );
};

export const sendDepositAccepted = sendDepositConfirmed;
export const sendWhatsAppDepositAccepted = sendDepositConfirmed;

// ============================================================================
// 3. Recibo estándar (sin membresía)
// ============================================================================
export const sendReceiptStandard = async ({ phone, name, service, total, date }) => {
    const msg = `🧾 *Recibo de pago - Braco's Barbería*

Gracias ${name} por tu visita.

✂️ ${service}
📅 ${date}
💰 Total: *$${total}*

¡Hasta pronto! 💈`;
    return sendText(phone, msg);
};

// ============================================================================
// 4. Recibo con membresía
// ============================================================================
export const sendReceiptMembership = async ({ phone, name, service, membershipName, remaining, cardUrl }) => {
    const msg = `🧾 *Recibo de pago - Braco's Barbería*

Gracias ${name} por tu visita.

✂️ ${service}
🎫 Membresía: ${membershipName || 'Membresía'}
🔄 Servicios restantes: *${remaining}*
${cardUrl ? `🔗 Tu tarjeta: ${cardUrl}` : ''}

¡Hasta pronto! 💈`;
    return sendText(phone, msg);
};

export const sendCheckoutReceipt = async ({ type, phone, name, service, total, date, membershipName, remaining, cardUrl }) => {
    if (type === 'membership') return sendReceiptMembership({ phone, name, service, membershipName, remaining, cardUrl });
    return sendReceiptStandard({ phone, name, service, total, date });
};

// ============================================================================
// 5. Bienvenida membresía
// ============================================================================
export const sendMembershipWelcome = async ({ phone, name, membershipName, expiryDate, cardUrl, transferable }) => {
    const msg = `🌟 *¡Membresía activada!*

Hola ${name}, tu membresía en Braco's Barbería está activa:

🎫 ${membershipName}
📅 Vigencia hasta: ${expiryDate}
🔄 Transferible: ${transferable ? 'Sí' : 'No'}
${cardUrl ? `🔗 Tu tarjeta: ${cardUrl}` : ''}

¡Gracias por ser parte de la familia Braco's! 💈`;
    return sendText(phone, msg);
};

// ============================================================================
// 6. Recordatorio 24h (con Poll para confirmar/reagendar/cancelar)
// ============================================================================
export const sendReminder24h = async ({ phone, name, service, time, code }) => {
    const intro = `📅 *Recordatorio Braco's Barbería*

Hola ${name}, recordatorio de tu cita *mañana*:
✂️ ${service}
🕐 ${time}
🔑 ${code || '----'}`;
    await sendText(phone, intro);
    return sendPoll(
        phone,
        `¿Confirmas tu asistencia?`,
        ['✅ Confirmar Asistencia', '🔄 Reagendar', '❌ Cancelar']
    );
};

// ============================================================================
// 6b. Recordatorio 2h (+ poll compacto)
// ============================================================================
export const sendReminder2h = async ({ phone, name, service, time, code }) => {
    const msg = `⏰ *Recordatorio Braco's Barbería*

Hola ${name}, tu cita es *hoy a las ${time}*.

✂️ ${service}
🔑 Código: ${code || '----'}

¡Te esperamos! 💈`;
    await sendText(phone, msg);
    return sendPoll(
        phone,
        `¿Todo en orden?`,
        ['✅ Ahí estaré', '❌ Cancelar']
    );
};

// ============================================================================
// 7. Admin: Nueva cita (cliente nuevo)
// ============================================================================
export const sendAdminNewAppointment = async ({ clientName, serviceName, date, time }) => {
    const msg = `🆕 *Nueva cita - Cliente Nuevo*

👤 ${clientName}
✂️ ${serviceName}
📅 ${date} a las ${time}

_Pendiente depósito para confirmar._`;
    return sendTextToAllAdmins(msg);
};

// ============================================================================
// 7b. Admin: Nueva cita (cliente recurrente)
// ============================================================================
export const sendAdminNewAppointmentRecurring = async ({ clientName, serviceName, date, time }) => {
    const msg = `📅 *Nueva cita - Cliente Recurrente*

👤 ${clientName}
✂️ ${serviceName}
📅 ${date} a las ${time}`;
    return sendTextToAllAdmins(msg);
};

// ============================================================================
// 8. Admin: Pago completo
// ============================================================================
export const sendAdminFullPayment = async ({ clientName, serviceName, amount, date }) => {
    const msg = `💰 *Pago completo recibido*

👤 ${clientName}
✂️ ${serviceName}
💵 Monto: $${amount}
📅 ${date}

Cita confirmada automáticamente. ✅`;
    return sendTextToAllAdmins(msg);
};

// ============================================================================
// 9. Respuesta: confirmación de asistencia
// ============================================================================
export const sendConfirmationResponse = async (phone) => {
    const msg = `✅ *¡Asistencia confirmada!*

Gracias por confirmar. Te esperamos en Braco's Barbería. 💈

Si necesitas cambiar o cancelar, escríbenos.`;
    return sendText(phone, msg);
};

// ============================================================================
// 10. Respuesta: cancelación
// ============================================================================
export const sendCancellationResponse = async ({ phone, service, date, bookingUrl }) => {
    const msg = `❌ *Cita cancelada*

Hemos cancelado tu cita de ${service} del ${date}.

¿Deseas agendar en otra fecha? Hazlo aquí:
${bookingUrl || BOOKING_URL + '/agendar.html'}`;
    return sendText(phone, msg);
};

// ============================================================================
// 11. Bienvenida con código de cliente
// ============================================================================
export const sendWelcomeWithClientCode = async ({ phone, name, clientCode }) => {
    const msg = `🎉 *¡Bienvenido a Braco's Barbería, ${name}!*

Tu código de cliente es: *${clientCode}*

Guárdalo para agendar tus próximas citas de forma rápida. 💈`;
    return sendText(phone, msg);
};

// ============================================================================
// 12. Admin: Cancelación
// ============================================================================
export const sendAdminCancellation = async ({ clientName, clientPhone, serviceName, date, time }) => {
    const msg = `❌ *Cita cancelada*

👤 ${clientName}
📱 ${clientPhone || 'No disponible'}
✂️ ${serviceName}
📅 ${date} • 🕐 ${time}

El cliente canceló desde WhatsApp.`;
    return sendTextToAllAdmins(msg);
};

// ============================================================================
// 13. Cliente recurrente (ascenso de nivel)
// ============================================================================
export const sendRecurringClientWelcome = async ({ phone, name, clientCode }) => {
    const msg = `⭐ *¡Eres cliente recurrente en Braco's Barbería!*

Hola ${name}, gracias por tu lealtad.

Tu código de cliente: *${clientCode}*

Úsalo para agendar rápidamente. ¡Nos vemos pronto! 💈`;
    return sendText(phone, msg);
};

// ============================================================================
// 14. Políticas
// ============================================================================
export const sendPolicies = async (phone) => {
    const msg = `📋 *Políticas de Braco's Barbería*

• Si no puedes asistir, cancela con mínimo 2 horas de anticipación.
• Después de 10 min de retraso, se libera tu horario.
• El depósito no es reembolsable si cancelas el mismo día.

¡Gracias por tu comprensión! 💈`;
    return sendText(phone, msg);
};

export const sendAdminPolicies = async () => sendTextToAllAdmins('📋 Recordatorio: Políticas enviadas al cliente.');

// ============================================================================
// 15. Cancelación por depósito no recibido (auto-cancel 1h)
// ============================================================================
export const sendDepositCancellation = async ({ phone, name, date, bookingUrl }) => {
    const msg = `⏰ *Cita cancelada automáticamente*

Hola ${name}, tu reserva del ${date} fue cancelada porque no recibimos el depósito en el tiempo establecido.

¿Deseas reagendar? Hazlo aquí:
${bookingUrl || BOOKING_URL + '/agendar.html'}`;
    return sendText(phone, msg);
};

// ============================================================================
// 17. Confirmación de cancelación por el cliente
// ============================================================================
export const sendClientCancellationConfirmation = async ({ phone, service, date }) => {
    return sendCancellationResponse({ phone, service, date, bookingUrl: `${BOOKING_URL}/agendar.html` });
};

// ============================================================================
// 18. Confirmación de modificación
// ============================================================================
export const sendModificationConfirmation = async ({ phone, name, service, date, time, code }) => {
    return sendBookingConfirmation({ phone, name, service, date, time, code });
};

// ============================================================================
// 19. Admin: Modificación de cita
// ============================================================================
export const sendAdminModification = async ({ clientName, clientPhone, oldService, oldDate, oldTime, newService, newDate, newTime }) => {
    const msg = `✏️ *Cita Modificada por Cliente*

👤 ${clientName} (${clientPhone || 'N/D'})

❌ Anterior: ${oldDate} ${oldTime} - ${oldService}
✅ Nueva: ${newDate} ${newTime} - ${newService}`;
    return sendTextToAllAdmins(msg);
};

// ============================================================================
// Mensaje de texto libre (compatibilidad)
// ============================================================================
export const sendTextMessage = async (phone, message) => sendText(phone, message);

export default {
    sendBookingConfirmation,
    sendWhatsAppBookingConfirmation,
    sendDepositConfirmed,
    sendDepositAccepted,
    sendWhatsAppDepositAccepted,
    sendReceiptStandard,
    sendReceiptMembership,
    sendCheckoutReceipt,
    sendMembershipWelcome,
    sendReminder24h,
    sendReminder2h,
    sendAdminNewAppointment,
    sendAdminNewAppointmentRecurring,
    sendAdminFullPayment,
    sendAdminCancellation,
    sendAdminModification,
    sendRecurringClientWelcome,
    sendConfirmationResponse,
    sendCancellationResponse,
    sendClientCancellationConfirmation,
    sendModificationConfirmation,
    sendWelcomeWithClientCode,
    sendTextMessage,
    sendPolicies,
    sendAdminPolicies,
    sendDepositCancellation
};

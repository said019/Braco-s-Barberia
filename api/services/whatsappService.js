import twilio from 'twilio';

// Config
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER; // Usually 'whatsapp:+52...'
const ENABLED = process.env.WHATSAPP_ENABLED === 'true';

const client = (ACCOUNT_SID && AUTH_TOKEN) ? twilio(ACCOUNT_SID, AUTH_TOKEN) : null;

/**
 * Helper to send Twilio Template
 */
const sendTemplate = async (to, contentSid, variables = {}) => {
    if (!ENABLED) {
        console.log('[Twilio] Service disabled, skipping message');
        return { success: false, error: 'Disabled' };
    }

    if (!client) {
        console.error('[Twilio] Credentials missing');
        return { success: false, error: 'Credentials missing' };
    }

    if (!to) return { success: false, error: 'No phone' };

    // Format phone: ensure whatsapp:+52...
    let phone = to.replace(/\D/g, '');
    if (!phone.startsWith('52')) phone = '52' + phone;
    const toWhatsapp = `whatsapp:+${phone}`;

    try {
        const msg = await client.messages.create({
            from: FROM_NUMBER,
            to: toWhatsapp,
            contentSid: contentSid,
            contentVariables: JSON.stringify(variables)
        });
        console.log(`[Twilio] Sent ${contentSid} to ${to}: ${msg.sid}`);
        return { success: true, id: msg.sid };
    } catch (error) {
        console.error(`[Twilio] Error sending to ${to}:`, error.message);
        return { success: false, error: error.message };
    }
};

// ============================================================================
// 1. Cita Agendada (Confirmación inicial)
// Template: cita_agendada3 - Variables: {{1}} Name, {{2}} Service, {{3}} Date, {{4}} Time, {{5}} Code
// ============================================================================
export const sendBookingConfirmation = async ({ phone, name, service, date, time, code }) => {
    const variables = {
        "1": name,
        "2": service,
        "3": date,
        "4": time,
        "5": code || '----'
    };
    const sid = process.env.TWILIO_TEMPLATE_BOOKING_SID;
    if (!sid) return { success: false, error: 'Booking Template SID missing' };
    return await sendTemplate(phone, sid, variables);
};

// Alias para compatibilidad
export const sendWhatsAppBookingConfirmation = sendBookingConfirmation;

// ============================================================================
// 2. Depósito Confirmado (Para clientes nuevos)
// Template: deposito_confirmado - Variables: {{1}} Name, {{2}} Service, {{3}} Date, {{4}} Time, {{5}} Code
// ============================================================================
export const sendDepositConfirmed = async ({ phone, name, service, date, time, code }) => {
    const variables = {
        "1": name,
        "2": service,
        "3": date,
        "4": time,
        "5": code || '----'
    };
    const sid = process.env.TWILIO_TEMPLATE_DEPOSIT_SID;
    if (!sid) return { success: false, error: 'Deposit Template SID missing' };
    return await sendTemplate(phone, sid, variables);
};

// Alias para compatibilidad
export const sendDepositAccepted = sendDepositConfirmed;

// ============================================================================
// 3. Recibo Estándar (Checkout sin membresía)
// Template: stnd_checkout - Variables: {{1}} Name, {{2}} Service, {{3}} Total, {{4}} Date
// ============================================================================
export const sendReceiptStandard = async ({ phone, name, service, total, date }) => {
    const variables = {
        "1": name,
        "2": service,
        "3": total,
        "4": date
    };
    const sid = process.env.TWILIO_TEMPLATE_RECEIPT_STD_SID;
    if (!sid) return { success: false, error: 'Receipt STD Template SID missing' };
    return await sendTemplate(phone, sid, variables);
};

// ============================================================================
// 4. Recibo Membresía (Checkout con membresía)
// Template: membresia_checkout2 - Variables: {{1}} Name, {{2}} Service, {{3}} Membership, {{4}} Remaining, {{5}} CardURL
// ============================================================================
export const sendReceiptMembership = async ({ phone, name, service, membershipName, remaining, cardUrl }) => {
    const variables = {
        "1": name,
        "2": service,
        "3": membershipName || 'Membresía',
        "4": String(remaining),
        "5": cardUrl || ''
    };
    const sid = process.env.TWILIO_TEMPLATE_RECEIPT_MEM_SID;
    if (!sid) return { success: false, error: 'Receipt MEM Template SID missing' };
    return await sendTemplate(phone, sid, variables);
};

// Función combinada para compatibilidad
export const sendCheckoutReceipt = async ({ type, phone, name, service, total, date, membershipName, remaining, cardUrl }) => {
    if (type === 'membership') {
        return await sendReceiptMembership({ phone, name, service, membershipName, remaining, cardUrl });
    } else {
        return await sendReceiptStandard({ phone, name, service, total, date });
    }
};

// ============================================================================
// 5. Bienvenida Membresía
// Template: membresia_activa - Variables: {{1}} Name, {{2}} Membership, {{3}} Expiry, {{4}} CardURL, {{5}} Transferible
// ============================================================================
export const sendMembershipWelcome = async ({ phone, name, membershipName, expiryDate, cardUrl, transferable }) => {
    const variables = {
        "1": name,
        "2": membershipName,
        "3": expiryDate,
        "4": cardUrl || '',
        "5": transferable ? 'Sí' : 'No'
    };
    const sid = process.env.TWILIO_TEMPLATE_MEMBERSHIP_SID;
    if (!sid) return { success: false, error: 'Membership Template SID missing' };
    return await sendTemplate(phone, sid, variables);
};

// ============================================================================
// 6. Recordatorio 24h (Con Botones)
// Template: copy_recordatorio_24hr - Variables: {{1}} Name, {{2}} Service, {{3}} Time, {{4}} Code
// ============================================================================
export const sendReminder24h = async ({ phone, name, service, time, code }) => {
    const variables = {
        "1": name,
        "2": service,
        "3": time,
        "4": code || '----'
    };
    const sid = process.env.TWILIO_TEMPLATE_REMINDER_SID;
    if (!sid) return { success: false, error: 'Reminder Template SID missing' };
    return await sendTemplate(phone, sid, variables);
};

// ============================================================================
// 6b. Recordatorio 2h antes de la cita
// Template: recordatorio_2h - Variables: {{1}} Name, {{2}} Service, {{3}} Time, {{4}} Code
// ============================================================================
export const sendReminder2h = async ({ phone, name, service, time, code }) => {
    const variables = {
        "1": name,
        "2": service,
        "3": time,
        "4": code || '----'
    };
    const sid = process.env.TWILIO_TEMPLATE_REMINDER_2H_SID || 'HX6ec4206e7a24fbc8b4a6ad2adf64addf';
    return await sendTemplate(phone, sid, variables);
};

// ============================================================================
// 7. Admin: Nueva Cita (Notificación al dueño)
// Template: admin_nva_cita - Variables: {{1}} Client, {{2}} Service, {{3}} Date, {{4}} Time
// ============================================================================
export const sendAdminNewAppointment = async ({ clientName, serviceName, date, time }) => {
    const variables = {
        "1": clientName,
        "2": serviceName,
        "3": date,
        "4": time
    };
    const sid = process.env.TWILIO_TEMPLATE_ADMIN_APPT_SID;
    const adminPhone = process.env.TWILIO_ADMIN_PHONE;

    if (!sid) return { success: false, error: 'Admin Appt Template SID missing' };
    if (!adminPhone) return { success: false, error: 'Admin Phone missing' };

    return await sendTemplate(adminPhone, sid, variables);
};

// ============================================================================
// 8. Admin: Pago Completo (Notificación al dueño)
// Template: pago_completo - Variables: {{1}} Client, {{2}} Service, {{3}} Amount, {{4}} Date
// ============================================================================
export const sendAdminFullPayment = async ({ clientName, serviceName, amount, date }) => {
    const variables = {
        "1": clientName,
        "2": serviceName,
        "3": amount,
        "4": date
    };
    const sid = process.env.TWILIO_TEMPLATE_ADMIN_PAY_SID;
    const adminPhone = process.env.TWILIO_ADMIN_PHONE;

    if (!sid) return { success: false, error: 'Admin Pay Template SID missing' };
    if (!adminPhone) return { success: false, error: 'Admin Phone missing' };

    return await sendTemplate(adminPhone, sid, variables);
};

// ============================================================================
// 9. Respuesta: Confirmación (Cuando cliente confirma asistencia)
// Template: confirmacion - Sin variables (mensaje fijo)
// ============================================================================
export const sendConfirmationResponse = async (phone) => {
    const sid = process.env.TWILIO_TEMPLATE_CONFIRM_RESP_SID;
    if (!sid) return { success: false, error: 'Confirm Response Template SID missing' };
    return await sendTemplate(phone, sid, {});
};

// ============================================================================
// 10. Respuesta: Cancelación (Cuando cliente cancela/modifica)
// Template: copy_cancelacion - Variables: {{1}} Service, {{2}} Date, {{3}} BookingURL
// ============================================================================
export const sendCancellationResponse = async ({ phone, service, date, bookingUrl }) => {
    const variables = {
        "1": service,
        "2": date,
        "3": bookingUrl
    };
    const sid = process.env.TWILIO_TEMPLATE_CANCEL_RESP_SID;
    if (!sid) return { success: false, error: 'Cancel Response Template SID missing' };
    return await sendTemplate(phone, sid, variables);
};

// ============================================================================
// 11. Bienvenida Cliente Nuevo (ID de 4 dígitos)
// Mensaje de texto libre con el código de cliente para login futuro
// ============================================================================
export const sendWelcomeWithClientCode = async ({ phone, name, clientCode }) => {
    const message = `🎉 *¡Bienvenido a Braco's Barbería, ${name}!*

Tu código de cliente es: *${clientCode}*

Guárdalo para agendar tus próximas citas de forma rápida. Solo ingresa este código y te reconoceremos al instante.

¡Nos vemos pronto! 💈`;

    return await sendTextMessage(phone, message);
};

// ============================================================================
// 12. Admin: Cancelación de Cita (Notificación al dueño)
// Template: admin_cancelacion - Variables: {{1}} Client, {{2}} Phone, {{3}} Service, {{4}} Date, {{5}} Time
// ============================================================================
export const sendAdminCancellation = async ({ clientName, clientPhone, serviceName, date, time }) => {
    const variables = {
        "1": clientName,
        "2": clientPhone || 'No disponible',
        "3": serviceName,
        "4": date,
        "5": time
    };
    const sid = process.env.TWILIO_TEMPLATE_ADMIN_CANCEL_SID;
    const adminPhone = process.env.TWILIO_ADMIN_PHONE;

    if (!sid) return { success: false, error: 'Admin Cancel Template SID missing' };
    if (!adminPhone) return { success: false, error: 'Admin Phone missing' };

    return await sendTemplate(adminPhone, sid, variables);
};

// ============================================================================
// 13. Cliente Recurrente (Cuando se promueve de Nuevo a Recurrente)
// Template: copy_recurrente - Variables: {{1}} Name, {{2}} ClientCode
// ============================================================================
export const sendRecurringClientWelcome = async ({ phone, name, clientCode }) => {
    const variables = {
        "1": name,
        "2": clientCode
    };
    const sid = process.env.TWILIO_TEMPLATE_RECURRING_SID;
    if (!sid) return { success: false, error: 'Recurring Template SID missing' };
    return await sendTemplate(phone, sid, variables);
};

// ============================================================================
// 14. Políticas de Cita (Se envía después de cada confirmación)
// Template: copy_politicas - Sin variables (mensaje fijo)
// ============================================================================
export const sendPolicies = async (phone) => {
    const sid = process.env.TWILIO_TEMPLATE_POLICIES_SID || 'HX8c65f1d6db173c8fcd816915228461d6';
    return await sendTemplate(phone, sid, {});
};

// Enviar también al admin
export const sendAdminPolicies = async () => {
    const adminPhone = process.env.TWILIO_ADMIN_PHONE;
    if (!adminPhone) return { success: false, error: 'Admin Phone missing' };
    const sid = process.env.TWILIO_TEMPLATE_POLICIES_SID || 'HX8c65f1d6db173c8fcd816915228461d6';
    return await sendTemplate(adminPhone, sid, {});
};

// ============================================================================
// Texto Libre (Solo funciona dentro de ventana de 24h)
// ============================================================================
export const sendTextMessage = async (phone, message) => {
    try {
        if (!process.env.TWILIO_ACCOUNT_SID) return { success: false, error: 'Twilio not configured' };

        let to = phone;
        if (!to.startsWith('whatsapp:')) {
            let clean = to.replace(/\D/g, '');
            if (!clean.startsWith('52')) clean = '52' + clean;
            to = `whatsapp:+${clean}`;
        }

        const msg = await client.messages.create({
            body: message,
            from: FROM_NUMBER,
            to: to
        });

        return { success: true, sid: msg.sid };
    } catch (error) {
        console.error('Twilio SendText Error:', error);
        return { success: false, error: error.message };
    }
};

// Alias para compatibilidad
export const sendWhatsAppDepositAccepted = sendDepositConfirmed;

// Default export for backward compatibility
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
    sendAdminFullPayment,
    sendAdminCancellation,
    sendRecurringClientWelcome,
    sendConfirmationResponse,
    sendCancellationResponse,
    sendWelcomeWithClientCode,
    sendTextMessage,
    sendPolicies,
    sendAdminPolicies
};

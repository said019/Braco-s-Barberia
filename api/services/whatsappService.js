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
const sendTemplate = async (to, contentSid, variables) => {
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
    const toWhatsapp = `whatsapp:${phone}`;

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

// 1. Cita Agendada
export const sendBookingConfirmation = async ({ phone, name, service, date, time }) => {
    // Variables: {"1": "Juan", "2": "Corte", "3": "20 Dic", "4": "10:00"}
    const variables = {
        "1": name,
        "2": service,
        "3": date,
        "4": time
    };
    const sid = process.env.TWILIO_TEMPLATE_BOOKING_SID;
    if (!sid) return { success: false, error: 'Booking Template SID missing' };

    return await sendTemplate(phone, sid, variables);
};

// 2. Depósito Aceptado
export const sendDepositAccepted = async ({ phone, name, service, date, time, code }) => {
    // Variables: 1=Name, 2=Service, 3=Date, 4=Time, 5=Code
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

// 3. Recibo de Pago (Checkout)
export const sendCheckoutReceipt = async ({ phone, name, service, total, date }) => {
    // Variables: 1=Name, 2=Service, 3=Total, 4=Date
    const variables = {
        "1": name,
        "2": service,
        "3": total,
        "4": date
    };
    const sid = process.env.TWILIO_TEMPLATE_RECEIPT_SID;
    if (!sid) return { success: false, error: 'Receipt Template SID missing' };

    return await sendTemplate(phone, sid, variables);
};

// 4. Bienvenida Membresía
// 4. Bienvenida Membresía
export const sendMembershipWelcome = async ({ phone, name, membershipName, expiryDate, cardUrl }) => {
    // Variables: 1=Name, 2=Membership, 3=Expiry, 4=CardURL
    const variables = {
        "1": name,
        "2": membershipName,
        "3": expiryDate,
        "4": cardUrl || ''
    };
    const sid = process.env.TWILIO_TEMPLATE_MEMBERSHIP_SID;
    if (!sid) return { success: false, error: 'Membership Template SID missing' };

    return await sendTemplate(phone, sid, variables);
};

// 5. Recordatorio 24h (Con Botones)
export const sendReminder24h = async ({ phone, name, service, time, code }) => {
    // Variables: 1=Name, 2=Service, 3=Time, 4=Code
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

// Enviar mensaje de texto libre (Solo funciona dentro de la ventana de 24h de sesión iniciada por el usuario)
export const sendTextMessage = async (phone, message) => {
    try {
        // Re-importar o usar client global
        // Asumimos client definido arriba.
        if (!process.env.TWILIO_ACCOUNT_SID) return { success: false, error: 'Twilio not configured' };

        let to = phone;
        if (!to.startsWith('whatsapp:')) {
            // Remove any non-digit chars
            let clean = to.replace(/\D/g, '');
            if (!clean.startsWith('52')) clean = '52' + clean;
            to = `whatsapp:${clean}`;
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

// Default export for backward compatibility if needed, but named exports are preferred
export default {
    sendBookingConfirmation,
    sendDepositAccepted,
    sendCheckoutReceipt,
    sendMembershipWelcome,
    sendReminder24h,
    sendTextMessage
};

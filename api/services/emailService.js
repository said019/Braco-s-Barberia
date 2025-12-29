import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// From email address (must be from verified domain)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Braco\'s Barbería <no-reply@bracosbarberia.com>';

/**
 * Load and populate an email template
 */
function loadTemplate(templateName, variables) {
    const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);

    try {
        let html = fs.readFileSync(templatePath, 'utf8');

        // Replace variables {{variable}}
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(regex, value || '');
        }

        return html;
    } catch (error) {
        console.error(`Error loading template ${templateName}:`, error);
        return null;
    }
}

/**
 * Send booking confirmation email
 */
export async function sendBookingConfirmation(data) {
    const { email, name, service, date, time, code } = data;

    if (!email) return { success: false, error: 'No email provided' };

    const html = loadTemplate('booking-confirmation', {
        clientName: name,
        serviceName: service,
        appointmentDate: date,
        appointmentTime: time,
        checkoutCode: code || '----',
        year: new Date().getFullYear()
    });

    if (!html) return { success: false, error: 'Template not found' };

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `✅ Cita Agendada - ${service}`,
            html
        });

        console.log('Booking confirmation email sent:', result);
        return { success: true, id: result.id };
    } catch (error) {
        console.error('Error sending booking confirmation:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send deposit accepted email
 */
export async function sendDepositAccepted(data) {
    const { email, name, service, date, time, code } = data;

    if (!email) return { success: false, error: 'No email provided' };

    const html = loadTemplate('deposit-accepted', {
        clientName: name,
        serviceName: service,
        appointmentDate: date,
        appointmentTime: time,
        checkoutCode: code,
        year: new Date().getFullYear()
    });

    if (!html) return { success: false, error: 'Template not found' };

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `🎉 ¡Tu Cita está Confirmada! - Braco's`,
            html
        });

        console.log('Deposit accepted email sent:', result);
        return { success: true, id: result.id };
    } catch (error) {
        console.error('Error sending deposit accepted email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send membership welcome email
 */
export async function sendMembershipWelcome(data) {
    const { email, name, membershipName, totalServices, expirationDate, cardUrl, isBlackCard } = data;

    if (!email) return { success: false, error: 'No email provided' };

    const templateName = isBlackCard ? 'membership-welcome-black' : 'membership-welcome';

    const html = loadTemplate(templateName, {
        clientName: name,
        membershipName,
        totalServices,
        expirationDate, // Ya viene con texto "Hasta..." o "Sin vencimiento"
        cardUrl,
        year: new Date().getFullYear()
    });

    if (!html) return { success: false, error: 'Template not found' };

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `👑 ¡Bienvenido a ${membershipName}! - Braco's`,
            html
        });

        console.log('Membership welcome email sent:', result);
        return { success: true, id: result.id };
    } catch (error) {
        console.error('Error sending membership welcome email:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send checkout receipt email
 */
export async function sendCheckoutReceipt(data) {
    const { email, name, service, total, paymentMethod, date } = data;

    if (!email) return { success: false, error: 'No email provided' };

    const html = loadTemplate('checkout-receipt', {
        clientName: name,
        serviceName: service,
        total,
        paymentMethod,
        checkoutDate: date,
        year: new Date().getFullYear()
    });

    if (!html) return { success: false, error: 'Template not found' };

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `🧾 Recibo de Pago - Braco's Barbería`,
            html
        });

        console.log('Checkout receipt email sent:', result);
        return { success: true, id: result.id };
    } catch (error) {
        console.error('Error sending checkout receipt:', error);
        return { success: false, error: error.message };
    }
}
/**
 * Send password reset email to admin
 */
export async function sendPasswordReset(data) {
    const { email, name, resetUrl } = data;

    if (!email) return { success: false, error: 'No email provided' };

    const html = loadTemplate('password-reset', {
        adminName: name || 'Administrador',
        resetUrl,
        year: new Date().getFullYear()
    });

    if (!html) return { success: false, error: 'Template not found' };

    try {
        const result = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject: `🔐 Restablecer Contraseña - Braco's Admin`,
            html
        });

        console.log('Password reset email sent:', result);
        return { success: true, id: result.id };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error: error.message };
    }
}

export default {
    sendBookingConfirmation,
    sendDepositAccepted,
    sendMembershipWelcome,
    sendCheckoutReceipt,
    sendPasswordReset
};

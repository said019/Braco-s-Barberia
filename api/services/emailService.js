import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Gmail SMTP transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

// From email configuration
const FROM_NAME = process.env.GMAIL_FROM_NAME || "Braco's Barberia";
const FROM_EMAIL = process.env.GMAIL_USER;

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
 * Send email using Gmail SMTP
 */
async function sendEmail(to, subject, html) {
    try {
        const result = await transporter.sendMail({
            from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
            to,
            subject,
            html
        });

        console.log('Email sent successfully:', result.messageId);
        return { success: true, id: result.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
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

    return sendEmail(email, `✅ Cita Agendada - ${service}`, html);
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

    return sendEmail(email, `🎉 ¡Tu Cita está Confirmada! - Braco's`, html);
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

    return sendEmail(email, `👑 ¡Bienvenido a ${membershipName}! - Braco's`, html);
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

    return sendEmail(email, `🧾 Recibo de Pago - Braco's Barbería`, html);
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

    return sendEmail(email, `🔐 Restablecer Contraseña - Braco's Admin`, html);
}

/**
 * Send client welcome email (when promoted to Recurrente)
 */
export async function sendClientWelcome(data) {
    const { to, clientName, clientCode } = data;

    if (!to) return { success: false, error: 'No email provided' };

    const html = loadTemplate('client-welcome', {
        clientName: clientName,
        clientCode: clientCode,
        year: new Date().getFullYear()
    });

    if (!html) return { success: false, error: 'Template not found' };

    return sendEmail(to, `🎉 ¡Bienvenido a la Familia Braco's! - Tu Código de Cliente`, html);
}

/**
 * Verify SMTP connection
 */
export async function verifyConnection() {
    try {
        await transporter.verify();
        console.log('✅ Gmail SMTP connection verified');
        return { success: true };
    } catch (error) {
        console.error('❌ Gmail SMTP connection failed:', error);
        return { success: false, error: error.message };
    }
}

export default {
    sendBookingConfirmation,
    sendDepositAccepted,
    sendMembershipWelcome,
    sendCheckoutReceipt,
    sendPasswordReset,
    sendClientWelcome,
    verifyConnection
};

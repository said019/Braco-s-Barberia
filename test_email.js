/**
 * Script para probar envío de email
 */
import dotenv from 'dotenv';
dotenv.config({ path: './api/.env' });

import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;
const FROM_NAME = process.env.GMAIL_FROM_NAME || "Braco's Barberia";

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📧 Prueba de Email');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('GMAIL_USER:', GMAIL_USER);
console.log('GMAIL_APP_PASSWORD:', GMAIL_PASS ? '✓ Configurado' : '✗ NO');

if (!GMAIL_USER || !GMAIL_PASS) {
    console.error('\n❌ Credenciales de Gmail no configuradas');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS
    }
});

const testEmail = 'pspsaid019@gmail.com';

console.log('\nEnviando a:', testEmail);

try {
    const result = await transporter.sendMail({
        from: `"${FROM_NAME}" <${GMAIL_USER}>`,
        to: testEmail,
        subject: '✅ Prueba de Email - Braco\'s Barbería',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #c9a227;">🎉 Email de Prueba</h1>
                <p>¡Hola!</p>
                <p>Este es un email de prueba para verificar que el sistema de notificaciones está funcionando correctamente.</p>
                <hr style="border: 1px solid #eee; margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Braco's Barbería & Peluquería</p>
            </div>
        `
    });

    console.log('\n✅ Email enviado!');
    console.log('Message ID:', result.messageId);
} catch (error) {
    console.error('\n❌ Error:', error.message);
}

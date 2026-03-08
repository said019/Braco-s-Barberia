/**
 * Script directo para probar recordatorio 2h
 */
import dotenv from 'dotenv';
dotenv.config({ path: './api/.env' });

import twilio from 'twilio';

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📤 Prueba de Recordatorio 2H');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('ACCOUNT_SID:', ACCOUNT_SID ? ACCOUNT_SID.substring(0, 10) + '...' : 'NO');
console.log('FROM_NUMBER:', FROM_NUMBER);

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

// Template copy_recordatorio_2h
const contentSid = 'HX854b0314373d0a8cf759d435e23014f0';
const toPhone = 'whatsapp:+524272757136';

const variables = {
    "1": "Said Romero",      // Nombre
    "2": "DÚO (Prueba)",     // Servicio
    "3": "15:30",            // Hora
    "4": "9999"              // Código
};

console.log('\nEnviando a:', toPhone);
console.log('Template:', contentSid);
console.log('Variables:', JSON.stringify(variables, null, 2));

try {
    const msg = await client.messages.create({
        from: FROM_NUMBER,
        to: toPhone,
        contentSid: contentSid,
        contentVariables: JSON.stringify(variables)
    });

    console.log('\n✅ Mensaje enviado!');
    console.log('SID:', msg.sid);
    console.log('Status:', msg.status);
} catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) console.error('Code:', error.code);
}

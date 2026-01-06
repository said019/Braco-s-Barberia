/**
 * Script para enviar WhatsApp manual a Said Romero
 * Ejecutar con: node scripts/send_whatsapp_said.js
 * 
 * Requiere las variables de entorno de Twilio configuradas
 */
import dotenv from 'dotenv';
dotenv.config();

import whatsappService from '../api/services/whatsappService.js';

const SAID_PHONE = '4272757136';
const SAID_NAME = 'Said Romero';

async function sendWhatsAppToSaid() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Enviando WhatsApp a Said Romero');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Verificar configuración
    console.log('\n📋 Configuración de Twilio:');
    console.log('  WHATSAPP_ENABLED:', process.env.WHATSAPP_ENABLED || 'NO CONFIGURADO');
    console.log('  TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✓ Configurado' : '✗ NO CONFIGURADO');
    console.log('  TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✓ Configurado' : '✗ NO CONFIGURADO');
    console.log('  TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || 'NO CONFIGURADO');
    console.log('  TWILIO_TEMPLATE_BOOKING_SID:', process.env.TWILIO_TEMPLATE_BOOKING_SID || 'NO CONFIGURADO');

    if (process.env.WHATSAPP_ENABLED !== 'true') {
        console.log('\n⚠️  WHATSAPP_ENABLED no está en "true". El mensaje no se enviará.');
        console.log('    Configura WHATSAPP_ENABLED=true en tu archivo .env o en Railway.');
        return;
    }

    if (!process.env.TWILIO_TEMPLATE_BOOKING_SID) {
        console.log('\n⚠️  TWILIO_TEMPLATE_BOOKING_SID no está configurado.');
        console.log('    Necesitas el SID del template de confirmación de cita de Twilio.');
        return;
    }

    console.log('\n📱 Enviando mensaje a Said...');
    console.log('  Teléfono:', SAID_PHONE);
    console.log('  Nombre:', SAID_NAME);

    try {
        const result = await whatsappService.sendWhatsAppBookingConfirmation({
            phone: SAID_PHONE,
            name: SAID_NAME,
            service: 'Tu cita agendada',
            date: 'Fecha de tu cita',
            time: 'Hora de tu cita',
            code: '----'
        });

        console.log('\n📊 Resultado:');
        if (result.success) {
            console.log('  ✅ ÉXITO - Mensaje enviado');
            console.log('  SID:', result.id);
        } else {
            console.log('  ❌ FALLÓ - Mensaje no enviado');
            console.log('  Error:', result.error);
        }
    } catch (error) {
        console.error('\n❌ Error al enviar:', error.message);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

sendWhatsAppToSaid();

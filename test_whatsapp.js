import dotenv from 'dotenv';
import whatsappService from './api/services/whatsappService.js';

dotenv.config();

async function testWhatsApp() {
    console.log('🧪 Testing WhatsApp Service with Ultramsg...\n');

    // ⚠️ REEMPLAZA CON TU NÚMERO DE PRUEBA
    const testPhone = '+525512345678'; // CAMBIAR POR TU NÚMERO REAL

    console.log('📋 Configuration:');
    console.log('  Provider:', process.env.WHATSAPP_PROVIDER);
    console.log('  Enabled:', process.env.WHATSAPP_ENABLED);
    console.log('  Instance ID:', process.env.ULTRAMSG_INSTANCE_ID ? '✓ Set' : '✗ Not set');
    console.log('  Token:', process.env.ULTRAMSG_TOKEN ? '✓ Set' : '✗ Not set');
    console.log('');

    // Test 1: Booking Confirmation
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Test 1: Booking Confirmation');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const result1 = await whatsappService.sendWhatsAppBookingConfirmation({
        phone: testPhone,
        name: 'Cristopher',
        service: 'Corte + Barba',
        date: 'viernes, 20 de diciembre de 2025',
        time: '10:00 AM',
        code: 'TEST'
    });
    console.log('Result:', result1);
    console.log('');

    // Esperar 3 segundos entre mensajes
    console.log('⏳ Esperando 3 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 2: Deposit Accepted
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📤 Test 2: Deposit Accepted');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const result2 = await whatsappService.sendWhatsAppDepositAccepted({
        phone: testPhone,
        name: 'Cristopher',
        service: 'Corte Premium',
        date: 'sábado, 21 de diciembre de 2025',
        time: '11:30 AM',
        code: 'ABC1'
    });
    console.log('Result:', result2);
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Testing Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Check your WhatsApp to verify messages were received.');
}

testWhatsApp().catch(console.error);

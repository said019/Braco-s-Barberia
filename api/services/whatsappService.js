import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const PROVIDER = process.env.WHATSAPP_PROVIDER || 'ultramsg';
const ENABLED = process.env.WHATSAPP_ENABLED === 'true';
const BUSINESS_ADDRESS = process.env.BUSINESS_ADDRESS || 'Braco\'s Barbería';

/**
 * Cargar plantilla de mensaje
 * @param {string} templateName - Nombre del template (sin extensión)
 * @param {object} variables - Variables a reemplazar
 * @returns {string} Mensaje con variables reemplazadas
 */
function loadTemplate(templateName, variables) {
    const templatePath = path.join(__dirname, '../templates/whatsapp', `${templateName}.txt`);

    try {
        let message = fs.readFileSync(templatePath, 'utf8');

        // Reemplazar variables {variable}
        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{${key}}`, 'g');
            message = message.replace(regex, value || '');
        }

        return message.trim();
    } catch (error) {
        console.error(`Error loading WhatsApp template ${templateName}:`, error);
        return null;
    }
}

/**
 * Enviar mensaje por Ultramsg
 */
async function sendViaUltramsg(to, message) {
    const instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    const token = process.env.ULTRAMSG_TOKEN;

    if (!instanceId || !token) {
        throw new Error('Ultramsg credentials not configured. Please set ULTRAMSG_INSTANCE_ID and ULTRAMSG_TOKEN in .env');
    }

    // Formatear número (solo dígitos, con código de país)
    let phone = to.replace(/\D/g, '');
    if (!phone.startsWith('52')) {
        phone = '52' + phone;
    }

    const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;

    const response = await axios.post(url, {
        token: token,
        to: phone,
        body: message
    });

    if (response.data.sent === 'true' || response.data.sent === true) {
        return {
            success: true,
            id: response.data.id,
            provider: 'ultramsg'
        };
    } else {
        throw new Error(response.data.message || 'Failed to send via Ultramsg');
    }
}

/**
 * Función principal para enviar WhatsApp
 */
async function sendWhatsApp(to, message) {
    if (!ENABLED) {
        console.log('[WhatsApp] Service disabled, skipping message');
        return { success: false, error: 'WhatsApp service is disabled' };
    }

    if (!to) {
        return { success: false, error: 'No phone number provided' };
    }

    try {
        const result = await sendViaUltramsg(to, message);
        console.log(`[WhatsApp] Message sent successfully via ${PROVIDER}:`, result.id);
        return result;

    } catch (error) {
        console.error('[WhatsApp] Error sending message:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * 1. Enviar confirmación de cita
 */
export async function sendWhatsAppBookingConfirmation(data) {
    const { phone, name, service, date, time, code } = data;

    if (!phone) {
        console.warn('[WhatsApp] No phone number provided for booking confirmation');
        return { success: false, error: 'No phone number provided' };
    }

    const message = loadTemplate('booking-confirmation', {
        nombre: name,
        servicio: service,
        fecha: date,
        hora: time,
        codigo: code || '----',
        direccion: BUSINESS_ADDRESS
    });

    if (!message) {
        return { success: false, error: 'Template not found' };
    }

    return await sendWhatsApp(phone, message);
}

/**
 * 2. Enviar confirmación de depósito aceptado
 */
export async function sendWhatsAppDepositAccepted(data) {
    const { phone, name, service, date, time, code } = data;

    if (!phone) {
        console.warn('[WhatsApp] No phone number provided for deposit confirmation');
        return { success: false, error: 'No phone number provided' };
    }

    const message = loadTemplate('deposit-accepted', {
        nombre: name,
        servicio: service,
        fecha: date,
        hora: time,
        codigo: code,
        direccion: BUSINESS_ADDRESS
    });

    if (!message) {
        return { success: false, error: 'Template not found' };
    }

    return await sendWhatsApp(phone, message);
}

export default {
    sendWhatsAppBookingConfirmation,
    sendWhatsAppDepositAccepted
};

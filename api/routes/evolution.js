import express from 'express';
import axios from 'axios';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

const EVOLUTION_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE_NAME || 'bracos-barberia';
const PUBLIC_URL = process.env.PUBLIC_URL || 'https://braco-s-barberia-production.up.railway.app';
const WEBHOOK_URL = `${PUBLIC_URL}/api/webhook/evolution`;

const evoClient = () => axios.create({
    baseURL: EVOLUTION_URL,
    headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
    timeout: 20000
});

// Configura el webhook para recibir mensajes/polls del cliente
async function setupWebhook() {
    const client = evoClient();
    const payload = {
        webhook: {
            enabled: true,
            url: WEBHOOK_URL,
            events: ['MESSAGES_UPSERT'],
            webhookByEvents: false,
            webhookBase64: false
        }
    };
    // Intentar ambos formatos (Evolution v1 y v2)
    try {
        await client.post(`/webhook/set/${EVOLUTION_INSTANCE}`, payload);
        console.log(`[Evolution] Webhook configurado v2: ${WEBHOOK_URL}`);
        return true;
    } catch (e1) {
        try {
            await client.post(`/webhook/set/${EVOLUTION_INSTANCE}`, {
                enabled: true,
                url: WEBHOOK_URL,
                events: ['MESSAGES_UPSERT'],
                webhook_by_events: false,
                webhook_base64: false
            });
            console.log(`[Evolution] Webhook configurado v1: ${WEBHOOK_URL}`);
            return true;
        } catch (e2) {
            console.error('[Evolution] No se pudo configurar webhook:', e2.response?.data || e2.message);
            return false;
        }
    }
}

// Todas las rutas requieren auth admin
router.use(authenticateToken, isAdmin);

// GET /api/evolution/status
router.get('/status', async (req, res) => {
    try {
        if (!EVOLUTION_URL || !EVOLUTION_KEY) {
            return res.json({ connected: false, state: 'not_configured', error: 'Faltan variables EVOLUTION_*' });
        }
        const response = await evoClient().get('/instance/fetchInstances');
        const list = Array.isArray(response.data) ? response.data : [];
        const instance = list.find(i => (i.name || i.instance?.instanceName) === EVOLUTION_INSTANCE);

        if (!instance) {
            return res.json({ connected: false, state: 'not_found', instance: EVOLUTION_INSTANCE });
        }

        const connectionStatus = instance.connectionStatus || instance.instance?.state || 'close';
        const number = instance.ownerJid || instance.instance?.owner || null;

        res.json({
            connected: connectionStatus === 'open',
            state: connectionStatus,
            instance: EVOLUTION_INSTANCE,
            number: number ? number.replace('@s.whatsapp.net', '') : null
        });
    } catch (error) {
        console.error('[Evolution] Status error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error consultando estado', message: error.message });
    }
});

// POST /api/evolution/connect - Genera QR
router.post('/connect', async (req, res) => {
    try {
        const client = evoClient();

        // Intentar crear instancia si no existe (con webhook pre-configurado)
        try {
            await client.post('/instance/create', {
                instanceName: EVOLUTION_INSTANCE,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
                webhook: {
                    url: WEBHOOK_URL,
                    enabled: true,
                    events: ['MESSAGES_UPSERT']
                }
            });
        } catch (_) {
            // Ya existe, continuar
        }

        // Asegurar que el webhook esté configurado (aunque la instancia ya exista)
        await setupWebhook();

        const response = await client.get(`/instance/connect/${EVOLUTION_INSTANCE}`);
        res.json({
            success: true,
            qrCode: response.data?.base64 || null,
            code: response.data?.code || null,
            webhookUrl: WEBHOOK_URL
        });
    } catch (error) {
        console.error('[Evolution] Connect error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error generando QR', message: error.message });
    }
});

// POST /api/evolution/setup-webhook - Re-configura el webhook manualmente
router.post('/setup-webhook', async (req, res) => {
    try {
        const ok = await setupWebhook();
        res.json({ success: ok, webhookUrl: WEBHOOK_URL });
    } catch (error) {
        console.error('[Evolution] Setup webhook error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error configurando webhook', message: error.message });
    }
});

// GET /api/evolution/webhook-info - Consulta el webhook actual
router.get('/webhook-info', async (req, res) => {
    try {
        const response = await evoClient().get(`/webhook/find/${EVOLUTION_INSTANCE}`);
        res.json({ success: true, expected: WEBHOOK_URL, current: response.data });
    } catch (error) {
        res.status(500).json({ error: 'Error consultando webhook', message: error.message });
    }
});

// POST /api/evolution/logout - Desvincula WhatsApp
router.post('/logout', async (req, res) => {
    try {
        await evoClient().delete(`/instance/logout/${EVOLUTION_INSTANCE}`);
        res.json({ success: true });
    } catch (error) {
        console.error('[Evolution] Logout error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error desvinculando', message: error.message });
    }
});

// POST /api/evolution/test - Envía mensaje de prueba
router.post('/test', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ error: 'Falta phone' });

        let cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) cleaned = '52' + cleaned;

        await evoClient().post(`/message/sendText/${EVOLUTION_INSTANCE}`, {
            number: cleaned,
            text: '✅ Mensaje de prueba desde Braco\'s Barbería'
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[Evolution] Test error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error enviando mensaje', message: error.message });
    }
});

export default router;

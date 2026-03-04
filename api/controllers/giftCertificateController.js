import GiftCertificate from '../models/GiftCertificate.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendTextMessage } from '../services/whatsappService.js';

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://braco-s-barberia-production.up.railway.app';

// Format phone for WhatsApp delivery
function normalizePhone(phone) {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    return clean.length === 10 ? '52' + clean : clean;
}

// Send gift certificate WhatsApp to buyer (payment confirmation) and recipient (the gift)
async function notifyGiftCertificate(cert) {
    const certUrl = `${PUBLIC_URL}/certificado.html?id=${cert.uuid}`;
    const serviceList = cert.services.map(s => `• ${s.name}`).join('\n');
    const totalFmt  = `$${parseFloat(cert.total).toFixed(0)}`;

    // 1️⃣  Message to buyer
    const buyerPhone = normalizePhone(cert.buyer_phone);
    if (buyerPhone) {
        const buyerMsg =
`🎁 *¡Certificado de Regalo creado!*

Hola *${cert.buyer_name}*, tu regalo para *${cert.recipient_name}* ya está listo.

🎀 *Servicios incluidos:*
${serviceList}

💰 Total pagado: *${totalFmt}*

Comparte este enlace con *${cert.recipient_name}* para que descargue su certificado:
👉 ${certUrl}

¡Gracias por elegir Braco's Barbería! 💈`;

        await sendTextMessage(buyerPhone, buyerMsg);
    }

    // 2️⃣  Message to recipient (only if phone provided)
    const recipientPhone = normalizePhone(cert.recipient_phone);
    if (recipientPhone) {
        const recipientMsg =
`🎁 *¡Tienes un regalo!*

Hola *${cert.recipient_name}*, *${cert.buyer_name}* te regaló un certificado de Braco's Barbería.

🎀 *Servicios incluidos:*
${serviceList}

Descarga tu certificado en el siguiente enlace y úsalo cuando quieras:
👉 ${certUrl}

📌 Válido por 6 meses. Preséntalo en la barbería o muestra esta imagen.

¡Nos vemos pronto! 💈`;

        await sendTextMessage(recipientPhone, recipientMsg);
    }
}

export const giftCertificateController = {

    // POST /api/gift-certificates
    async create(req, res, next) {
        try {
            const { buyer_name, buyer_phone, buyer_email, recipient_name, recipient_phone, services, total, payment_method, notes } = req.body;

            const cert = await GiftCertificate.create({
                buyer_name, buyer_phone, buyer_email,
                recipient_name, recipient_phone,
                services, total, payment_method, notes
            });

            // Fire-and-forget WhatsApp notifications
            notifyGiftCertificate(cert)
                .catch(err => console.error('[GiftCert] WhatsApp error:', err));

            res.status(201).json({
                success: true,
                message: 'Certificado creado correctamente',
                data: {
                    uuid: cert.uuid,
                    url: `${PUBLIC_URL}/certificado.html?id=${cert.uuid}`,
                    expires_at: cert.expires_at
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/gift-certificates/:uuid  (public)
    async getByUuid(req, res, next) {
        try {
            const cert = await GiftCertificate.getByUuid(req.params.uuid);
            if (!cert) throw new AppError('Certificado no encontrado', 404);
            res.json({ success: true, data: cert });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/gift-certificates/:uuid/redeem  (admin)
    async redeem(req, res, next) {
        try {
            const cert = await GiftCertificate.redeem(req.params.uuid);
            res.json({ success: true, message: 'Certificado canjeado', data: cert });
        } catch (error) {
            next(error);
        }
    },

    // POST /api/gift-certificates/:uuid/cancel  (admin)
    async cancel(req, res, next) {
        try {
            const cert = await GiftCertificate.cancel(req.params.uuid);
            res.json({ success: true, message: 'Certificado cancelado', data: cert });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/gift-certificates  (admin)
    async getAll(req, res, next) {
        try {
            const { status, limit, offset } = req.query;
            const certs = await GiftCertificate.getAll({ status, limit: Number(limit) || 50, offset: Number(offset) || 0 });
            res.json({ success: true, data: certs });
        } catch (error) {
            next(error);
        }
    }
};

export default giftCertificateController;

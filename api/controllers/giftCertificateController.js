import GiftCertificate from '../models/GiftCertificate.js';
import { AppError } from '../middleware/errorHandler.js';

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://braco-s-barberia-production.up.railway.app';

// Build a pre-filled WhatsApp link for manual sharing by the admin
function buildWhatsAppLink(cert, certUrl) {
    const serviceList = cert.services.map(s => `• ${s.name}`).join('\n');
    const totalFmt    = `$${parseFloat(cert.total).toFixed(0)}`;
    const phone       = cert.recipient_phone
        ? cert.recipient_phone.replace(/\D/g, '')
        : '';

    const msg =
`🎁 *¡Tienes un regalo en Braco's Barbería!*

Hola *${cert.recipient_name}*, *${cert.buyer_name}* te regaló un certificado.

🎀 *Servicios incluidos:*
${serviceList}

💰 Valor: *${totalFmt}*

Descarga tu certificado aquí:
👉 ${certUrl}

📌 Válido por 6 meses. Preséntalo al llegar a tu cita. ¡Nos vemos pronto! 💈`;

    const encoded = encodeURIComponent(msg);
    const base    = phone ? `https://wa.me/${phone.length === 10 ? '52' + phone : phone}` : 'https://wa.me/';
    return `${base}?text=${encoded}`;
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

            const certUrl    = `${PUBLIC_URL}/certificado.html?id=${cert.uuid}`;
            const whatsappUrl = buildWhatsAppLink(cert, certUrl);

            res.status(201).json({
                success: true,
                message: 'Certificado creado correctamente',
                data: {
                    uuid:         cert.uuid,
                    url:          certUrl,
                    whatsapp_url: whatsappUrl,
                    expires_at:   cert.expires_at
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

import GiftCertificate from '../models/GiftCertificate.js';
import { AppError } from '../middleware/errorHandler.js';
import { query as dbQuery } from '../config/database.js';
import * as whatsappService from '../services/whatsappService.js';

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://braco-s-barberia-production.up.railway.app';

// Build a pre-filled WhatsApp link for manual sharing by the admin
function buildWhatsAppLink(cert, certUrl) {
    const serviceList = cert.services.map(s => `• ${s.name}`).join('\n');
    const senderName  = cert.sender_label || cert.buyer_name;
    const phone       = cert.recipient_phone
        ? cert.recipient_phone.replace(/\D/g, '')
        : '';

    const msg =
`🎁 *¡Tienes un regalo en Braco's Barbería!*

Hola *${cert.recipient_name}*, *${senderName}* te regaló un certificado.

🎀 *Servicios incluidos:*
${serviceList}

Ver tu certificado aquí:
👉 ${certUrl}

📌 Válido por 6 meses. Preséntalo al llegar a tu cita. ¡Nos vemos pronto! 💈`;

    const encoded = encodeURIComponent(msg);
    const base    = phone ? `https://wa.me/${phone.length === 10 ? '52' + phone : phone}` : 'https://wa.me/';
    return `${base}?text=${encoded}`;
}

export const giftCertificateController = {

    // POST /api/gift-certificates/request  — solicitud pública del cliente (sin pago)
    async createRequest(req, res, next) {
        try {
            const { buyer_name, buyer_phone, recipient_name, recipient_phone, sender_label, services_requested, personal_message } = req.body;

            // Guardar solicitud en DB
            const result = await dbQuery(`
                INSERT INTO gift_certificate_requests
                    (buyer_name, buyer_phone, recipient_name, recipient_phone, sender_label, services_requested, personal_message, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                RETURNING id
            `, [buyer_name, buyer_phone, recipient_name, recipient_phone || null, sender_label, services_requested, personal_message || null]);

            const requestId = result.rows[0]?.id;

            // Notificar al admin por WhatsApp
            try {
                const adminPhone = process.env.TWILIO_ADMIN_PHONES || process.env.TWILIO_ADMIN_PHONE;
                if (adminPhone) {
                    const adminPhones = adminPhone.split(',').map(p => p.trim()).filter(p => p);
                    const msg = `🎁 *Nueva Solicitud de Certificado de Regalo*\n\n👤 *Comprador:* ${buyer_name}\n📱 ${buyer_phone}\n\n🎀 *Para:* ${recipient_name}\n✉️ *Aparecerá como:* ${sender_label}\n\n✂️ *Servicios:* ${services_requested}${personal_message ? `\n\n💬 ${personal_message}` : ''}\n\n👉 Revisa en el panel admin > Regalos (Solicitud #${requestId})`;
                    for (const phone of adminPhones) {
                        await whatsappService.sendTextMessage(phone, msg).catch(() => {});
                    }
                }
            } catch { /* no bloquear si falla el WhatsApp */ }

            // Notificación interna
            try {
                await dbQuery(`
                    INSERT INTO notifications (type, title, message, data, created_at)
                    VALUES ($1, $2, $3, $4, NOW())
                `, [
                    'gift_certificate_request',
                    'Nueva Solicitud de Certificado de Regalo',
                    `${buyer_name} solicita un certificado para ${recipient_name} — ${services_requested}`,
                    JSON.stringify({ requestId, buyerName: buyer_name, buyerPhone: buyer_phone, recipientName: recipient_name })
                ]);
            } catch { /* ignorar si tabla de notificaciones no existe */ }

            res.status(201).json({
                success: true,
                message: 'Solicitud recibida. Te contactaremos pronto para coordinar el pago.'
            });
        } catch (error) {
            // Si falla por tabla faltante, dar respuesta amigable pero notificar igualmente
            if (error.code === '42P01') { // tabla no existe
                // Aún así intentar notificar al admin
                try {
                    const adminPhone = process.env.TWILIO_ADMIN_PHONES || process.env.TWILIO_ADMIN_PHONE;
                    if (adminPhone && req.body) {
                        const { buyer_name, buyer_phone, recipient_name, sender_label, services_requested } = req.body;
                        const msg = `🎁 *Nueva Solicitud de Certificado*\n\n${buyer_name} (${buyer_phone})\nPara: ${recipient_name}\nComo: ${sender_label}\nServicios: ${services_requested}`;
                        const adminPhones = adminPhone.split(',').map(p => p.trim()).filter(p => p);
                        for (const phone of adminPhones) {
                            await whatsappService.sendTextMessage(phone, msg).catch(() => {});
                        }
                    }
                } catch { /* ignorar */ }
                return res.status(201).json({
                    success: true,
                    message: 'Solicitud recibida. Te contactaremos pronto para coordinar el pago.'
                });
            }
            next(error);
        }
    },

    // POST /api/gift-certificates
    async create(req, res, next) {
        try {
            const { buyer_name, buyer_phone, buyer_email, recipient_name, recipient_phone, sender_label, services, total, payment_method, notes } = req.body;

            const cert = await GiftCertificate.create({
                buyer_name, buyer_phone, buyer_email,
                recipient_name, recipient_phone,
                sender_label, services, total, payment_method, notes
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

    // GET /api/gift-certificates/requests  (admin)
    async getAllRequests(req, res, next) {
        try {
            const { status } = req.query;
            let sql = 'SELECT * FROM gift_certificate_requests';
            const params = [];
            if (status) {
                sql += ' WHERE status = $1';
                params.push(status);
            }
            sql += ' ORDER BY created_at DESC';
            const result = await dbQuery(sql, params);
            res.json({ success: true, data: result.rows });
        } catch (error) {
            if (error.code === '42P01') {
                return res.json({ success: true, data: [] });
            }
            next(error);
        }
    },

    // PATCH /api/gift-certificates/requests/:id  (admin)
    async updateRequest(req, res, next) {
        try {
            const { id } = req.params;
            const { status, admin_notes } = req.body;
            const result = await dbQuery(`
                UPDATE gift_certificate_requests
                SET status = $1, admin_notes = COALESCE($2, admin_notes), updated_at = NOW()
                WHERE id = $3
                RETURNING *
            `, [status, admin_notes || null, id]);
            if (!result.rows.length) throw new AppError('Solicitud no encontrada', 404);
            res.json({ success: true, data: result.rows[0] });
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

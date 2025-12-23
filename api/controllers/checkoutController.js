import Checkout from '../models/Checkout.js';
import { AppError } from '../middleware/errorHandler.js';
import emailService from '../services/emailService.js';
import whatsappService from '../services/whatsappService.js';
import { query } from '../config/database.js';

export const checkoutController = {
    // POST /api/checkout - Procesar pago
    async processCheckout(req, res, next) {
        try {
            const {
                appointment_id,
                client_id,
                service_cost,
                products_cost,
                discount,
                total,
                payment_method,
                use_membership,
                products,
                notes
            } = req.body;

            // Validaciones básicas
            if (!payment_method) {
                throw new AppError('Faltan datos requeridos: método de pago', 400);
            }

            if (total < 0) {
                throw new AppError('El total no puede ser negativo', 400);
            }

            const result = await Checkout.process({
                appointment_id,
                client_id,
                service_cost,
                products_cost,
                discount,
                total,
                payment_method,
                use_membership,
                products,
                notes
            });

            // ENVIAR NOTIFICACIONES (EMAIL + WHATSAPP)
            let emailResult = null;
            try {
                if (client_id) {
                    const chkRes = await query(`
                        SELECT c.payment_method, c.used_membership, mt.name as mem_name, c.total, c.completed_at, 
                               cl.email, cl.phone, cl.whatsapp_enabled, cl.name as client_name,
                               cm.total_services, cm.used_services, cm.uuid as mem_uuid
                        FROM checkouts c
                        JOIN clients cl ON c.client_id = cl.id
                        LEFT JOIN client_memberships cm ON c.membership_id = cm.id
                        LEFT JOIN membership_types mt ON cm.membership_type_id = mt.id
                        WHERE c.id = $1
                    `, [result.checkout_id]);

                    if (chkRes.rows.length > 0) {
                        const data = chkRes.rows[0];

                        let payDesc = data.payment_method;
                        if (data.used_membership && data.mem_name) {
                            payDesc = `Membresía (${data.mem_name})`;
                        }

                        // Descripción del servicio
                        let serviceDesc = products && products.length > 0 ? 'Compra de productos' : 'Servicio de Barbería';
                        if (appointment_id && products && products.length > 0) serviceDesc = 'Servicio + Productos';

                        const formattedDate = new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                        // 1. EMAIL
                        if (data.email) {
                            console.log(`PREPARANDO ENVÍO RECIBO EMAIL: ${data.email}`);
                            const emailResultPromise = emailService.sendCheckoutReceipt({
                                email: data.email,
                                name: data.client_name,
                                service: serviceDesc,
                                total: data.total,
                                paymentMethod: payDesc,
                                date: formattedDate
                            });
                            // No esperamos, dejamos correr
                            emailResultPromise.then(res => console.log('Email receipt outcome:', res)).catch(err => console.error('Email receipt error:', err));
                        }

                        // 2. WHATSAPP (Smart Receipt)
                        if (data.phone && data.whatsapp_enabled !== false) {
                            console.log(`PREPARANDO ENVÍO RECIBO WHATSAPP: ${data.phone}`);

                            let payload = {
                                phone: data.phone,
                                name: data.client_name,
                                service: serviceDesc,
                                date: formattedDate,
                            };

                            const isMembership = data.used_membership === true;

                            if (isMembership) {
                                // Calcular restantes
                                const remaining = (data.total_services || 0) - (data.used_services || 0);
                                const baseUrl = process.env.PUBLIC_URL || 'https://bracos-barberia-production.up.railway.app';

                                payload.type = 'membership';
                                payload.membershipName = data.mem_name;
                                payload.remaining = remaining;
                                payload.cardUrl = `${baseUrl}/tarjeta.html?id=${data.mem_uuid}`;
                            } else {
                                payload.type = 'standard';
                                payload.total = `$${data.total}`;
                            }

                            const whatsappRes = await whatsappService.sendCheckoutReceipt(payload);
                            console.log('WhatsApp receipt outcome:', whatsappRes);
                        }

                        emailResult = { success: true, message: 'Notificaciones iniciadas' };

                    } else {
                        emailResult = { success: false, message: 'No se encontraron datos de checkout.' };
                    }
                } else {
                    emailResult = { success: false, message: 'No se proporcionó client_id.' };
                }
            } catch (err) {
                console.error('🔥 EXCEPCIÓN CRÍTICA ENVIANDO NOTIFICACIONES:', err);
                emailResult = { success: false, error: err.message };
            }

            res.status(201).json({
                success: true,
                message: 'Checkout procesado correctamente',
                checkout_id: result.checkout_id,
                email_status: emailResult
            });
        } catch (error) {
            next(error);
        }
    }
};

export default checkoutController;

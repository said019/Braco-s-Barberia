import Checkout from '../models/Checkout.js';
import { AppError } from '../middleware/errorHandler.js';
import emailService from '../services/emailService.js';
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

            // ENVIAR CORREO DE RECIBO
            let emailResult = null;
            try {
                if (client_id) {
                    const chkRes = await query(`
                        SELECT c.payment_method, c.used_membership, mt.name as mem_name, c.total, c.completed_at, cl.email, cl.name as client_name
                        FROM checkouts c
                        JOIN clients cl ON c.client_id = cl.id
                        LEFT JOIN client_memberships cm ON c.membership_id = cm.id
                        LEFT JOIN membership_types mt ON cm.membership_type_id = mt.id
                        WHERE c.id = $1
                    `, [result.checkout_id]);

                    if (chkRes.rows.length > 0) {
                        const data = chkRes.rows[0];
                        if (data.email) {
                            let payDesc = data.payment_method;
                            if (data.used_membership && data.mem_name) {
                                payDesc = `Membresía (${data.mem_name})`;
                            }

                            // Descripción del servicio
                            let serviceDesc = products && products.length > 0 ? 'Compra de productos' : 'Servicio de Barbería';
                            if (appointment_id && products && products.length > 0) serviceDesc = 'Servicio + Productos';

                            console.log(`PREPARANDO ENVÍO RECIBO: Email=${data.email}, Cliente=${data.client_name}, Total=${data.total}`);

                            const emailResult = await emailService.sendCheckoutReceipt({
                                email: data.email,
                                name: data.client_name,
                                service: serviceDesc,
                                total: data.total,
                                paymentMethod: payDesc,
                                date: new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                            });

                            if (emailResult.success) {
                                console.log(`✅ RECIBO ENVIADO CORRECTAMENTE: ID=${emailResult.id}`);
                            } else {
                                console.error(`❌ FALLO ENVÍO RECIBO: ${emailResult.error}`);
                            }
                        } else {
                            console.log('⚠️ No se encontró email para el cliente en el checkout.');
                            emailResult = { success: false, message: 'No se encontró email para el cliente.' };
                        }
                    } else {
                        emailResult = { success: false, message: 'No se encontraron datos de checkout para enviar el recibo.' };
                    }
                } else {
                    emailResult = { success: false, message: 'No se proporcionó client_id para enviar el recibo.' };
                }
            } catch (err) {
                console.error('🔥 EXCEPCIÓN CRÍTICA ENVIANDO RECIBO:', err);
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

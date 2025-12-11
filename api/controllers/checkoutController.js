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
            try {
                if (client_id) {
                    const chkRes = await query(`
                        SELECT c.payment_method, c.used_membership, mt.name as mem_name, c.total, c.created_at, cl.email, cl.name as client_name
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

                            await emailService.sendCheckoutReceipt({
                                email: data.email,
                                name: data.client_name,
                                service: serviceDesc,
                                total: data.total,
                                paymentMethod: payDesc,
                                date: new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                            });
                            console.log('Recibo de checkout enviado a ' + data.email);
                        }
                    }
                }
            } catch (err) {
                console.error('Error enviando recibo checkout:', err);
            }

            res.status(201).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

export default checkoutController;

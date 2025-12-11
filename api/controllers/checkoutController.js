import Checkout from '../models/Checkout.js';
import { AppError } from '../middleware/errorHandler.js';

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

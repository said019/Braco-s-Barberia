import express from 'express';
import checkoutController from '../controllers/checkoutController.js';
import { validate } from '../middleware/validators.js';
import { body } from 'express-validator';

const router = express.Router();

// POST /api/checkout - Procesar checkout (Público/Protegido por lógica interna)
// Nota: Podríamos agregar validación de token si fuera necesario, pero el checkout es público
// Se valida por el ID de la cita y su código
router.post('/', [
    body('appointment_id').isInt().withMessage('ID de cita inválido'),
    body('client_id').isInt().withMessage('ID de cliente inválido'),
    body('payment_method').isIn(['cash', 'card', 'transfer', 'membership']).withMessage('Método de pago inválido'),
    body('total').isFloat({ min: 0 }).withMessage('El total debe ser mayor o igual a 0'),
    validate
], checkoutController.processCheckout);

export default router;

import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validators.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import giftCertificateController from '../controllers/giftCertificateController.js';

const router = express.Router();

// ── Public ─────────────────────────────────────────────────────────────────

// GET /api/gift-certificates/:uuid  — view certificate (public, for certificado.html)
router.get('/:uuid', giftCertificateController.getByUuid);

// POST /api/gift-certificates  — purchase a gift certificate (public)
router.post('/', [
    body('buyer_name').trim().notEmpty().withMessage('El nombre del comprador es obligatorio'),
    body('buyer_phone').trim().notEmpty().withMessage('El teléfono del comprador es obligatorio'),
    body('buyer_email').optional({ nullable: true }).isEmail().withMessage('Email inválido'),
    body('recipient_name').trim().notEmpty().withMessage('El nombre del destinatario es obligatorio'),
    body('recipient_phone').optional({ nullable: true }).trim(),
    body('services').isArray({ min: 1 }).withMessage('Selecciona al menos un servicio'),
    body('total').isFloat({ min: 1 }).withMessage('El total debe ser mayor a 0'),
    body('payment_method').isIn(['efectivo', 'tarjeta', 'transferencia']).withMessage('Método de pago inválido'),
    validate
], giftCertificateController.create);

// ── Admin ───────────────────────────────────────────────────────────────────

// GET /api/gift-certificates  — list all (admin)
router.get('/', authenticateToken, isAdmin, giftCertificateController.getAll);

// POST /api/gift-certificates/:uuid/redeem  — mark as redeemed (admin)
router.post('/:uuid/redeem', authenticateToken, isAdmin, giftCertificateController.redeem);

// POST /api/gift-certificates/:uuid/cancel  — cancel (admin)
router.post('/:uuid/cancel', authenticateToken, isAdmin, giftCertificateController.cancel);

export default router;

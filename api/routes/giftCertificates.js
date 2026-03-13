import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validators.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import giftCertificateController from '../controllers/giftCertificateController.js';

const router = express.Router();

// ── Public ─────────────────────────────────────────────────────────────────

// POST /api/gift-certificates/request  — solicitud del cliente (sin pago aún)
router.post('/request', [
    body('buyer_name').trim().notEmpty().withMessage('El nombre del comprador es obligatorio'),
    body('buyer_phone').trim().notEmpty().withMessage('El teléfono del comprador es obligatorio'),
    body('recipient_name').trim().notEmpty().withMessage('El nombre del destinatario es obligatorio'),
    body('sender_label').trim().notEmpty().withMessage('El campo "cómo aparecerás" es obligatorio'),
    body('services_requested').trim().notEmpty().withMessage('Selecciona al menos un servicio'),
    validate
], giftCertificateController.createRequest);

// ── Admin ───────────────────────────────────────────────────────────────────

// GET /api/gift-certificates/requests  — list all requests (admin)
// NOTE: Must be defined BEFORE /:uuid to avoid "requests" matching as a uuid param
router.get('/requests', authenticateToken, isAdmin, giftCertificateController.getAllRequests);

// PATCH /api/gift-certificates/requests/:id  — update request status (admin)
router.patch('/requests/:id', authenticateToken, isAdmin, [
    body('status').isIn(['pending', 'in_progress', 'completed', 'cancelled']).withMessage('Estado inválido'),
    body('admin_notes').optional({ nullable: true }).trim(),
    validate
], giftCertificateController.updateRequest);

// GET /api/gift-certificates/:uuid  — view certificate (public, for certificado.html)
router.get('/:uuid', giftCertificateController.getByUuid);

// POST /api/gift-certificates  — create a gift certificate (admin only)
router.post('/', authenticateToken, isAdmin, [
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

// GET /api/gift-certificates  — list all (admin)
router.get('/', authenticateToken, isAdmin, giftCertificateController.getAll);

// PUT /api/gift-certificates/:uuid  — update certificate (admin)
router.put('/:uuid', authenticateToken, isAdmin, giftCertificateController.update);

// POST /api/gift-certificates/:uuid/redeem  — mark as redeemed (admin)
router.post('/:uuid/redeem', authenticateToken, isAdmin, giftCertificateController.redeem);

// POST /api/gift-certificates/:uuid/cancel  — cancel (admin)
router.post('/:uuid/cancel', authenticateToken, isAdmin, giftCertificateController.cancel);

export default router;

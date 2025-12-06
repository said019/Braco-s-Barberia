import express from 'express';
import appointmentController from '../controllers/appointmentController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { validateAppointment, validateId } from '../middleware/validators.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validators.js';

const router = express.Router();

// Rutas públicas
router.get('/available-slots', appointmentController.getAvailableSlots);
router.get('/by-code/:code', appointmentController.getByCheckoutCode);
router.post('/', validateAppointment, appointmentController.create);

// Rutas protegidas (admin)
router.get('/', authenticateToken, isAdmin, appointmentController.getAll);
router.get('/today', authenticateToken, isAdmin, appointmentController.getToday);
router.get('/:id', authenticateToken, isAdmin, validateId, appointmentController.getById);

// Actualización
router.put('/:id', authenticateToken, isAdmin, validateId, appointmentController.update);
router.patch('/:id/status', authenticateToken, isAdmin, validateId, [
  body('status').isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  validate
], appointmentController.updateStatus);

// Acciones específicas
router.post('/:id/confirm', authenticateToken, isAdmin, validateId, appointmentController.confirm);
router.post('/:id/cancel', authenticateToken, validateId, [
  body('reason').optional().isString(),
  validate
], appointmentController.cancel);
router.post('/:id/complete', authenticateToken, isAdmin, validateId, appointmentController.complete);
router.post('/:id/no-show', authenticateToken, isAdmin, validateId, appointmentController.markNoShow);

export default router;

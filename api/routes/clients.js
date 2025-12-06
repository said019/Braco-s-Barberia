import express from 'express';
import clientController from '../controllers/clientController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { validateClient, validateId } from '../middleware/validators.js';

const router = express.Router();

// Rutas protegidas (admin)
router.get('/', authenticateToken, isAdmin, clientController.getAll);
router.get('/:id', authenticateToken, isAdmin, validateId, clientController.getById);
router.get('/phone/:phone', clientController.getByPhone);
router.get('/:id/appointments', authenticateToken, isAdmin, validateId, clientController.getAppointments);
router.get('/:id/memberships', authenticateToken, isAdmin, validateId, clientController.getMemberships);
// Ruta pública para checkout - obtener membresías activas
router.get('/:id/active-memberships', validateId, clientController.getActiveMemberships);

// Crear cliente (público - para agendamiento)
router.post('/', validateClient, clientController.create);

// Actualizar/Eliminar (admin)
router.put('/:id', authenticateToken, isAdmin, validateId, validateClient, clientController.update);
router.delete('/:id', authenticateToken, isAdmin, validateId, clientController.delete);

export default router;

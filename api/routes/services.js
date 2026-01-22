import express from 'express';
import serviceController from '../controllers/serviceController.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { validateService, validateId } from '../middleware/validators.js';

const router = express.Router();

// Rutas públicas
router.get('/', serviceController.getAll);
router.get('/categories', serviceController.getCategories);
router.get('/extras', serviceController.getExtras);
router.get('/:id', validateId, serviceController.getById);
router.get('/category/:categoryId', validateId, serviceController.getByCategory);

// Rutas protegidas (admin)
router.post('/', authenticateToken, isAdmin, validateService, serviceController.create);
router.put('/:id', authenticateToken, isAdmin, validateId, validateService, serviceController.update);
router.delete('/:id', authenticateToken, isAdmin, validateId, serviceController.delete);

export default router;

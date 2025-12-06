import express from 'express';
import productController from '../controllers/productController.js';
import { validateId } from '../middleware/validators.js';

const router = express.Router();

// Rutas públicas
router.get('/', productController.getAll);
router.get('/:id', validateId, productController.getById);

export default router;

import express from 'express';
import { body, query } from 'express-validator';
import reviewController from '../controllers/reviewController.js';
import { validate } from '../middleware/validators.js';

const router = express.Router();

router.get('/public', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 30 }).withMessage('El límite debe estar entre 1 y 30'),
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('El offset debe ser mayor o igual a 0'),
  validate
], reviewController.listPublic);

router.post('/', [
  body('checkout_id')
    .isInt({ min: 1 }).withMessage('checkout_id inválido'),
  body('client_id')
    .isInt({ min: 1 }).withMessage('client_id inválido'),
  body('rating')
    .isInt({ min: 1, max: 5 }).withMessage('La calificación debe ser de 1 a 5'),
  body('comment')
    .trim()
    .isLength({ min: 8, max: 500 }).withMessage('El comentario debe tener entre 8 y 500 caracteres'),
  validate
], reviewController.create);

export default router;

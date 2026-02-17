import Review from '../models/Review.js';
import { AppError } from '../middleware/errorHandler.js';

export const reviewController = {
  // POST /api/reviews
  async create(req, res, next) {
    try {
      const { checkout_id, client_id, rating, comment } = req.body;

      if (!checkout_id || !client_id) {
        throw new AppError('checkout_id y client_id son requeridos', 400);
      }

      const review = await Review.create({
        checkout_id,
        client_id,
        rating,
        comment
      });

      res.status(201).json({
        success: true,
        message: 'Reseña registrada correctamente',
        data: review
      });
    } catch (error) {
      next(error);
    }
  },

  // GET /api/reviews/public
  async listPublic(req, res, next) {
    try {
      const data = await Review.listPublic({
        limit: req.query.limit,
        offset: req.query.offset
      });

      res.json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  }
};

export default reviewController;

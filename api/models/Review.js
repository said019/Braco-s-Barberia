import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

function maskClientName(name) {
  const clean = (name || '').trim();
  if (!clean) return 'Cliente';

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0];

  return `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;
}

function normalizeComment(comment) {
  return String(comment || '').replace(/\s+/g, ' ').trim();
}

function mapPublicReview(row) {
  return {
    id: row.id,
    rating: Number(row.rating),
    comment: row.comment,
    client_name: maskClientName(row.client_name),
    created_at: row.created_at
  };
}

export const Review = {
  async create(data) {
    const checkoutId = Number(data.checkout_id);
    const clientId = Number(data.client_id);
    const rating = Number(data.rating);
    const comment = normalizeComment(data.comment);

    if (!checkoutId || !clientId) {
      throw new AppError('Datos inválidos para registrar la reseña', 400);
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError('La calificación debe ser un número entre 1 y 5', 400);
    }

    if (comment.length < 8 || comment.length > 500) {
      throw new AppError('El comentario debe tener entre 8 y 500 caracteres', 400);
    }

    const checkoutResult = await query(`
      SELECT
        ch.id AS checkout_id,
        ch.client_id,
        ch.appointment_id,
        c.name AS client_name,
        a.status AS appointment_status
      FROM checkouts ch
      JOIN clients c ON c.id = ch.client_id
      LEFT JOIN appointments a ON a.id = ch.appointment_id
      WHERE ch.id = $1
      LIMIT 1
    `, [checkoutId]);

    if (checkoutResult.rows.length === 0) {
      throw new AppError('Checkout no encontrado para esta reseña', 404);
    }

    const checkout = checkoutResult.rows[0];
    if (Number(checkout.client_id) !== clientId) {
      throw new AppError('No puedes registrar reseñas para otro cliente', 403);
    }

    if (checkout.appointment_status && checkout.appointment_status !== 'completed') {
      throw new AppError('Solo puedes reseñar servicios completados', 400);
    }

    if (!checkout.appointment_id) {
      throw new AppError('Este checkout no está asociado a una cita reseñable', 400);
    }

    const existingReview = await query(
      'SELECT id FROM reviews WHERE checkout_id = $1 LIMIT 1',
      [checkoutId]
    );

    if (existingReview.rows.length > 0) {
      throw new AppError('Ya registraste una reseña para este checkout', 409);
    }

    const insertResult = await query(`
      INSERT INTO reviews (
        checkout_id,
        appointment_id,
        client_id,
        client_name,
        rating,
        comment
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, checkout_id, rating, comment, client_name, created_at
    `, [
      checkoutId,
      checkout.appointment_id,
      clientId,
      checkout.client_name,
      rating,
      comment
    ]);

    return mapPublicReview(insertResult.rows[0]);
  },

  async listPublic({ limit = 9, offset = 0 } = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 9, 1), 30);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const summaryResult = await query(`
      SELECT
        COUNT(*)::INT AS total_reviews,
        COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average_rating
      FROM reviews
      WHERE is_approved = TRUE
    `);

    const reviewsResult = await query(`
      SELECT
        id,
        client_name,
        rating,
        comment,
        created_at
      FROM reviews
      WHERE is_approved = TRUE
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [safeLimit, safeOffset]);

    const totalReviews = summaryResult.rows[0]?.total_reviews || 0;
    const averageRating = Number(summaryResult.rows[0]?.average_rating || 0);
    const reviews = reviewsResult.rows.map(mapPublicReview);

    return {
      reviews,
      summary: {
        total_reviews: totalReviews,
        average_rating: averageRating
      },
      pagination: {
        limit: safeLimit,
        offset: safeOffset,
        has_more: safeOffset + reviews.length < totalReviews
      }
    };
  }
};

export default Review;

import { query } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

export const GiftCertificate = {

  // -----------------------------------------------------------------------
  // Crear certificado
  // -----------------------------------------------------------------------
  async create({ buyer_name, buyer_phone, buyer_email, recipient_name, recipient_phone, services, total, payment_method, notes }) {
    if (!buyer_name || !buyer_phone || !recipient_name) {
      throw new AppError('Faltan datos del comprador o del destinatario', 400);
    }
    if (!services || !Array.isArray(services) || services.length === 0) {
      throw new AppError('Debes incluir al menos un servicio', 400);
    }
    if (!total || total <= 0) {
      throw new AppError('El total debe ser mayor a 0', 400);
    }

    const result = await query(`
      INSERT INTO gift_certificates
        (buyer_name, buyer_phone, buyer_email, recipient_name, recipient_phone, services, total, payment_method, notes)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
      RETURNING *
    `, [
      buyer_name.trim(),
      buyer_phone.replace(/\D/g, ''),
      buyer_email?.trim() || null,
      recipient_name.trim(),
      recipient_phone ? recipient_phone.replace(/\D/g, '') : null,
      JSON.stringify(services),
      total,
      payment_method || 'efectivo',
      notes || null
    ]);

    const cert = result.rows[0];

    // Registrar como venta en la tabla transactions
    try {
      await query(`
        INSERT INTO transactions
          (type, description, amount, payment_method, transaction_date)
        VALUES ('service', $1, $2, $3, CURRENT_DATE)
      `, [
        `Certificado de regalo para ${cert.recipient_name}`,
        cert.total,
        cert.payment_method
      ]);
    } catch (txErr) {
      // No abortar la creación si falla la transacción (log únicamente)
      console.error('⚠️  No se pudo registrar transacción del certificado:', txErr.message);
    }

    return cert;
  },

  // -----------------------------------------------------------------------
  // Obtener por UUID (vista pública del certificado)
  // -----------------------------------------------------------------------
  async getByUuid(uuid) {
    const result = await query(`
      SELECT * FROM gift_certificates WHERE uuid = $1 LIMIT 1
    `, [uuid]);
    return result.rows[0] || null;
  },

  // -----------------------------------------------------------------------
  // Canjear certificado
  // -----------------------------------------------------------------------
  async redeem(uuid) {
    const cert = await this.getByUuid(uuid);
    if (!cert) throw new AppError('Certificado no encontrado', 404);
    if (cert.status === 'redeemed') throw new AppError('Este certificado ya fue canjeado', 409);
    if (cert.status === 'expired')  throw new AppError('Este certificado ha vencido', 410);
    if (cert.status === 'cancelled') throw new AppError('Este certificado fue cancelado', 410);

    // Check expiry
    const today = new Date();
    if (cert.expires_at && new Date(cert.expires_at) < today) {
      await query(`UPDATE gift_certificates SET status='expired', updated_at=NOW() WHERE uuid=$1`, [uuid]);
      throw new AppError('Este certificado ha vencido', 410);
    }

    const result = await query(`
      UPDATE gift_certificates
         SET status='redeemed', redeemed_at=NOW(), updated_at=NOW()
       WHERE uuid=$1
      RETURNING *
    `, [uuid]);

    return result.rows[0];
  },

  // -----------------------------------------------------------------------
  // Cancelar
  // -----------------------------------------------------------------------
  async cancel(uuid) {
    const cert = await this.getByUuid(uuid);
    if (!cert) throw new AppError('Certificado no encontrado', 404);
    if (cert.status === 'redeemed') throw new AppError('No se puede cancelar un certificado ya canjeado', 409);

    const result = await query(`
      UPDATE gift_certificates
         SET status='cancelled', updated_at=NOW()
       WHERE uuid=$1
      RETURNING *
    `, [uuid]);
    return result.rows[0];
  },

  // -----------------------------------------------------------------------
  // Listar todos (admin)
  // -----------------------------------------------------------------------
  async getAll({ status, limit = 50, offset = 0 } = {}) {
    let sql = `SELECT * FROM gift_certificates WHERE 1=1`;
    const params = [];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    params.push(limit, offset);
    sql += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await query(sql, params);
    return result.rows;
  }
};

export default GiftCertificate;

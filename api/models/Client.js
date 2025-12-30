import { query } from '../config/database.js';

export const Client = {
  // Obtener todos los clientes
  async getAll(filters = {}) {
    let sql = `
      SELECT 
        c.*,
        ct.name as client_type_name,
        ct.color as client_type_color
      FROM clients c
      JOIN client_types ct ON c.client_type_id = ct.id
      WHERE c.is_active = TRUE
    `;
    const params = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      sql += ` AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length} OR c.email ILIKE $${params.length})`;
    }

    sql += ` ORDER BY c.created_at DESC`;

    if (filters.limit) {
      params.push(filters.limit);
      sql += ` LIMIT $${params.length}`;
    }

    const result = await query(sql, params);
    return result.rows;
  },

  // Obtener cliente por ID
  async getById(id) {
    const sql = `
      SELECT 
        c.*,
        ct.name as client_type_name,
        ct.color as client_type_color
      FROM clients c
      JOIN client_types ct ON c.client_type_id = ct.id
      WHERE c.id = $1
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  // Obtener cliente por teléfono
  async getByPhone(phone) {
    const sql = `
      SELECT 
        c.*,
        ct.name as client_type_name,
        ct.color as client_type_color
      FROM clients c
      JOIN client_types ct ON c.client_type_id = ct.id
      WHERE c.phone = $1
    `;
    const result = await query(sql, [phone]);
    return result.rows[0];
  },

  // Obtener cliente por UUID
  async getByUuid(uuid) {
    const sql = `
      SELECT
        c.*,
        ct.name as client_type_name,
        ct.color as client_type_color
      FROM clients c
      JOIN client_types ct ON c.client_type_id = ct.id
      WHERE c.uuid = $1
    `;
    const result = await query(sql, [uuid]);
    return result.rows[0];
  },

  // Obtener cliente por código de 4 dígitos (para login rápido)
  async getByCode(code) {
    const sql = `
      SELECT
        c.*,
        ct.name as client_type_name,
        ct.color as client_type_color
      FROM clients c
      JOIN client_types ct ON c.client_type_id = ct.id
      WHERE c.client_code = $1 AND c.is_active = TRUE
    `;
    const result = await query(sql, [code]);
    return result.rows[0];
  },

  // Crear cliente
  async create(clientData) {
    const { name, email, phone, notes } = clientData;

    // Generar código único de 4 dígitos para el cliente
    const codeResult = await query(`SELECT generate_unique_client_code() as code`);
    const clientCode = codeResult.rows[0].code;

    const sql = `
      INSERT INTO clients (name, email, phone, notes, client_code)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const result = await query(sql, [name, email, phone, notes, clientCode]);
    const clientId = result.rows[0].id;

    // Retornar el cliente completo con el tipo de cliente
    return this.getById(clientId);
  },

  // Actualizar cliente
  async update(id, clientData) {
    const { name, email, phone, notes, client_type_id } = clientData;
    const sql = `
      UPDATE clients
      SET name = COALESCE($2, name),
          email = COALESCE($3, email),
          phone = COALESCE($4, phone),
          notes = COALESCE($5, notes),
          client_type_id = COALESCE($6, client_type_id),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id, name, email, phone, notes, client_type_id]);
    return result.rows[0];
  },

  // Actualizar estadísticas del cliente
  async updateStats(id, totalSpent = null, lastVisitDate = null) {
    const sql = `
      UPDATE clients
      SET total_visits = total_visits + 1,
          total_spent = COALESCE(total_spent, 0) + COALESCE($2, 0),
          last_visit_date = COALESCE($3, CURRENT_DATE),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id, totalSpent, lastVisitDate]);
    return result.rows[0];
  },

  // Obtener historial de citas del cliente
  async getAppointmentHistory(clientId, limit = 10) {
    const sql = `
      SELECT 
        a.*,
        s.name as service_name,
        s.price as service_price
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE a.client_id = $1
      ORDER BY a.appointment_date DESC, a.start_time DESC
      LIMIT $2
    `;
    const result = await query(sql, [clientId, limit]);
    return result.rows;
  },

  // Obtener membresías activas del cliente
  async getActiveMemberships(clientId) {
    const sql = `
      SELECT 
        cm.*,
        mt.name as membership_name,
        mt.total_services,
        (mt.total_services - cm.used_services) as remaining_services
      FROM client_memberships cm
      JOIN membership_types mt ON cm.membership_type_id = mt.id
      WHERE cm.client_id = $1
        AND cm.status = 'active'
        AND cm.expiration_date >= CURRENT_DATE
      ORDER BY cm.expiration_date ASC
    `;
    const result = await query(sql, [clientId]);
    return result.rows;
  },

  // Eliminar cliente (soft delete)
  async delete(id) {
    const sql = `UPDATE clients SET is_active = FALSE WHERE id = $1 RETURNING *`;
    const result = await query(sql, [id]);
    return result.rows[0];
  },
};

export default Client;

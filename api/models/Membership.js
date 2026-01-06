import { query, transaction } from '../config/database.js';

export const Membership = {
  // Obtener tipos de membresía
  async getTypes() {
    const sql = `
      SELECT 
        mt.*,
        ct.name as client_type_name,
        ct.color as client_type_color
      FROM membership_types mt
      JOIN client_types ct ON mt.client_type_id = ct.id
      WHERE mt.is_active = TRUE
      ORDER BY mt.display_order
    `;
    const result = await query(sql);
    return result.rows;
  },

  // Obtener tipo por ID
  async getTypeById(id) {
    const sql = `SELECT * FROM membership_types WHERE id = $1`;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  // Obtener membresías activas
  async getActive() {
    const sql = `SELECT * FROM v_active_memberships`;
    const result = await query(sql);
    return result.rows;
  },

  // Obtener membresías por cliente
  async getByClient(clientId) {
    const sql = `
      SELECT 
        cm.*,
        mt.name as membership_name,
        mt.total_services,
        mt.benefits,
        (cm.total_services - cm.used_services) as remaining_services
      FROM client_memberships cm
      JOIN membership_types mt ON cm.membership_type_id = mt.id
      WHERE cm.client_id = $1
      ORDER BY cm.purchase_date DESC
    `;
    const result = await query(sql, [clientId]);
    return result.rows;
  },

  // Obtener membresía por ID
  async getById(id) {
    const sql = `
      SELECT 
        cm.*,
        c.name as client_name,
        c.phone as client_phone,
        mt.name as membership_name,
        (cm.total_services - cm.used_services) as remaining_services
      FROM client_memberships cm
      JOIN clients c ON cm.client_id = c.id
      JOIN membership_types mt ON cm.membership_type_id = mt.id
      WHERE cm.id = $1
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  // Obtener membresía por UUID
  async getByUuid(uuid) {
    const sql = `
      SELECT 
        cm.*,
        c.name as client_name,
        mt.name as membership_name
      FROM client_memberships cm
      JOIN clients c ON cm.client_id = c.id
      JOIN membership_types mt ON cm.membership_type_id = mt.id
      WHERE cm.uuid = $1
    `;
    const result = await query(sql, [uuid]);
    return result.rows[0];
  },

  // Crear membresía
  async create(membershipData) {
    const {
      client_id,
      membership_type_id,
      purchase_date,
      payment_method,
      payment_amount,
      notes
    } = membershipData;

    // Obtener info del tipo de membresía
    const type = await this.getTypeById(membership_type_id);
    if (!type) throw new Error('Tipo de membresía no encontrado');

    // Las membresías ya no tienen fecha de vencimiento - expiran al usar todos los servicios
    const purchaseDate = new Date(purchase_date || Date.now());

    return transaction(async (client) => {
      // Crear membresía (sin fecha de vencimiento)
      const sql = `
        INSERT INTO client_memberships 
          (client_id, membership_type_id, total_services, purchase_date, expiration_date, 
           payment_method, payment_amount, notes)
        VALUES ($1, $2, $3, $4, NULL, $5, $6, $7)
        RETURNING *
      `;
      const result = await client.query(sql, [
        client_id,
        membership_type_id,
        type.total_services,
        purchase_date,
        payment_method,
        payment_amount,
        notes
      ]);

      const membership = result.rows[0];

      // Registrar transacción
      await client.query(
        `INSERT INTO transactions 
          (membership_purchase_id, client_id, type, description, amount, payment_method, transaction_date)
         VALUES ($1, $2, 'membership', $3, $4, $5, $6)`,
        [
          membership.id,
          client_id,
          `Compra de membresía: ${type.name}`,
          payment_amount,
          payment_method,
          purchase_date
        ]
      );

      return membership;
    });
  },

  // Activar membresía
  async activate(id, activatedBy) {
    const sql = `
      UPDATE client_memberships
      SET status = 'active',
          activation_date = CURRENT_DATE,
          activated_by = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id, activatedBy]);
    
    // Si se activa, actualizar el tipo de cliente
    if (result.rows[0]) {
      const membership = result.rows[0];
      const type = await this.getTypeById(membership.membership_type_id);
      await query(
        `UPDATE clients SET client_type_id = $1 WHERE id = $2`,
        [type.client_type_id, membership.client_id]
      );
    }

    return result.rows[0];
  },

  // Usar servicio de membresía
  async useService(membershipId, serviceId, serviceName, appointmentId = null) {
    return transaction(async (client) => {
      // Verificar que la membresía tenga servicios disponibles
      const membershipResult = await client.query(
        `SELECT * FROM client_memberships WHERE id = $1 AND status = 'active'`,
        [membershipId]
      );

      const membership = membershipResult.rows[0];
      if (!membership) throw new Error('Membresía no encontrada o no activa');
      if (membership.used_services >= membership.total_services) {
        throw new Error('No quedan servicios disponibles en esta membresía');
      }

      // Incrementar servicios usados
      await client.query(
        `UPDATE client_memberships SET used_services = used_services + 1 WHERE id = $1`,
        [membershipId]
      );

      // Registrar uso
      const usageResult = await client.query(
        `INSERT INTO membership_usage (membership_id, appointment_id, service_id, service_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [membershipId, appointmentId, serviceId, serviceName]
      );

      return usageResult.rows[0];
    });
  },

  // Obtener historial de uso
  async getUsageHistory(membershipId) {
    const sql = `
      SELECT 
        mu.*,
        s.name as service_name,
        s.price as service_price
      FROM membership_usage mu
      LEFT JOIN services s ON mu.service_id = s.id
      WHERE mu.membership_id = $1
      ORDER BY mu.used_at DESC
    `;
    const result = await query(sql, [membershipId]);
    return result.rows;
  },

  // Cancelar membresía
  async cancel(id) {
    const sql = `
      UPDATE client_memberships
      SET status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  // Actualizar membresías expiradas (job automático) - solo las que tienen fecha de vencimiento
  async expireOldMemberships() {
    const sql = `
      UPDATE client_memberships
      SET status = 'expired'
      WHERE status = 'active'
        AND expiration_date IS NOT NULL
        AND expiration_date < CURRENT_DATE
      RETURNING *
    `;
    const result = await query(sql);
    return result.rows;
  },
};

export default Membership;

import { query } from '../config/database.js';

export const Appointment = {
  // Obtener todas las citas con filtros
  async getAll(filters = {}) {
    let sql = `
      SELECT 
        a.*,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        ct.name as client_type,
        ct.color as client_color,
        s.name as service_name,
        s.duration_minutes,
        s.price as service_price
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN client_types ct ON c.client_type_id = ct.id
      JOIN services s ON a.service_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.date) {
      params.push(filters.date);
      sql += ` AND a.appointment_date = $${params.length}`;
    }

    if (filters.status) {
      params.push(filters.status);
      sql += ` AND a.status = $${params.length}`;
    }

    if (filters.clientId) {
      params.push(filters.clientId);
      sql += ` AND a.client_id = $${params.length}`;
    }

    if (filters.startDate && filters.endDate) {
      params.push(filters.startDate, filters.endDate);
      sql += ` AND a.appointment_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }

    sql += ` ORDER BY a.appointment_date, a.start_time`;

    const result = await query(sql, params);
    return result.rows;
  },

  // Obtener citas de hoy
  async getToday() {
    const sql = `SELECT * FROM v_today_appointments`;
    const result = await query(sql);
    return result.rows;
  },

  // Obtener cita por ID
  async getById(id) {
    const sql = `
      SELECT 
        a.*,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        s.name as service_name,
        s.duration_minutes,
        s.price as service_price
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN services s ON a.service_id = s.id
      WHERE a.id = $1
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  // Obtener cita por código de checkout (legacy - busca por checkout_code de cita)
  async getByCheckoutCode(code) {
    const sql = `
      SELECT 
        a.*,
        c.id as client_id,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        c.client_code,
        s.name as service_name,
        s.duration_minutes,
        s.price as service_price
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN services s ON a.service_id = s.id
      WHERE a.checkout_code = $1
      ORDER BY a.appointment_date DESC
      LIMIT 1
    `;
    const result = await query(sql, [code]);
    return result.rows[0];
  },

  // Obtener cita de hoy o próxima por código de cliente (busca hoy o futuro)
  async getByClientCode(clientCode) {
    const sql = `
      SELECT 
        a.*,
        c.id as client_id,
        c.name as client_name,
        c.phone as client_phone,
        c.email as client_email,
        c.client_code,
        s.name as service_name,
        s.duration_minutes,
        s.price as service_price
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN services s ON a.service_id = s.id
      WHERE c.client_code = $1
        AND a.status IN ('scheduled', 'confirmed', 'in_progress')
        AND a.appointment_date >= CURRENT_DATE
      ORDER BY a.appointment_date ASC, a.start_time ASC
      LIMIT 1
    `;
    const result = await query(sql, [clientCode]);
    return result.rows[0];
  },

  // Obtener cita por UUID
  async getByUuid(uuid) {
    const sql = `
      SELECT 
        a.*,
        c.name as client_name,
        c.phone as client_phone,
        s.name as service_name,
        s.duration_minutes
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN services s ON a.service_id = s.id
      WHERE a.uuid = $1
    `;
    const result = await query(sql, [uuid]);
    return result.rows[0];
  },

  // Verificar disponibilidad de un slot
  async checkAvailability(date, startTime, endTime, excludeId = null) {
    const sql = `SELECT check_slot_availability($1, $2, $3, $4) as available`;
    const result = await query(sql, [date, startTime, endTime, excludeId]);
    return result.rows[0].available;
  },

  // Obtener slots disponibles para un día y servicio
  async getAvailableSlots(date, serviceDuration) {
    // Obtener horarios del negocio
    const dayOfWeek = new Date(date).getDay();
    const hoursResult = await query(
      `SELECT * FROM business_hours WHERE day_of_week = $1 AND is_open = TRUE`,
      [dayOfWeek]
    );

    if (hoursResult.rows.length === 0) {
      return []; // Día cerrado
    }

    const businessHours = hoursResult.rows[0];

    // Obtener citas existentes
    const appointmentsResult = await query(
      `SELECT start_time, end_time FROM appointments 
       WHERE appointment_date = $1 AND status NOT IN ('cancelled', 'no_show')`,
      [date]
    );

    const bookedSlots = appointmentsResult.rows;

    // Generar slots disponibles
    const slots = [];
    const slotInterval = 30; // minutos
    let currentTime = this.timeToMinutes(businessHours.open_time);
    const closeTime = this.timeToMinutes(businessHours.close_time);
    const breakStart = businessHours.break_start ? this.timeToMinutes(businessHours.break_start) : null;
    const breakEnd = businessHours.break_end ? this.timeToMinutes(businessHours.break_end) : null;

    while (currentTime + serviceDuration <= closeTime) {
      // Saltar horario de descanso
      if (breakStart && breakEnd && currentTime >= breakStart && currentTime < breakEnd) {
        currentTime = breakEnd;
        continue;
      }

      const slotStart = this.minutesToTime(currentTime);
      const slotEnd = this.minutesToTime(currentTime + serviceDuration);

      // Verificar si el slot está disponible
      const isAvailable = !bookedSlots.some(booked => {
        const bookedStart = this.timeToMinutes(booked.start_time);
        const bookedEnd = this.timeToMinutes(booked.end_time);
        return (currentTime < bookedEnd && currentTime + serviceDuration > bookedStart);
      });

      if (isAvailable) {
        slots.push({
          start: slotStart,
          end: slotEnd,
          available: true
        });
      }

      currentTime += slotInterval;
    }

    return slots;
  },

  // Helper: Convertir tiempo a minutos
  timeToMinutes(time) {
    if (!time) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  },

  // Helper: Convertir minutos a tiempo
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  },

  // Crear cita
  async create(appointmentData) {
    const {
      client_id,
      service_id,
      appointment_date,
      start_time,
      end_time,
      notes,
      created_by,
      status,
      deposit_required,
      deposit_amount
    } = appointmentData;

    // Generar código de checkout
    let checkout_code;
    try {
      const codeResult = await query(`SELECT generate_checkout_code($1) as code`, [appointment_date]);
      checkout_code = codeResult.rows[0].code;
    } catch (e) {
      console.error('Error generating checkout code from DB:', e);
    }

    // Fallback generation if DB function fails or returns null
    if (!checkout_code) {
      checkout_code = Math.random().toString(36).substring(2, 6).toUpperCase(); // 4 chars random
      console.warn(`Generated fallback checkout code: ${checkout_code}`);
    }

    // Use provided status or default to 'scheduled'
    const appointmentStatus = status || 'scheduled';

    const sql = `
      INSERT INTO appointments 
        (client_id, service_id, appointment_date, start_time, end_time, checkout_code, notes, created_by, status, deposit_required, deposit_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const result = await query(sql, [
      client_id,
      service_id,
      appointment_date,
      start_time,
      end_time,
      checkout_code,
      notes,
      created_by || 'client',
      appointmentStatus,
      deposit_required || false,
      deposit_amount || 0
    ]);
    return result.rows[0];
  },

  // Marcar depósito como pagado
  async markDepositPaid(id) {
    const sql = `
      UPDATE appointments 
      SET deposit_paid = TRUE, 
          deposit_paid_at = CURRENT_TIMESTAMP,
          status = 'scheduled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  // Actualizar estado de cita
  async updateStatus(id, status, reason = null) {
    let sql = `UPDATE appointments SET status = $2, updated_at = CURRENT_TIMESTAMP`;
    const params = [id, status];

    if (status === 'cancelled' && reason) {
      sql += `, cancelled_at = CURRENT_TIMESTAMP, cancelled_reason = $3`;
      params.push(reason);
    }

    sql += ` WHERE id = $1 RETURNING *`;
    const result = await query(sql, params);
    return result.rows[0];
  },

  // Actualizar cita
  async update(id, appointmentData) {
    const { appointment_date, start_time, end_time, notes } = appointmentData;
    const sql = `
      UPDATE appointments
      SET appointment_date = COALESCE($2, appointment_date),
          start_time = COALESCE($3, start_time),
          end_time = COALESCE($4, end_time),
          notes = COALESCE($5, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id, appointment_date, start_time, end_time, notes]);
    return result.rows[0];
  },

  // Cancelar cita
  async cancel(id, reason) {
    return this.updateStatus(id, 'cancelled', reason);
  },

  // Confirmar cita (también actualiza nota de depósito)
  async confirm(id) {
    // Actualizar status y cambiar nota de "Pendiente de Depósito" a "Depósito Confirmado"
    const sql = `
      UPDATE appointments 
      SET status = 'confirmed',
          notes = REPLACE(COALESCE(notes, ''), 'Pendiente de Depósito $100', 'Depósito Confirmado ✓'),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sql, [id]);
    return result.rows[0];
  },

  // Marcar como no show
  async markNoShow(id) {
    return this.updateStatus(id, 'no_show');
  },

  // Completar cita
  async complete(id) {
    return this.updateStatus(id, 'completed');
  },
};

export default Appointment;

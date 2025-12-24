import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db, { transaction } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import emailService from '../services/emailService.js';
import whatsappService from '../services/whatsappService.js';

const router = express.Router();

// ============================
// AUTENTICACIÓN
// ============================

// POST /api/admin/login
router.post('/login', async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username y password requeridos' });
        }

        // Buscar usuario
        const result = await db.query(
            'SELECT * FROM admin_users WHERE username = $1 AND is_active = true',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const admin = result.rows[0];

        // Verificar contraseña
        const validPassword = await bcrypt.compare(password, admin.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Actualizar last_login
        await db.query(
            'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [admin.id]
        );

        // Generar token JWT
        const token = jwt.sign(
            {
                id: admin.id,
                username: admin.username,
                role: admin.role,
                name: admin.name
            },
            process.env.JWT_SECRET || 'braco_secret_key_change_in_production',
            { expiresIn: '8h' }
        );

        res.json({
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                name: admin.name,
                role: admin.role
            }
        });

    } catch (error) {
        next(error);
    }
});

// ============================
// DASHBOARD
// ============================

// GET /api/admin/dashboard
router.get('/dashboard', authenticateToken, async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Stats
        const appointmentsToday = await db.query(
            `SELECT COUNT(*) as count FROM appointments 
             WHERE appointment_date = $1 AND status NOT IN ('cancelled', 'no_show')`,
            [today]
        );

        const salesToday = await db.query(
            `SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
             WHERE DATE(created_at) = $1`,
            [today]
        );

        const activeMemberships = await db.query(
            `SELECT COUNT(*) as count FROM client_memberships 
             WHERE status = 'active' AND expiration_date >= CURRENT_DATE`
        );

        const totalClients = await db.query('SELECT COUNT(*) as count FROM clients');

        // Upcoming appointments (Scheduled/Confirmed from today onwards)
        const upcomingAppointments = await db.query(
            `SELECT a.*, c.name as client_name, c.phone as client_phone,
                    ct.color as client_color, s.name as service_name
             FROM appointments a
             JOIN clients c ON a.client_id = c.id
             JOIN client_types ct ON c.client_type_id = ct.id
             JOIN services s ON a.service_id = s.id
             WHERE a.appointment_date >= $1 
             AND a.status IN ('scheduled', 'confirmed')
             ORDER BY a.appointment_date ASC, a.start_time ASC LIMIT 10`,
            [today]
        );

        // Pending appointments (Need confirmation/deposit)
        const pendingAppointments = await db.query(
            `SELECT a.*, c.name as client_name, c.phone as client_phone,
                    s.name as service_name
             FROM appointments a
             JOIN clients c ON a.client_id = c.id
             JOIN services s ON a.service_id = s.id
             WHERE a.status = 'pending'
             ORDER BY a.appointment_date ASC, a.start_time ASC LIMIT 10`
        );

        // Recent transactions (Global last 10, not just today)
        const recentTransactions = await db.query(
            `SELECT t.*, c.name as client_name, t.payment_method
             FROM transactions t
             JOIN clients c ON t.client_id = c.id
             ORDER BY t.created_at DESC LIMIT 10`
        );

        res.json({
            stats: {
                appointments_today: parseInt(appointmentsToday.rows[0].count),
                sales_today: parseFloat(salesToday.rows[0].total),
                active_memberships: parseInt(activeMemberships.rows[0].count),
                total_clients: parseInt(totalClients.rows[0].count)
            },
            upcoming_appointments: upcomingAppointments.rows,
            pending_appointments: pendingAppointments.rows,
            recent_transactions: recentTransactions.rows
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/admin/birthdays?days=30
router.get('/birthdays', authenticateToken, async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const sql = `
                SELECT 
                    c.id,
                    c.name,
                    c.birthdate,
                    (c.birthdate + (EXTRACT(YEAR FROM AGE(NOW()))::int * INTERVAL '1 year'))::date AS next_birthday
                FROM clients c
                WHERE c.birthdate IS NOT NULL
                AND (c.birthdate + (EXTRACT(YEAR FROM AGE(NOW()))::int * INTERVAL '1 year'))::date
                    BETWEEN CURRENT_DATE AND CURRENT_DATE + $1 * INTERVAL '1 day'
                ORDER BY next_birthday ASC`;
        const result = await db.query(sql, [days]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// ============================
// CLIENTES CRUD
// ============================

// GET /api/admin/clients
router.get('/clients', authenticateToken, async (req, res, next) => {
    try {
        // Maintenance: Expire memberships and downgrade clients
        await db.query(`UPDATE client_memberships SET status = 'expired' WHERE status = 'active' AND expiration_date < CURRENT_DATE`);
        // Downgrade clients with no active membership to 'Recurrente' (ID 2) if they are currently Membership Types (3,4,5)
        await db.query(`
            UPDATE clients 
            SET client_type_id = 2 
            WHERE client_type_id IN (3, 4, 5) 
            AND NOT EXISTS (SELECT 1 FROM client_memberships WHERE client_id = clients.id AND status = 'active')
        `);

        const result = await db.query(`
            SELECT c.*, ct.name as client_type_name, ct.color as client_color,
                   CASE WHEN cm.id IS NOT NULL THEN true ELSE false END as has_active_membership,
                   cm.total_services - cm.used_services as remaining_services,
                   cm.total_services,
                   cm.expiration_date as membership_expiration,
                   mt.name as membership_type
            FROM clients c
            LEFT JOIN client_types ct ON c.client_type_id = ct.id
            LEFT JOIN client_memberships cm ON c.id = cm.client_id AND cm.status = 'active'
            LEFT JOIN membership_types mt ON cm.membership_type_id = mt.id
            ORDER BY c.name
        `);

        // Get total appointments per client
        const appointmentCounts = await db.query(`
            SELECT client_id, COUNT(*) as total_appointments
            FROM appointments
            GROUP BY client_id
        `);

        const appointmentMap = {};
        appointmentCounts.rows.forEach(row => {
            appointmentMap[row.client_id] = parseInt(row.total_appointments);
        });

        const clients = result.rows.map(c => ({
            ...c,
            total_appointments: appointmentMap[c.id] || 0
        }));

        res.json({ clients });

    } catch (error) {
        next(error);
    }
});

// GET /api/admin/clients/:id
router.get('/clients/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        const client = await db.query(
            `SELECT c.*, ct.name as client_type_name, ct.color as client_color
             FROM clients c
             LEFT JOIN client_types ct ON c.client_type_id = ct.id
             WHERE c.id = $1`,
            [id]
        );

        if (client.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json(client.rows[0]);

    } catch (error) {
        next(error);
    }
});

// GET /api/admin/clients/:id/history
router.get('/clients/:id/history', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        const appointments = await db.query(
            `SELECT a.*, s.name as service_name, s.price
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             WHERE a.client_id = $1
             ORDER BY a.appointment_date DESC, a.start_time DESC
             LIMIT 10`,
            [id]
        );

        const stats = await db.query(
            `SELECT 
                COUNT(*) as total_appointments,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_appointments,
                COALESCE(SUM(ch.total), 0) as total_spent
             FROM appointments a
             LEFT JOIN checkouts ch ON a.id = ch.appointment_id
             WHERE a.client_id = $1`,
            [id]
        );

        res.json({
            ...stats.rows[0],
            recent_appointments: appointments.rows
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/admin/clients
router.post('/clients', authenticateToken, async (req, res, next) => {
    try {
        const { name, phone, email, birthdate, notes } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'Nombre y teléfono requeridos' });
        }

        // Verificar teléfono único
        const existing = await db.query('SELECT id FROM clients WHERE phone = $1', [phone]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Ya existe un cliente con ese teléfono' });
        }

        const result = await db.query(
            `INSERT INTO clients (name, phone, email, birthdate, client_type_id, notes)
             VALUES ($1, $2, $3, $4, 1, $5)
             RETURNING *`,
            [name, phone, email || null, birthdate || null, notes || null]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// PUT /api/admin/clients/:id
router.put('/clients/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, phone, email, birthdate, notes } = req.body;

        const result = await db.query(
            `UPDATE clients 
             SET name = $2, phone = $3, email = $4, birthdate = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [id, name, phone, email, birthdate || null, notes || null]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// DELETE /api/admin/clients/:id
router.delete('/clients/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log(`[DELETE CLIENT] Starting deletion for client ${id}`);

        // Verificar que el cliente existe
        const clientCheck = await db.query('SELECT id FROM clients WHERE id = $1', [id]);
        if (clientCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        // Borrar en orden correcto para evitar FK violations
        // Primero las tablas que tienen FK a otras tablas intermedias
        try {
            await db.query('DELETE FROM membership_usage WHERE membership_id IN (SELECT id FROM client_memberships WHERE client_id = $1)', [id]);
        } catch (e) { console.log('[DELETE] membership_usage:', e.message); }

        try {
            await db.query('DELETE FROM checkouts WHERE appointment_id IN (SELECT id FROM appointments WHERE client_id = $1)', [id]);
        } catch (e) { console.log('[DELETE] checkouts via appts:', e.message); }

        try {
            await db.query('DELETE FROM calendar_mappings WHERE appointment_id IN (SELECT id FROM appointments WHERE client_id = $1)', [id]);
        } catch (e) { console.log('[DELETE] calendar_mappings:', e.message); }

        // Ahora las tablas con FK directo a clients
        try {
            await db.query('DELETE FROM client_memberships WHERE client_id = $1', [id]);
            console.log('[DELETE] client_memberships: OK');
        } catch (e) { console.log('[DELETE] client_memberships:', e.message); }

        try {
            await db.query('DELETE FROM appointments WHERE client_id = $1', [id]);
            console.log('[DELETE] appointments: OK');
        } catch (e) { console.log('[DELETE] appointments:', e.message); }

        try {
            await db.query('DELETE FROM transactions WHERE client_id = $1', [id]);
        } catch (e) { console.log('[DELETE] transactions:', e.message); }

        try {
            await db.query('DELETE FROM checkouts WHERE client_id = $1', [id]);
        } catch (e) { console.log('[DELETE] checkouts direct:', e.message); }

        // Finalmente borrar el cliente
        await db.query('DELETE FROM clients WHERE id = $1', [id]);
        console.log(`[DELETE CLIENT] Successfully deleted client ${id}`);

        res.json({ success: true, message: 'Cliente eliminado correctamente' });

    } catch (error) {
        console.error('[DELETE CLIENT] Final error:', error.message);
        res.status(400).json({ error: 'No se pudo eliminar el cliente: ' + error.message });
    }
});

// ============================
// APPOINTMENTS
// ============================

// GET /api/admin/appointments
router.get('/appointments', authenticateToken, async (req, res, next) => {
    try {
        const { date, start_date, end_date, status } = req.query;

        let query = `
            SELECT a.*, c.name as client_name, c.phone as client_phone,
                   ct.color as client_color, s.name as service_name, s.price as service_price,
                   s.duration_minutes as duration,
                   ch.payment_method, ch.total as checkout_total
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN client_types ct ON c.client_type_id = ct.id
            JOIN services s ON a.service_id = s.id
            LEFT JOIN checkouts ch ON a.id = ch.appointment_id
            WHERE 1=1
        `;
        const params = [];

        if (date) {
            params.push(date);
            query += ` AND a.appointment_date = $${params.length}`;
        }

        if (start_date) {
            params.push(start_date);
            query += ` AND a.appointment_date >= $${params.length}`;
        }

        if (end_date) {
            params.push(end_date);
            query += ` AND a.appointment_date <= $${params.length}`;
        }

        if (status) {
            params.push(status);
            query += ` AND a.status = $${params.length}`;
        }

        query += ' ORDER BY a.appointment_date DESC, a.start_time';

        const result = await db.query(query, params);
        res.json(result.rows);

    } catch (error) {
        next(error);
    }
});

// GET /api/admin/appointments/:id - Obtener una cita específica
router.get('/appointments/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            SELECT a.*, c.name as client_name, c.phone as client_phone,
                   ct.color as client_color, s.name as service_name, s.price as service_price,
                   s.duration_minutes as duration
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN client_types ct ON c.client_type_id = ct.id
            JOIN services s ON a.service_id = s.id
            WHERE a.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        next(error);
    }
});

// POST /api/admin/appointments - Crear nueva cita
router.post('/appointments', authenticateToken, async (req, res, next) => {
    try {
        const { client_id, service_id, appointment_date, start_time, notes } = req.body;
        let { end_time } = req.body;

        // Validaciones
        if (!client_id || !service_id || !appointment_date || !start_time) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Obtener información del servicio para calcular end_time
        const serviceResult = await db.query('SELECT * FROM services WHERE id = $1', [service_id]);
        if (serviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }
        const service = serviceResult.rows[0];

        // Obtener información del cliente para el email
        const clientResult = await db.query('SELECT * FROM clients WHERE id = $1', [client_id]);
        if (clientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        const client = clientResult.rows[0];

        // Calcular end_time si no se proporciona
        if (!end_time) {
            const [hours, minutes] = start_time.split(':').map(Number);
            const startMinutes = hours * 60 + minutes;
            const endMinutes = startMinutes + service.duration_minutes;
            const endHours = Math.floor(endMinutes / 60);
            const endMins = endMinutes % 60;
            end_time = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
        }

        // ============================================
        // VALIDACIÓN: Prevenir citas duplicadas
        // ============================================
        const duplicateCheck = await db.query(`
            SELECT id FROM appointments 
            WHERE client_id = $1 
              AND appointment_date = $2 
              AND start_time = $3
              AND status NOT IN ('cancelled', 'no_show')
        `, [client_id, appointment_date, start_time]);

        if (duplicateCheck.rows.length > 0) {
            console.warn(`[ADMIN] Duplicate appointment blocked for client ${client_id} on ${appointment_date} at ${start_time}`);
            return res.status(409).json({
                error: 'Ya existe una cita para este cliente en la misma fecha y hora',
                existing_id: duplicateCheck.rows[0].id
            });
        }

        // Generar código de checkout
        let checkout_code;
        try {
            const codeResult = await db.query(`SELECT generate_checkout_code($1) as code`, [appointment_date]);
            checkout_code = codeResult.rows[0].code;
        } catch (e) {
            console.error('Error generating checkout code from DB:', e);
        }

        // Fallback generation if DB function fails or returns null
        if (!checkout_code) {
            checkout_code = Math.random().toString(36).substring(2, 6).toUpperCase();
            console.warn(`[ADMIN] Generated fallback checkout code: ${checkout_code}`);
        }

        // Crear la cita CON el checkout_code
        const result = await db.query(`
            INSERT INTO appointments (client_id, service_id, appointment_date, start_time, end_time, notes, status, checkout_code, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7, 'admin')
            RETURNING *
        `, [client_id, service_id, appointment_date, start_time, end_time, notes || null, checkout_code]);

        const appointment = result.rows[0];

        // Enviar email de confirmación si el cliente tiene email
        if (client.email) {
            try {
                const dateObj = new Date(appointment_date + 'T12:00:00');
                const formattedDate = dateObj.toLocaleDateString('es-MX', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                });

                // Import email service dynamically to avoid circular dependencies
                const emailService = (await import('../services/emailService.js')).default;

                const emailRes = await emailService.sendBookingConfirmation({
                    email: client.email,
                    name: client.name,
                    service: service.name,
                    date: formattedDate,
                    time: start_time,
                    code: checkout_code
                });

                if (emailRes.success) {
                    console.log(`[ADMIN] Confirmation email sent to ${client.email}, ID: ${emailRes.id}`);
                } else {
                    console.error(`[ADMIN] Email failed: ${emailRes.error}`);
                }
            } catch (emailError) {
                console.error('[ADMIN] Error sending confirmation email:', emailError);
            }
        } else {
            console.warn(`[ADMIN] No email for client ${client.name}, skipping confirmation.`);
        }

        // Enviar WhatsApp de confirmación si el cliente tiene teléfono y WhatsApp habilitado
        if (client.phone && client.whatsapp_enabled !== false) {
            try {
                const dateObj = new Date(appointment_date + 'T12:00:00');
                const formattedDate = dateObj.toLocaleDateString('es-MX', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                });

                const whatsappRes = await whatsappService.sendWhatsAppBookingConfirmation({
                    phone: client.phone,
                    name: client.name,
                    service: service.name,
                    date: formattedDate,
                    time: start_time,
                    code: checkout_code
                });

                if (whatsappRes.success) {
                    console.log(`[ADMIN] WhatsApp sent to ${client.name}: ${whatsappRes.id}`);
                } else {
                    console.error(`[ADMIN] WhatsApp failed: ${whatsappRes.error}`);
                }
            } catch (whatsappError) {
                console.error('[ADMIN] Error sending WhatsApp:', whatsappError);
            }
        } else {
            console.warn(`[ADMIN] No phone or WhatsApp disabled for ${client.name}, skipping WhatsApp.`);
        }

        // Sincronizar con Google Calendar
        try {
            const googleCalendar = (await import('../services/googleCalendarService.js'));
            const appointmentData = {
                ...appointment,
                client_name: client.name,
                client_phone: client.phone,
                service_name: service.name
            };
            await googleCalendar.createEvent(appointmentData);
            console.log(`[ADMIN] Synced to Google Calendar: appointment ${appointment.id}`);
        } catch (gcalError) {
            console.error('[ADMIN] Google Calendar sync error:', gcalError.message);
            // Continue even if sync fails
        }

        // Obtener la cita completa con información relacionada
        const fullAppointment = await db.query(`
            SELECT a.*, c.name as client_name, c.phone as client_phone,
                   ct.color as client_color, s.name as service_name, s.price as service_price,
                   s.duration_minutes as duration
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN client_types ct ON c.client_type_id = ct.id
            JOIN services s ON a.service_id = s.id
            WHERE a.id = $1
        `, [appointment.id]);

        res.status(201).json({
            success: true,
            message: 'Cita creada exitosamente',
            data: fullAppointment.rows[0]
        });

    } catch (error) {
        next(error);
    }
});

// PUT /api/admin/appointments/:id/status
router.put('/appointments/:id/status', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const result = await db.query(
            `UPDATE appointments SET status = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING *`,
            [id, status]
        );

        res.json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// POST /api/admin/appointments/:id/resend-whatsapp - Reenviar WhatsApp de confirmación
router.post('/appointments/:id/resend-whatsapp', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Obtener cita con datos del cliente y servicio
        const result = await db.query(`
            SELECT a.*, c.name as client_name, c.phone as client_phone, c.whatsapp_enabled,
                   s.name as service_name
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN services s ON a.service_id = s.id
            WHERE a.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cita no encontrada' });
        }

        const appointment = result.rows[0];

        // Verificar que el cliente tenga teléfono y WhatsApp habilitado
        if (!appointment.client_phone) {
            return res.status(400).json({ success: false, error: 'El cliente no tiene número de teléfono registrado' });
        }

        if (appointment.whatsapp_enabled === false) {
            return res.status(400).json({ success: false, error: 'El cliente tiene WhatsApp deshabilitado' });
        }

        // Formatear fecha
        const dateObj = new Date(appointment.appointment_date + 'T12:00:00');
        const formattedDate = dateObj.toLocaleDateString('es-MX', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });

        // Enviar WhatsApp
        const whatsappRes = await whatsappService.sendWhatsAppBookingConfirmation({
            phone: appointment.client_phone,
            name: appointment.client_name,
            service: appointment.service_name,
            date: formattedDate,
            time: appointment.start_time.slice(0, 5),
            code: appointment.checkout_code || '----'
        });

        if (whatsappRes.success) {
            console.log(`[ADMIN] WhatsApp reenviado a ${appointment.client_name}: ${whatsappRes.id}`);
            res.json({
                success: true,
                message: `WhatsApp enviado a ${appointment.client_name}`,
                sid: whatsappRes.id
            });
        } else {
            console.error(`[ADMIN] Error reenviando WhatsApp:`, whatsappRes.error);
            res.status(500).json({
                success: false,
                error: whatsappRes.error || 'Error al enviar WhatsApp'
            });
        }

    } catch (error) {
        console.error('[ADMIN] Error en resend-whatsapp:', error);
        next(error);
    }
});

// ============================
// MEMBRESÍAS
// ============================

// GET /api/admin/membership-types
router.get('/membership-types', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM membership_types ORDER BY price');
        res.json({ types: result.rows });
    } catch (error) {
        next(error);
    }
});

// GET /api/admin/memberships
router.get('/memberships', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query(`
            SELECT cm.*, c.name as client_name, c.phone as client_phone,
                   mt.name as membership_type, mt.price,
                   cm.total_services - cm.used_services as remaining_services,
                   cm.folio_number
            FROM client_memberships cm
            JOIN clients c ON cm.client_id = c.id
            JOIN membership_types mt ON cm.membership_type_id = mt.id
            ORDER BY cm.created_at DESC
        `);

        res.json({ memberships: result.rows });

    } catch (error) {
        next(error);
    }
});

// GET /api/admin/memberships/:id
router.get('/memberships/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            SELECT cm.*, c.name as client_name, c.phone as client_phone,
                   mt.name as type_name, mt.price as type_price,
                   cm.total_services - cm.used_services as remaining_services,
                   cm.activation_date as start_date,
                   cm.expiration_date as end_date,
                   cm.folio_number
            FROM client_memberships cm
            JOIN clients c ON cm.client_id = c.id
            JOIN membership_types mt ON cm.membership_type_id = mt.id
            WHERE cm.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Membresía no encontrada' });
        }

        // Get payment history
        const payments = await db.query(`
            SELECT amount, transaction_date as payment_date, payment_method
            FROM transactions
            WHERE client_id = $1 AND type = 'membership'
            ORDER BY transaction_date DESC
        `, [result.rows[0].client_id]);

        // Get usage history
        const usage = await db.query(`
            SELECT mu.*
            FROM membership_usage mu
            WHERE mu.membership_id = $1
            ORDER BY mu.used_at DESC
        `, [id]);

        const membership = {
            ...result.rows[0],
            payment_history: payments.rows,
            usage_history: usage.rows
        };

        res.json(membership);

    } catch (error) {
        next(error);
    }
});

// POST /api/admin/memberships
router.post('/memberships', authenticateToken, async (req, res, next) => {
    try {
        const { client_id, membership_type_id, payment_method, folio_number } = req.body;

        // Validaciones
        if (!client_id || !membership_type_id || !payment_method) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }

        // Get membership type
        const typeResult = await db.query(
            'SELECT * FROM membership_types WHERE id = $1',
            [membership_type_id]
        );

        if (typeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tipo de membresía no encontrado' });
        }

        const membershipType = typeResult.rows[0];

        // Validar Folio (obligatorio para Golden Cards)
        if (!folio_number || folio_number.trim() === '') {
            return res.status(400).json({ error: 'El folio de la tarjeta es obligatorio' });
        }

        // Check if folio already exists FOR THIS MEMBERSHIP TYPE
        const existingFolio = await db.query(
            'SELECT id FROM client_memberships WHERE folio_number = $1 AND membership_type_id = $2 AND status != \'cancelled\'',
            [folio_number, membership_type_id]
        );

        if (existingFolio.rows.length > 0) {
            return res.status(409).json({ error: 'Este folio ya está registrado para este tipo de membresía' });
        }

        // Check existing active membership for THIS TYPE
        // Ahora permitimos múltiples membresías activas si son de diferente tipo (ej: Corte y NeoCapilar)
        const existing = await db.query(
            `SELECT id FROM client_memberships 
             WHERE client_id = $1 AND membership_type_id = $2 AND status = 'active'`,
            [client_id, membership_type_id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'El cliente ya tiene una membresía de este tipo activa' });
        }

        // Calculate expiration date
        const purchaseDate = new Date();
        const expirationDate = new Date(purchaseDate);
        expirationDate.setDate(expirationDate.getDate() + membershipType.validity_days);

        // Map payment methods to English if needed (safe fallback)
        const methodMap = {
            'efectivo': 'cash',
            'tarjeta': 'card',
            'transferencia': 'transfer'
        };
        const dbPaymentMethod = methodMap[payment_method.toLowerCase()] || payment_method;

        // Execute in transaction
        const result = await transaction(async (client) => {
            // Create membership
            const res = await client.query(
                `INSERT INTO client_memberships 
                 (client_id, membership_type_id, status, total_services, used_services,
                  purchase_date, activation_date, expiration_date, payment_method, payment_amount, folio_number, uuid)
                 VALUES ($1, $2, 'active', $3, 0, $4, $4, $5, $6, $7, $8, gen_random_uuid())
                 RETURNING *, (SELECT name FROM membership_types WHERE id = $2) as type_name`,
                [
                    client_id,
                    membership_type_id,
                    membershipType.total_services,
                    purchaseDate.toISOString().split('T')[0],
                    expirationDate.toISOString().split('T')[0],
                    dbPaymentMethod,
                    membershipType.price,
                    folio_number
                ]
            );

            // Update Client Type logic
            // Use the client_type_id defined in the membership_types table
            let newTypeId = membershipType.client_type_id;

            // Ensure we don't downgrade a client if they are already a higher level (optional but good practice)
            // But here we might want to strictly set it to the membership level. 
            // Let's assume we update to the new level.

            if (newTypeId > 1) {
                await client.query('UPDATE clients SET client_type_id = $1 WHERE id = $2', [newTypeId, client_id]);
            }

            // Record transaction with membership_purchase_id for proper tracking
            await client.query(
                `INSERT INTO transactions (membership_purchase_id, client_id, type, amount, description, payment_method, transaction_date)
                 VALUES ($1, $2, 'membership', $3, $4, $5, CURRENT_DATE)`,
                [res.rows[0].id, client_id, membershipType.price, `Membresía ${membershipType.name}`, dbPaymentMethod]
            );

            return res;
        });

        // ==========================================
        // ENVIAR CORREO DE BIENVENIDA
        // ==========================================
        try {
            // Get client details for email
            const clientResult = await db.query('SELECT name, email FROM clients WHERE id = $1', [client_id]);
            const client = clientResult.rows[0];

            if (client && client.email) {
                // Configurar texto de expiración y estilo
                const isBlackCard = membershipType.name.toLowerCase().includes('black');
                let expirationText;

                if (isBlackCard) {
                    expirationText = 'Sin fecha de vencimiento';
                } else {
                    expirationText = `Válido hasta ${expirationDate.toLocaleDateString('es-MX', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}`;
                }

                // URL corregida
                const baseUrl = process.env.PUBLIC_URL || 'https://braco-s-barberia-production.up.railway.app';
                const cardUrl = `${baseUrl}/tarjeta.html?id=${result.rows[0].uuid}`;

                await emailService.sendMembershipWelcome({
                    email: client.email,
                    name: client.name,
                    membershipName: membershipType.name,
                    totalServices: membershipType.total_services,
                    expirationDate: expirationText, // Enviamos el texto formateado
                    cardUrl: cardUrl,
                    isBlackCard: isBlackCard // Flag para elegir template
                });
                console.log(`Correo de membresía enviado a ${client.email}`);
            }
        } catch (emailError) {
            console.error('Error enviando correo de membresía:', emailError);
            // No fallamos la request si el correo falla, pero lo logueamos
        }

        // ==========================================
        // ENVIAR WHATSAPP DE BIENVENIDA
        // ==========================================
        try {
            // Validar si tenemos teléfono
            const clientPhone = await db.query('SELECT phone, whatsapp_enabled, name FROM clients WHERE id = $1', [client_id]);
            if (clientPhone.rows.length > 0) {
                const cData = clientPhone.rows[0];

                if (cData.phone && cData.whatsapp_enabled !== false) {
                    const cleanDate = new Date(mem.expiration_date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

                    // Asegurar que importamos whatsappService arriba
                    await whatsappService.sendMembershipWelcome({
                        phone: cData.phone,
                        name: cData.name,
                        membershipName: membershipType.name,
                        expiryDate: cleanDate,
                        cardUrl: cardUrl // URL generada previamente para el email
                    });
                    console.log(`[MEMBERSHIP] WhatsApp enviado a ${cData.name}`);
                }
            }
        } catch (waError) {
            console.error('[MEMBERSHIP] Error enviando WhatsApp:', waError);
        }

        res.status(201).json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// PUT /api/admin/memberships/:id/cancel
router.put('/memberships/:id/cancel', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            UPDATE client_memberships 
            SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND status = 'active'
            RETURNING *
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Membresía no encontrada o ya cancelada' });
        }

        res.json({ success: true, message: 'Membresía cancelada', data: result.rows[0] });

    } catch (error) {
        next(error);
    }
});

// GET /api/admin/memberships/export
router.get('/memberships/export', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query(`
            SELECT cm.*, c.name as client_name, mt.name as membership_type 
            FROM client_memberships cm
            JOIN clients c ON cm.client_id = c.id
            JOIN membership_types mt ON cm.membership_type_id = mt.id
            ORDER BY cm.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// ============================
// SERVICIOS
// ============================

// GET /api/admin/service-categories
router.get('/service-categories', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM service_categories ORDER BY display_order');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// GET /api/admin/services
router.get('/services', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query(`
            SELECT s.*, sc.name as category_name
            FROM services s
            LEFT JOIN service_categories sc ON s.category_id = sc.id
            ORDER BY sc.display_order, s.display_order
        `);

        res.json(result.rows);

    } catch (error) {
        next(error);
    }
});

// POST /api/admin/services
router.post('/services', authenticateToken, async (req, res, next) => {
    try {
        const { name, description, duration_minutes, price, category_id, is_active } = req.body;

        const result = await db.query(
            `INSERT INTO services (name, description, duration_minutes, price, category_id, is_active)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [name, description, duration_minutes, price, category_id, is_active ?? true]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// PUT /api/admin/services/:id
router.put('/services/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, duration_minutes, price, category_id, is_active } = req.body;

        const result = await db.query(
            `UPDATE services 
             SET name = $2, description = $3, duration_minutes = $4, price = $5, 
                 category_id = $6, is_active = $7
             WHERE id = $1 RETURNING *`,
            [id, name, description, duration_minutes, price, category_id, is_active]
        );

        res.json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// DELETE /api/admin/services/:id
router.delete('/services/:id', authenticateToken, async (req, res, next) => {
    try {
        await db.query('UPDATE services SET is_active = false WHERE id = $1', [req.params.id]);
        res.json({ success: true });

    } catch (error) {
        next(error);
    }
});

// ============================
// PRODUCTOS
// ============================

// GET /api/admin/products
router.get('/products', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM products ORDER BY name');
        res.json(result.rows);

    } catch (error) {
        next(error);
    }
});

// POST /api/admin/products
router.post('/products', authenticateToken, async (req, res, next) => {
    try {
        const { name, description, price, stock, is_active, image_url } = req.body;

        const result = await db.query(
            `INSERT INTO products (name, description, price, stock, is_active, image_url)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [name, description, price, stock || 0, is_active ?? true, image_url || null]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// PUT /api/admin/products/:id
router.put('/products/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock, is_active, image_url } = req.body;

        const result = await db.query(
            `UPDATE products 
             SET name = $2, description = $3, price = $4, stock = $5, is_active = $6, image_url = $7
             WHERE id = $1 RETURNING *`,
            [id, name, description, price, stock, is_active, image_url || null]
        );

        res.json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// ============================
// REPORTES
// ============================

// GET /api/admin/reports/sales
router.get('/reports/sales', authenticateToken, async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;

        // Daily sales
        const dailySales = await db.query(
            `SELECT transaction_date as date, 
                    SUM(amount) as total,
                    COUNT(*) as transactions
             FROM transactions
             WHERE transaction_date BETWEEN $1 AND $2
             GROUP BY transaction_date
             ORDER BY date`,
            [start_date || '2024-01-01', end_date || new Date().toISOString().split('T')[0]]
        );

        // Sales by service (Corrected to reflect actual revenue)
        const servicesSales = await db.query(
            `SELECT s.name, 
                    COUNT(*) as count, 
                    COALESCE(SUM(ch.service_cost), 0) as total,
                    COUNT(CASE WHEN ch.used_membership = true THEN 1 END) as membership_usage_count
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             LEFT JOIN checkouts ch ON a.id = ch.appointment_id
             WHERE a.status = 'completed'
             AND a.appointment_date BETWEEN $1 AND $2
             GROUP BY s.id, s.name
             ORDER BY total DESC`,
            [start_date || '2024-01-01', end_date || new Date().toISOString().split('T')[0]]
        );

        // Membership sales
        const membershipSales = await db.query(
            `SELECT 'Membresía ' || mt.name as name, 
                    COUNT(*) as count, 
                    SUM(cm.payment_amount) as total,
                    0 as membership_usage_count
             FROM client_memberships cm
             JOIN membership_types mt ON cm.membership_type_id = mt.id
             WHERE cm.purchase_date BETWEEN $1 AND $2
             GROUP BY mt.name
             ORDER BY total DESC`,
            [start_date || '2024-01-01', end_date || new Date().toISOString().split('T')[0]]
        );

        // Combine and sort
        const combinedSales = [...servicesSales.rows, ...membershipSales.rows].sort((a, b) => parseFloat(b.total) - parseFloat(a.total));

        // Totals
        const totals = await db.query(
            `SELECT 
                SUM(amount) as total_revenue,
                COUNT(*) as total_transactions,
                AVG(amount) as avg_ticket
             FROM transactions
             WHERE transaction_date BETWEEN $1 AND $2`,
            [start_date || '2024-01-01', end_date || new Date().toISOString().split('T')[0]]
        );

        res.json({
            daily_sales: dailySales.rows,
            services_sales: combinedSales,
            totals: totals.rows[0]
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/admin/reports/revenue - Reporte de ingresos reales (cash flow)
router.get('/reports/revenue', authenticateToken, async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;
        const startDate = start_date || '2024-01-01';
        const endDate = end_date || new Date().toISOString().split('T')[0];

        // Ingresos por día y tipo
        const dailyRevenue = await db.query(`
            SELECT
                transaction_date as date,
                SUM(CASE WHEN type = 'membership' THEN amount ELSE 0 END) as membership_sales,
                SUM(CASE WHEN type = 'service' THEN amount ELSE 0 END) as service_sales,
                SUM(CASE WHEN type = 'product' THEN amount ELSE 0 END) as product_sales,
                SUM(amount) as total_revenue,
                COUNT(*) as transaction_count
            FROM transactions
            WHERE transaction_date BETWEEN $1 AND $2
            GROUP BY transaction_date
            ORDER BY date
        `, [startDate, endDate]);

        // Totales por tipo de transacción
        const revenueByType = await db.query(`
            SELECT
                type,
                SUM(amount) as total,
                COUNT(*) as count,
                AVG(amount) as average
            FROM transactions
            WHERE transaction_date BETWEEN $1 AND $2
            GROUP BY type
            ORDER BY total DESC
        `, [startDate, endDate]);

        // Totales generales
        const totals = await db.query(`
            SELECT
                SUM(amount) as total_revenue,
                COUNT(*) as total_transactions,
                AVG(amount) as avg_transaction,
                SUM(CASE WHEN type = 'membership' THEN amount ELSE 0 END) as total_memberships,
                SUM(CASE WHEN type = 'service' THEN amount ELSE 0 END) as total_services,
                SUM(CASE WHEN type = 'product' THEN amount ELSE 0 END) as total_products
            FROM transactions
            WHERE transaction_date BETWEEN $1 AND $2
        `, [startDate, endDate]);

        // Métodos de pago
        const paymentMethods = await db.query(`
            SELECT
                payment_method,
                SUM(amount) as total,
                COUNT(*) as count
            FROM transactions
            WHERE transaction_date BETWEEN $1 AND $2
            GROUP BY payment_method
            ORDER BY total DESC
        `, [startDate, endDate]);

        // Detailed Transactions for Export
        const detailedTransactions = await db.query(`
            SELECT 
                t.transaction_date,
                t.type,
                t.description,
                t.payment_method,
                t.amount,
                c.name as client_name
            FROM transactions t
            LEFT JOIN clients c ON t.client_id = c.id
            WHERE t.transaction_date BETWEEN $1 AND $2
            ORDER BY t.transaction_date DESC, t.created_at DESC
        `, [startDate, endDate]);

        res.json({
            daily_revenue: dailyRevenue.rows,
            revenue_by_type: revenueByType.rows,
            payment_methods: paymentMethods.rows,
            detailed_transactions: detailedTransactions.rows,
            totals: totals.rows[0]
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/admin/reports/services-provided - Reporte de servicios prestados
router.get('/reports/services-provided', authenticateToken, async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;
        const startDate = start_date || '2024-01-01';
        const endDate = end_date || new Date().toISOString().split('T')[0];

        // Servicios prestados por tipo (pagados vs membresía)
        const servicesBreakdown = await db.query(`
            SELECT
                s.id,
                s.name,
                s.price as standard_price,

                -- Servicios PAGADOS
                COUNT(a.id) FILTER (WHERE ch.used_membership = false) as paid_services_count,
                COALESCE(SUM(ch.service_cost) FILTER (WHERE ch.used_membership = false), 0) as paid_services_revenue,

                -- Servicios con MEMBRESÍA (valor prestado, NO es ingreso nuevo)
                COUNT(a.id) FILTER (WHERE ch.used_membership = true) as membership_services_count,
                COALESCE(SUM(mu.service_value), 0) as membership_services_value,
                COALESCE(SUM(mu.stamps_used), 0) as total_stamps_used,

                -- Totales
                COUNT(a.id) as total_services_provided,
                COALESCE(SUM(ch.service_cost) FILTER (WHERE ch.used_membership = false), 0) +
                COALESCE(SUM(mu.service_value), 0) as total_value_provided

            FROM services s
            LEFT JOIN appointments a ON a.service_id = s.id AND a.status = 'completed'
            LEFT JOIN checkouts ch ON ch.appointment_id = a.id
            LEFT JOIN membership_usage mu ON mu.appointment_id = a.id
            WHERE a.appointment_date BETWEEN $1 AND $2
            GROUP BY s.id, s.name, s.price
            HAVING COUNT(a.id) > 0
            ORDER BY total_services_provided DESC
        `, [startDate, endDate]);

        // Resumen general
        const summary = await db.query(`
            SELECT
                -- Servicios pagados
                COUNT(a.id) FILTER (WHERE ch.used_membership = false) as total_paid_services,
                COALESCE(SUM(ch.service_cost) FILTER (WHERE ch.used_membership = false), 0) as total_paid_revenue,

                -- Servicios con membresía
                COUNT(a.id) FILTER (WHERE ch.used_membership = true) as total_membership_services,
                COALESCE(SUM(mu.service_value), 0) as total_membership_value,

                -- Totales
                COUNT(a.id) as total_services_provided

            FROM appointments a
            LEFT JOIN checkouts ch ON ch.appointment_id = a.id
            LEFT JOIN membership_usage mu ON mu.appointment_id = a.id
            WHERE a.status = 'completed'
            AND a.appointment_date BETWEEN $1 AND $2
        `, [startDate, endDate]);

        res.json({
            services_breakdown: servicesBreakdown.rows,
            summary: summary.rows[0]
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/admin/reports/membership-roi - Reporte de ROI de membresías
router.get('/reports/membership-roi', authenticateToken, async (req, res, next) => {
    try {
        const { start_date, end_date, status } = req.query;
        const startDate = start_date || '2024-01-01';
        const endDate = end_date || new Date().toISOString().split('T')[0];

        // ROI por membresía individual
        const membershipRoi = await db.query(`
            SELECT
                cm.id,
                cm.uuid,
                c.name as client_name,
                c.phone as client_phone,
                mt.name as membership_type,

                -- Datos financieros
                cm.payment_amount as amount_paid,
                COALESCE(SUM(mu.service_value), 0) as value_delivered,
                cm.payment_amount - COALESCE(SUM(mu.service_value), 0) as remaining_value,

                -- ROI para el cliente (% de ahorro)
                CASE
                    WHEN cm.payment_amount > 0 THEN
                        ROUND((COALESCE(SUM(mu.service_value), 0) / cm.payment_amount - 1) * 100, 2)
                    ELSE 0
                END as client_roi_percentage,

                -- Uso de servicios
                cm.used_services as stamps_used,
                cm.total_services as stamps_total,
                cm.total_services - cm.used_services as stamps_remaining,
                ROUND((cm.used_services::decimal / cm.total_services) * 100, 2) as usage_percentage,

                -- Fechas y estado
                cm.purchase_date,
                cm.activation_date,
                cm.expiration_date,
                cm.status,
                CASE
                    WHEN cm.status = 'active' AND cm.expiration_date < CURRENT_DATE THEN 'expired'
                    ELSE cm.status
                END as actual_status,

                -- Métrica de negocio: ¿Fue rentable?
                CASE
                    WHEN COALESCE(SUM(mu.service_value), 0) < cm.payment_amount THEN 'profitable'
                    WHEN COALESCE(SUM(mu.service_value), 0) = cm.payment_amount THEN 'break_even'
                    ELSE 'loss'
                END as business_outcome

            FROM client_memberships cm
            JOIN clients c ON c.id = cm.client_id
            JOIN membership_types mt ON mt.id = cm.membership_type_id
            LEFT JOIN membership_usage mu ON mu.membership_id = cm.id
            WHERE DATE(cm.purchase_date) BETWEEN $1 AND $2
            ${status ? 'AND cm.status = $3' : ''}
            GROUP BY cm.id, c.name, c.phone, mt.name, cm.payment_amount,
                     cm.used_services, cm.total_services, cm.purchase_date,
                     cm.activation_date, cm.expiration_date, cm.status
            ORDER BY cm.purchase_date DESC
        `, status ? [startDate, endDate, status] : [startDate, endDate]);

        // Resumen general de ROI
        const roiSummary = await db.query(`
            SELECT
                COUNT(cm.id) as total_memberships,
                SUM(cm.payment_amount) as total_revenue,
                COALESCE(SUM(mu.total_value), 0) as total_value_delivered,
                SUM(cm.payment_amount) - COALESCE(SUM(mu.total_value), 0) as net_difference,

                -- Promedio de uso
                AVG(cm.used_services::decimal / cm.total_services * 100) as avg_usage_percentage,

                -- Conteo por outcome
                COUNT(*) FILTER (WHERE mu.total_value < cm.payment_amount) as profitable_count,
                COUNT(*) FILTER (WHERE mu.total_value >= cm.payment_amount) as loss_or_breakeven_count,

                -- Por estado
                COUNT(*) FILTER (WHERE cm.status = 'active') as active_count,
                COUNT(*) FILTER (WHERE cm.status = 'expired') as expired_count,
                COUNT(*) FILTER (WHERE cm.status = 'cancelled') as cancelled_count

            FROM client_memberships cm
            LEFT JOIN (
                SELECT membership_id, SUM(service_value) as total_value
                FROM membership_usage
                GROUP BY membership_id
            ) mu ON mu.membership_id = cm.id
            WHERE DATE(cm.purchase_date) BETWEEN $1 AND $2
        `, [startDate, endDate]);

        // Top clientes que más usan sus membresías
        const topUsers = await db.query(`
            SELECT
                c.name as client_name,
                mt.name as membership_type,
                cm.used_services as stamps_used,
                cm.total_services as stamps_total,
                COALESCE(SUM(mu.service_value), 0) as value_extracted,
                cm.payment_amount as amount_paid,
                ROUND((COALESCE(SUM(mu.service_value), 0) / cm.payment_amount - 1) * 100, 2) as roi_percentage
            FROM client_memberships cm
            JOIN clients c ON c.id = cm.client_id
            JOIN membership_types mt ON mt.id = cm.membership_type_id
            LEFT JOIN membership_usage mu ON mu.membership_id = cm.id
            WHERE DATE(cm.purchase_date) BETWEEN $1 AND $2
            GROUP BY c.name, mt.name, cm.used_services, cm.total_services, cm.payment_amount
            HAVING SUM(mu.service_value) > 0
            ORDER BY roi_percentage DESC
            LIMIT 10
        `, [startDate, endDate]);

        res.json({
            memberships: membershipRoi.rows,
            summary: roiSummary.rows[0],
            top_users: topUsers.rows
        });

    } catch (error) {
        next(error);
    }
});

// ============================
// HORARIOS DE NEGOCIO (Ya existentes)
// ============================

// GET /api/admin/business-hours
router.get('/business-hours', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT * FROM business_hours ORDER BY day_of_week'
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// PUT /api/admin/business-hours/:day
router.put('/business-hours/:day', authenticateToken, async (req, res, next) => {
    try {
        const { day } = req.params;
        const { open_time, close_time, is_open, break_start, break_end } = req.body;

        const dayNum = parseInt(day);
        if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
            return res.status(400).json({ error: 'Día inválido (0-6)' });
        }

        if (is_open) {
            if (!open_time || !close_time) {
                return res.status(400).json({
                    error: 'Se requiere horario de apertura y cierre'
                });
            }

            if (open_time >= close_time) {
                return res.status(400).json({
                    error: 'La hora de apertura debe ser antes del cierre'
                });
            }

            if (break_start && break_end) {
                if (break_start >= break_end) {
                    return res.status(400).json({
                        error: 'El inicio del descanso debe ser antes del fin'
                    });
                }
                if (break_start <= open_time || break_end >= close_time) {
                    return res.status(400).json({
                        error: 'El descanso debe estar dentro del horario de trabajo'
                    });
                }
            }
        }

        const result = await db.query(`
            UPDATE business_hours 
            SET open_time = $2, 
                close_time = $3, 
                is_open = $4, 
                break_start = $5, 
                break_end = $6
            WHERE day_of_week = $1
            RETURNING *
        `, [
            dayNum,
            is_open ? open_time : null,
            is_open ? close_time : null,
            is_open,
            is_open ? (break_start || null) : null,
            is_open ? (break_end || null) : null
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Día no encontrado' });
        }

        res.json({ success: true, data: result.rows[0] });

    } catch (error) {
        next(error);
    }
});

// ============================
// DÍAS BLOQUEADOS
// ============================

// GET /api/admin/blocked-dates
router.get('/blocked-dates', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query(`
            SELECT id, blocked_date, reason, created_at
            FROM blocked_dates 
            WHERE blocked_date >= CURRENT_DATE
            ORDER BY blocked_date
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/admin/blocked-dates
router.post('/blocked-dates', authenticateToken, async (req, res, next) => {
    try {
        const { date, reason } = req.body;

        if (!date) {
            return res.status(400).json({ error: 'Se requiere la fecha' });
        }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                error: 'Formato inválido. Use YYYY-MM-DD'
            });
        }

        const dateObj = new Date(date + 'T12:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateObj < today) {
            return res.status(400).json({
                error: 'No se puede bloquear una fecha pasada'
            });
        }

        const existing = await db.query(
            'SELECT 1 FROM blocked_dates WHERE blocked_date = $1',
            [date]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                error: 'Esta fecha ya está bloqueada'
            });
        }

        const result = await db.query(`
            INSERT INTO blocked_dates (blocked_date, reason)
            VALUES ($1, $2)
            RETURNING *
        `, [date, reason || null]);

        res.status(201).json({ success: true, data: result.rows[0] });

    } catch (error) {
        next(error);
    }
});

// DELETE /api/admin/blocked-dates/:id
router.delete('/blocked-dates/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM blocked_dates WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No encontrado' });
        }

        res.json({ success: true, message: 'Eliminado' });

    } catch (error) {
        next(error);
    }
});

// ============================
// CONFIGURACIÓN DEL SISTEMA
// ============================

// GET /api/admin/settings
router.get('/settings', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query('SELECT * FROM system_settings ORDER BY key');

        // Convert to object for easier access
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = {
                value: row.value,
                description: row.description
            };
        });

        res.json(settings);
    } catch (error) {
        next(error);
    }
});

// PUT /api/admin/settings/:key
router.put('/settings/:key', authenticateToken, async (req, res, next) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (value === undefined || value === null) {
            return res.status(400).json({ error: 'Se requiere un valor' });
        }

        // Validate specific settings
        if (key === 'slot_interval_minutes') {
            const numValue = parseInt(value);
            if (isNaN(numValue) || numValue < 15 || numValue > 120) {
                return res.status(400).json({
                    error: 'El intervalo debe ser entre 15 y 120 minutos'
                });
            }
        }

        if (key === 'advance_booking_days') {
            const numValue = parseInt(value);
            if (isNaN(numValue) || numValue < 1 || numValue > 365) {
                return res.status(400).json({
                    error: 'Los días de anticipación deben ser entre 1 y 365'
                });
            }
        }

        const result = await db.query(
            `UPDATE system_settings 
             SET value = $2 
             WHERE key = $1 
             RETURNING *`,
            [key, value.toString()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Configuración no encontrada' });
        }

        res.json({
            success: true,
            setting: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
});

// ============================
// DEBUG: RESET MEMBERSHIPS
// ============================
router.post('/debug/reset-memberships', authenticateToken, async (req, res, next) => {
    try {
        await transaction(async (client) => {
            // 1. Delete membership usage history
            await client.query('DELETE FROM membership_usage');

            // 2. Delete transactions related to memberships
            await client.query("DELETE FROM transactions WHERE type = 'membership'");

            // 3. Delete client memberships
            await client.query('DELETE FROM client_memberships');

            // 4. Reset client types to 'normal' (ID 1)
            await client.query("UPDATE clients SET client_type_id = 1 WHERE client_type_id > 1");
        });

        res.json({ message: 'Se han eliminado todas las membresías y reiniciado los clientes correctamente.' });
    } catch (error) {
        next(error);
    }
});

// ============================
// DEBUG: SEED DATABASE
// ============================
router.post('/debug/seed-database', authenticateToken, async (req, res, next) => {
    try {
        await transaction(async (client) => {
            // 1. Insert Client Types
            await client.query(`
                INSERT INTO client_types (id, name, display_name, color, description, priority)
                OVERRIDING SYSTEM VALUE VALUES
                (4, 'black_card', 'Black Card', '#1A1A1A', 'Miembro Black Card', 3)
                ON CONFLICT (id) DO NOTHING
            `);

            // 2. Insert Membership Types
            await client.query(`
                INSERT INTO membership_types (id, name, description, client_type_id, total_services, validity_days, price, benefits, is_active, display_order)
                OVERRIDING SYSTEM VALUE VALUES
                (8, 'Golden Card Corte', 'Membresía de 6 Servicios Totales (Corte, Barba, Dúo)', 2, 6, 180, 1500.00, '{"transferable": false}', true, 4),
                (9, 'Golden NeoCapilar', 'Membresía de 8 Servicios Totales (TIC, Salud y Prevención)', 3, 8, 365, 3850.00, '{"transferable": false}', true, 5),
                (10, 'Black Card', 'Membresía de 12 Servicios Totales (Cortes, Barba, Mascarillas, Manicura)', 4, 12, 365, 3300.00, '{"transferable": true}', true, 6)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description,
                    price = EXCLUDED.price,
                    total_services = EXCLUDED.total_services
            `);

            // 3. Reset Sequence
            await client.query(`SELECT setval('membership_types_id_seq', (SELECT MAX(id) FROM membership_types))`);
        });

        res.json({ message: 'Base de datos reparada: Tipos de membresía y clientes insertados correctamente.' });
    } catch (error) {
        next(error);
    }
});

// ============================
// DEBUG: MIGRATE SCHEMA (FIX REPORTS)
// ============================
router.post('/debug/migrate-schema', authenticateToken, async (req, res, next) => {
    try {
        await transaction(async (client) => {
            // 1. Add Columns to membership_usage
            await client.query(`
                ALTER TABLE membership_usage
                ADD COLUMN IF NOT EXISTS service_value DECIMAL(10,2),
                ADD COLUMN IF NOT EXISTS stamps_used INTEGER DEFAULT 1,
                ADD COLUMN IF NOT EXISTS notes TEXT;
            `);

            // 2. Add client_id to checkouts (Fix for checkout error)
            await client.query(`
                ALTER TABLE checkouts
                ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id),
                ADD COLUMN IF NOT EXISTS client_name VARCHAR(100),
                ADD COLUMN IF NOT EXISTS client_phone VARCHAR(20),
                ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2),
                ADD COLUMN IF NOT EXISTS deposit_applied DECIMAL(10,2) DEFAULT 0;
                
                -- Create index for performance
                CREATE INDEX IF NOT EXISTS idx_checkouts_client ON checkouts(client_id);
            `);

            // 3. Add deposit columns to appointments
            await client.query(`
                ALTER TABLE appointments
                ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE,
                ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP;
            `);

            // 3. Create Indexes for membership_usage
            await client.query(`
                CREATE INDEX IF NOT EXISTS idx_membership_usage_date ON membership_usage(used_at);
                CREATE INDEX IF NOT EXISTS idx_membership_usage_service ON membership_usage(service_id);
            `);

            // 4. Backfill service_value if empty
            await client.query(`
                UPDATE membership_usage mu
                SET service_value = s.price
                FROM services s
                WHERE mu.service_id = s.id
                AND mu.service_value IS NULL;
            `);
        });

        res.json({ message: 'Esquema migrado: Se agregaron las columnas faltantes (checkouts.client_id y membership_usage).' });
    } catch (error) {
        next(error);
    }
});

// ============================
// NOTIFICATION PREFERENCES
// ============================

// GET /api/admin/notification-settings - Get all clients with notification preferences
router.get('/notification-settings', authenticateToken, async (req, res, next) => {
    try {
        const result = await db.query(`
            SELECT 
                id,
                name,
                phone,
                email,
                whatsapp_enabled,
                email_enabled,
                client_type_id
            FROM clients
            ORDER BY name ASC
        `);

        res.json({
            success: true,
            clients: result.rows
        });

    } catch (error) {
        next(error);
    }
});

// PUT /api/admin/clients/:id/notifications - Update client notification preferences
router.put('/clients/:id/notifications', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { whatsapp_enabled, email_enabled } = req.body;

        // Validate that at least one field is provided
        if (whatsapp_enabled === undefined && email_enabled === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Debe proporcionar al menos una preferencia (whatsapp_enabled o email_enabled)'
            });
        }

        // Build update query dynamically
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (whatsapp_enabled !== undefined) {
            updates.push(`whatsapp_enabled = $${paramIndex}`);
            values.push(whatsapp_enabled);
            paramIndex++;
        }

        if (email_enabled !== undefined) {
            updates.push(`email_enabled = $${paramIndex}`);
            values.push(email_enabled);
            paramIndex++;
        }

        // Add id as last parameter
        values.push(id);

        const query = `
            UPDATE clients 
            SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
            RETURNING id, name, whatsapp_enabled, email_enabled
        `;

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cliente no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Preferencias de notificaciones actualizadas',
            data: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
});

// DEBUG: Check env vars (safe version)
router.get('/debug-env', (req, res) => {
    res.json({
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Set (Length: ' + process.env.GOOGLE_CLIENT_ID.length + ')' : 'MISSING',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'Set (Length: ' + process.env.GOOGLE_CLIENT_SECRET.length + ')' : 'MISSING',
        GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'MISSING (This is the error cause)',
        GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID || 'MISSING'
    });
});

// ============================================
// GOOGLE CALENDAR INTEGRATION
// ============================================

import * as googleCalendar from '../services/googleCalendarService.js';

// Get Google Calendar authorization URL
router.get('/calendar/auth-url', authenticateToken, async (req, res) => {
    try {
        const authUrl = googleCalendar.getAuthUrl();
        res.json({ success: true, authUrl });
    } catch (error) {
        console.error('[GCAL] Error getting auth URL:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Handle OAuth callback
router.get('/calendar/callback', async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.redirect('/admin/configuracion.html?tab=calendar&status=error&message=No+code+provided');
        }

        await googleCalendar.handleCallback(code);
        res.redirect('/admin/configuracion.html?tab=calendar&status=connected');
    } catch (error) {
        console.error('[GCAL] OAuth callback error:', error);
        res.redirect(`/admin/configuracion.html?tab=calendar&status=error&message=${encodeURIComponent(error.message)}`);
    }
});

// Sync all appointments to Google Calendar
router.post('/calendar/sync', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date } = req.body;

        // Default to 7 days ago to 30 days forward
        const startDate = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const endDate = end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const result = await googleCalendar.syncAllAppointments(startDate, endDate);

        res.json({
            success: true,
            message: `Sincronizadas ${result.synced} de ${result.total} citas`,
            ...result
        });
    } catch (error) {
        console.error('[GCAL] Sync error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check connection status
router.get('/calendar/status', authenticateToken, async (req, res) => {
    try {
        const connected = await googleCalendar.isConnected();

        // Get last sync time if connected
        let lastSync = null;
        if (connected) {
            const result = await db.query(
                'SELECT last_sync_at FROM google_calendar_config WHERE id = 1'
            );
            if (result.rows.length > 0) {
                lastSync = result.rows[0].last_sync_at;
            }
        }

        res.json({ success: true, connected, lastSync });
    } catch (error) {
        console.error('[GCAL] Status check error:', error);
        res.json({ success: true, connected: false, lastSync: null });
    }
});

// Disconnect Google Calendar
router.delete('/calendar/disconnect', authenticateToken, async (req, res) => {
    try {
        await googleCalendar.disconnect();
        res.json({ success: true, message: 'Google Calendar desconectado' });
    } catch (error) {
        console.error('[GCAL] Disconnect error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


export default router;


import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

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
            `SELECT COALESCE(SUM(total), 0) as total FROM checkouts 
             WHERE DATE(completed_at) = $1`,
            [today]
        );

        const activeMemberships = await db.query(
            `SELECT COUNT(*) as count FROM client_memberships 
             WHERE status = 'active' AND expiration_date >= CURRENT_DATE`
        );

        const totalClients = await db.query('SELECT COUNT(*) as count FROM clients');

        // Upcoming appointments
        const upcomingAppointments = await db.query(
            `SELECT a.*, c.name as client_name, c.phone as client_phone,
                    ct.color as client_color, s.name as service_name
             FROM appointments a
             JOIN clients c ON a.client_id = c.id
             JOIN client_types ct ON c.client_type_id = ct.id
             JOIN services s ON a.service_id = s.id
             WHERE a.appointment_date = $1 AND a.status NOT IN ('cancelled', 'completed')
             ORDER BY a.start_time LIMIT 10`,
            [today]
        );

        // Expiring memberships
        const expiringMemberships = await db.query(
            `SELECT cm.*, c.name as client_name, mt.name as membership_type,
                    cm.total_services - cm.used_services AS remaining_services
             FROM client_memberships cm
             JOIN clients c ON cm.client_id = c.id
             JOIN membership_types mt ON cm.membership_type_id = mt.id
             WHERE cm.status = 'active' 
             AND cm.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
             ORDER BY cm.expiration_date LIMIT 5`
        );

        // Recent transactions
        const recentTransactions = await db.query(
            `SELECT t.*, c.name as client_name
             FROM transactions t
             JOIN clients c ON t.client_id = c.id
             WHERE DATE(t.created_at) = $1
             ORDER BY t.created_at DESC LIMIT 5`,
            [today]
        );

        res.json({
            stats: {
                appointments_today: parseInt(appointmentsToday.rows[0].count),
                sales_today: parseFloat(salesToday.rows[0].total),
                active_memberships: parseInt(activeMemberships.rows[0].count),
                total_clients: parseInt(totalClients.rows[0].count)
            },
            upcoming_appointments: upcomingAppointments.rows,
            expiring_memberships: expiringMemberships.rows,
            recent_transactions: recentTransactions.rows
        });

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
        const { name, phone, email, birthdate, preferences } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'Nombre y teléfono requeridos' });
        }

        // Verificar teléfono único
        const existing = await db.query('SELECT id FROM clients WHERE phone = $1', [phone]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Ya existe un cliente con ese teléfono' });
        }

        const result = await db.query(
            `INSERT INTO clients (name, phone, email, client_type_id, notes)
             VALUES ($1, $2, $3, 1, $4)
             RETURNING *`,
            [name, phone, email || null, preferences || null]
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
        const { name, phone, email, birthdate, preferences } = req.body;

        const result = await db.query(
            `UPDATE clients 
             SET name = $2, phone = $3, email = $4, notes = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [id, name, phone, email, preferences]
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

        await db.query('DELETE FROM clients WHERE id = $1', [id]);
        res.json({ success: true });

    } catch (error) {
        next(error);
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
                   s.duration_minutes as duration
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN client_types ct ON c.client_type_id = ct.id
            JOIN services s ON a.service_id = s.id
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
        const serviceResult = await db.query('SELECT duration_minutes FROM services WHERE id = $1', [service_id]);
        if (serviceResult.rows.length === 0) {
            return res.status(404).json({ error: 'Servicio no encontrado' });
        }

        // Calcular end_time si no se proporciona
        if (!end_time) {
            const [hours, minutes] = start_time.split(':').map(Number);
            const startMinutes = hours * 60 + minutes;
            const endMinutes = startMinutes + serviceResult.rows[0].duration_minutes;
            const endHours = Math.floor(endMinutes / 60);
            const endMins = endMinutes % 60;
            end_time = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
        }

        // Crear la cita
        const result = await db.query(`
            INSERT INTO appointments (client_id, service_id, appointment_date, start_time, end_time, notes, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'scheduled')
            RETURNING *
        `, [client_id, service_id, appointment_date, start_time, end_time, notes || null]);

        // Obtener la cita completa con información relacionada
        const appointmentId = result.rows[0].id;
        const fullAppointment = await db.query(`
            SELECT a.*, c.name as client_name, c.phone as client_phone,
                   ct.color as client_color, s.name as service_name, s.price as service_price,
                   s.duration_minutes as duration
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN client_types ct ON c.client_type_id = ct.id
            JOIN services s ON a.service_id = s.id
            WHERE a.id = $1
        `, [appointmentId]);

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
                   cm.total_services - cm.used_services as remaining_services
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
                   cm.expiration_date as end_date
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

        const membership = {
            ...result.rows[0],
            payment_history: payments.rows
        };

        res.json(membership);

    } catch (error) {
        next(error);
    }
});

// POST /api/admin/memberships
router.post('/memberships', authenticateToken, async (req, res, next) => {
    try {
        const { client_id, membership_type_id, payment_method } = req.body;

        // Get membership type
        const typeResult = await db.query(
            'SELECT * FROM membership_types WHERE id = $1',
            [membership_type_id]
        );

        if (typeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tipo de membresía no encontrado' });
        }

        const membershipType = typeResult.rows[0];

        // Check existing active membership
        const existing = await db.query(
            `SELECT id FROM client_memberships 
             WHERE client_id = $1 AND status = 'active'`,
            [client_id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'El cliente ya tiene una membresía activa' });
        }

        // Calculate expiration date
        const purchaseDate = new Date();
        const expirationDate = new Date(purchaseDate);
        expirationDate.setDate(expirationDate.getDate() + membershipType.validity_days);

        // Create membership
        const result = await db.query(
            `INSERT INTO client_memberships 
             (client_id, membership_type_id, status, total_services, used_services,
              purchase_date, activation_date, expiration_date, payment_method, payment_amount)
             VALUES ($1, $2, 'active', $3, 0, $4, $4, $5, $6, $7)
             RETURNING *`,
            [
                client_id,
                membership_type_id,
                membershipType.total_services,
                purchaseDate.toISOString().split('T')[0],
                expirationDate.toISOString().split('T')[0],
                payment_method,
                membershipType.price
            ]
        );

        // Record transaction
        await db.query(
            `INSERT INTO transactions (client_id, type, amount, description, payment_method, transaction_date)
             VALUES ($1, 'membership', $2, $3, $4, CURRENT_DATE)`,
            [client_id, membershipType.price, `Membresía ${membershipType.name}`, payment_method]
        );

        // Update client type to Premium/VIP
        await db.query(
            `UPDATE clients SET client_type_id = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 AND client_type_id = 1`,
            [client_id, membershipType.client_type_id]
        );

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
        const { name, description, price, stock, is_active } = req.body;

        const result = await db.query(
            `INSERT INTO products (name, description, price, stock, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, description, price, stock || 0, is_active ?? true]
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
        const { name, description, price, stock, is_active } = req.body;

        const result = await db.query(
            `UPDATE products 
             SET name = $2, description = $3, price = $4, stock = $5, is_active = $6
             WHERE id = $1 RETURNING *`,
            [id, name, description, price, stock, is_active]
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
            `SELECT DATE(created_at) as date, 
                    SUM(amount) as total,
                    COUNT(*) as transactions
             FROM transactions
             WHERE DATE(created_at) BETWEEN $1 AND $2
             GROUP BY DATE(created_at)
             ORDER BY date`,
            [start_date || '2024-01-01', end_date || new Date().toISOString().split('T')[0]]
        );

        // Sales by service
        const servicesSales = await db.query(
            `SELECT s.name, COUNT(*) as count, SUM(s.price) as total
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             WHERE a.status = 'completed'
             AND a.appointment_date BETWEEN $1 AND $2
             GROUP BY s.id, s.name
             ORDER BY total DESC`,
            [start_date || '2024-01-01', end_date || new Date().toISOString().split('T')[0]]
        );

        // Totals
        const totals = await db.query(
            `SELECT 
                SUM(amount) as total_revenue,
                COUNT(*) as total_transactions,
                AVG(amount) as avg_ticket
             FROM transactions
             WHERE DATE(created_at) BETWEEN $1 AND $2`,
            [start_date || '2024-01-01', end_date || new Date().toISOString().split('T')[0]]
        );

        res.json({
            daily_sales: dailySales.rows,
            services_sales: servicesSales.rows,
            totals: totals.rows[0]
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

export default router;

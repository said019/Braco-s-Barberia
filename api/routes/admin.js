import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db, { transaction } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import emailService from '../services/emailService.js';
import whatsappService from '../services/whatsappService.js';
import ExcelJS from 'exceljs';

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

// POST /api/admin/forgot-password
router.post('/forgot-password', async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email requerido' });
        }

        // Buscar admin por email
        const result = await db.query(
            'SELECT * FROM admin_users WHERE email = $1 AND is_active = true',
            [email]
        );

        // Por seguridad, siempre respondemos igual (no revelar si el email existe)
        if (result.rows.length === 0) {
            console.log(`[FORGOT PW] Intento con email no registrado: ${email}`);
            return res.json({
                success: true,
                message: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.'
            });
        }

        const admin = result.rows[0];

        // Generar token único
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hora

        // Guardar token en BD
        await db.query(
            'UPDATE admin_users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
            [resetToken, expiresAt, admin.id]
        );

        // Construir URL de reset
        const publicUrl = process.env.PUBLIC_URL || 'https://braco-s-barberia-production.up.railway.app';
        const resetUrl = `${publicUrl}/admin/reset-password.html?token=${resetToken}`;

        // Enviar email
        const emailResult = await emailService.sendPasswordReset({
            email: admin.email,
            name: admin.name,
            resetUrl
        });

        if (emailResult.success) {
            console.log(`[FORGOT PW] Email enviado a ${admin.email}`);
        } else {
            console.error(`[FORGOT PW] Error enviando email: ${emailResult.error}`);
        }

        res.json({
            success: true,
            message: 'Si el email está registrado, recibirás instrucciones para restablecer tu contraseña.'
        });

    } catch (error) {
        console.error('[FORGOT PW] Error:', error);
        next(error);
    }
});

// POST /api/admin/reset-password
router.post('/reset-password', async (req, res, next) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token y contraseña requeridos' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }

        // Buscar admin con token válido
        const result = await db.query(
            'SELECT * FROM admin_users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'El enlace ha expirado o es inválido. Solicita uno nuevo.' });
        }

        const admin = result.rows[0];

        // Hashear nueva contraseña
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Actualizar contraseña y limpiar token
        await db.query(
            'UPDATE admin_users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
            [passwordHash, admin.id]
        );

        console.log(`[RESET PW] Contraseña actualizada para admin: ${admin.username}`);

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.'
        });

    } catch (error) {
        console.error('[RESET PW] Error:', error);
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
             WHERE transaction_date = $1`,
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

        // Recent transactions (Global last 10, not just today) - LEFT JOIN para incluir ventas sin cliente
        const recentTransactions = await db.query(
            `SELECT t.*, COALESCE(c.name, 'Público General') as client_name, t.payment_method
             FROM transactions t
             LEFT JOIN clients c ON t.client_id = c.id
             ORDER BY t.created_at DESC LIMIT 10`
        );

        // Appointments needing reminder attention: show all scheduled/confirmed within the next 48h
        // This gives admins visibility to review, reschedule or send WhatsApp manually.
        const remindersDue = await db.query(
            `SELECT a.id, a.uuid, a.appointment_date, a.start_time, a.end_time, a.status,
                    a.reminder_sent, a.checkout_code,
                    c.name as client_name, c.phone as client_phone, c.whatsapp_enabled,
                    s.name as service_name
             FROM appointments a
             JOIN clients c ON a.client_id = c.id
             JOIN services s ON a.service_id = s.id
             WHERE a.status IN ('scheduled', 'confirmed')
               AND (a.appointment_date || ' ' || a.start_time)::timestamp
                   BETWEEN NOW() AND NOW() + INTERVAL '48 hours'
             ORDER BY a.appointment_date ASC, a.start_time ASC
             LIMIT 30`
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
            reminders_due_24h: remindersDue.rows,
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
        // Calcular próximo cumpleaños correctamente:
        // - Si el cumpleaños de este año aún no pasó, usar este año
        // - Si ya pasó, usar el próximo año
        const sql = `
            WITH birthdays AS (
                SELECT
                    c.id,
                    c.name,
                    c.phone,
                    c.birthdate,
                    CASE
                        WHEN TO_CHAR(c.birthdate, 'MM-DD') >= TO_CHAR(CURRENT_DATE, 'MM-DD')
                        THEN TO_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::text || TO_CHAR(c.birthdate, '-MM-DD'), 'YYYY-MM-DD')
                        ELSE TO_DATE((EXTRACT(YEAR FROM CURRENT_DATE) + 1)::text || TO_CHAR(c.birthdate, '-MM-DD'), 'YYYY-MM-DD')
                    END AS next_birthday
                FROM clients c
                WHERE c.birthdate IS NOT NULL
            )
            SELECT * FROM birthdays
            WHERE next_birthday BETWEEN CURRENT_DATE AND CURRENT_DATE + $1 * INTERVAL '1 day'
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
        const { name, phone, email, birthdate, notes, client_type_id } = req.body;

        const result = await db.query(
            `UPDATE clients 
             SET name = $2, phone = $3, email = $4, birthdate = $5, notes = $6, 
                 client_type_id = COALESCE($7, client_type_id), updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [id, name, phone, email, birthdate || null, notes || null, client_type_id || null]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// POST /api/admin/clients/:id/promote - Cambiar cliente de Nuevo a Recurrente y enviar notificaciones
router.post('/clients/:id/promote', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        
        // Obtener datos del cliente
        const clientResult = await db.query(
            'SELECT id, name, phone, email, client_code, client_type_id FROM clients WHERE id = $1',
            [id]
        );
        
        if (clientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        
        const client = clientResult.rows[0];
        
        // Verificar que sea cliente "Nuevo" (type_id = 1)
        if (client.client_type_id !== 1) {
            return res.status(400).json({ error: 'Solo se pueden promover clientes con tipo "Nuevo"' });
        }
        
        // Actualizar a Recurrente (type_id = 2)
        await db.query(
            'UPDATE clients SET client_type_id = 2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );
        
        // Enviar notificaciones
        const notifications = { email: false, whatsapp: false };
        
        // Enviar Email si tiene email
        if (client.email) {
            try {
                const emailService = (await import('../services/emailService.js')).default;
                await emailService.sendClientWelcome({
                    to: client.email,
                    clientName: client.name,
                    clientCode: client.client_code
                });
                notifications.email = true;
                console.log(`[PROMOTE] Email enviado a ${client.email}`);
            } catch (emailError) {
                console.error('[PROMOTE] Error enviando email:', emailError.message);
            }
        }
        
        // Enviar WhatsApp
        if (client.phone) {
            try {
                const whatsappService = await import('../services/whatsappService.js');
                const result = await whatsappService.sendWelcomeWithClientCode({
                    phone: client.phone,
                    name: client.name,
                    clientCode: client.client_code
                });
                notifications.whatsapp = result.success;
                console.log(`[PROMOTE] WhatsApp enviado a ${client.phone}: ${result.success}`);
            } catch (whatsappError) {
                console.error('[PROMOTE] Error enviando WhatsApp:', whatsappError.message);
            }
        }
        
        res.json({ 
            success: true, 
            message: 'Cliente promovido a Recurrente',
            client_code: client.client_code,
            notifications
        });
        
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
        // VALIDACIÓN: Prevenir citas duplicadas (mismo cliente)
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

        // ============================================
        // VALIDACIÓN: Colisión de horarios (cualquier cliente)
        // Verifica que no haya otra cita que se solape en el mismo horario
        // ============================================
        const collisionCheck = await db.query(`
            SELECT a.id, c.name as client_name, a.start_time, a.end_time
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            WHERE a.appointment_date = $1
              AND a.status NOT IN ('cancelled', 'no_show')
              AND (
                  -- Nueva cita empieza durante una existente
                  ($2::time >= a.start_time AND $2::time < a.end_time)
                  OR
                  -- Nueva cita termina durante una existente
                  ($3::time > a.start_time AND $3::time <= a.end_time)
                  OR
                  -- Nueva cita envuelve completamente una existente
                  ($2::time <= a.start_time AND $3::time >= a.end_time)
              )
        `, [appointment_date, start_time, end_time]);

        if (collisionCheck.rows.length > 0) {
            const conflicting = collisionCheck.rows[0];
            console.warn(`[ADMIN] Time slot collision blocked: ${start_time}-${end_time} conflicts with ${conflicting.client_name}'s appointment ${conflicting.start_time}-${conflicting.end_time}`);
            return res.status(409).json({
                error: `Horario no disponible. Ya hay una cita de ${conflicting.client_name} de ${conflicting.start_time.slice(0, 5)} a ${conflicting.end_time.slice(0, 5)}`,
                conflicting_appointment: {
                    id: conflicting.id,
                    client_name: conflicting.client_name,
                    start_time: conflicting.start_time,
                    end_time: conflicting.end_time
                }
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

        // Obtener el status anterior y datos de la cita para posible envío de confirmación
        const prevResult = await db.query(`
            SELECT a.*, c.name as client_name, c.phone as client_phone, c.email as client_email,
                   c.whatsapp_enabled, c.email_enabled, s.name as service_name
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN services s ON a.service_id = s.id
            WHERE a.id = $1
        `, [id]);

        if (prevResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        const prevAppointment = prevResult.rows[0];
        const wasFromPending = prevAppointment.status === 'pending';
        // Al aprobar cita pendiente, siempre usar 'scheduled' (no 'confirmed')
        const isNowApproved = status === 'scheduled';

        // Actualizar el status
        const result = await db.query(
            `UPDATE appointments SET status = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING *`,
            [id, status]
        );

        // Si se cancela la cita, eliminar el evento de Google Calendar
        if (status === 'cancelled' || status === 'no_show') {
            try {
                const googleCalendar = await import('../services/googleCalendarService.js');
                await googleCalendar.deleteEvent(parseInt(id));
                console.log(`[CANCEL APPT] Evento de Google Calendar eliminado para cita ${id}`);
            } catch (gcalError) {
                console.error('[CANCEL APPT] Error eliminando evento de Google Calendar:', gcalError.message);
                // Continuar aunque falle la eliminación del calendario
            }
        }

        // Si la cita pasó de 'pending' a 'scheduled', enviar confirmación al cliente
        if (wasFromPending && isNowApproved) {
            console.log(`[APPROVE APPT] Cita ${id} aprobada. Enviando confirmación al cliente...`);

            const dateObj = new Date(prevAppointment.appointment_date + 'T12:00:00');
            const formattedDate = dateObj.toLocaleDateString('es-MX', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
            });

            // Enviar WhatsApp si tiene teléfono y está habilitado
            if (prevAppointment.client_phone && prevAppointment.whatsapp_enabled !== false) {
                try {
                    const whatsappRes = await whatsappService.sendWhatsAppBookingConfirmation({
                        phone: prevAppointment.client_phone,
                        name: prevAppointment.client_name,
                        service: prevAppointment.service_name,
                        date: formattedDate,
                        time: prevAppointment.start_time.slice(0, 5),
                        code: prevAppointment.checkout_code || '----'
                    });
                    console.log(`[APPROVE APPT] WhatsApp confirmación enviado: ${whatsappRes.success}`);
                } catch (whatsappError) {
                    console.error('[APPROVE APPT] Error WhatsApp:', whatsappError);
                }
            }

            // Enviar Email si tiene email y está habilitado
            if (prevAppointment.client_email && prevAppointment.email_enabled !== false) {
                try {
                    const emailRes = await emailService.sendBookingConfirmation({
                        email: prevAppointment.client_email,
                        name: prevAppointment.client_name,
                        service: prevAppointment.service_name,
                        date: formattedDate,
                        time: prevAppointment.start_time.slice(0, 5),
                        code: prevAppointment.checkout_code || '----'
                    });
                    console.log(`[APPROVE APPT] Email confirmación enviado: ${emailRes.success}`);
                } catch (emailError) {
                    console.error('[APPROVE APPT] Error Email:', emailError);
                }
            }
        }

        res.json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// PUT /api/admin/appointments/:id/reschedule - Reprogramar cita (cambiar fecha/hora) y reenviar WhatsApp
router.put('/appointments/:id/reschedule', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { appointment_date, start_time } = req.body;

        if (!appointment_date || !start_time) {
            return res.status(400).json({ error: 'appointment_date y start_time requeridos' });
        }

        // Obtener cita + datos de cliente/servicio
        const prevResult = await db.query(`
            SELECT a.*, c.name as client_name, c.phone as client_phone, c.whatsapp_enabled,
                   s.name as service_name, s.duration_minutes
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN services s ON a.service_id = s.id
            WHERE a.id = $1
        `, [id]);

        if (prevResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cita no encontrada' });
        }

        const prevAppointment = prevResult.rows[0];

        // Calcular end_time basado en duración del servicio
        const [hours, minutes] = String(start_time).split(':').map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) {
            return res.status(400).json({ error: 'start_time inválido (usa formato HH:MM)' });
        }
        const startMinutes = hours * 60 + minutes;
        const endMinutes = startMinutes + (prevAppointment.duration_minutes || 0);
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const end_time = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;

        // Prevenir duplicados (mismo cliente, misma fecha/hora)
        const duplicateCheck = await db.query(`
            SELECT id FROM appointments
            WHERE client_id = $1
              AND appointment_date = $2
              AND start_time = $3
              AND id <> $4
              AND status NOT IN ('cancelled', 'no_show')
        `, [prevAppointment.client_id, appointment_date, start_time, id]);

        if (duplicateCheck.rows.length > 0) {
            return res.status(409).json({
                error: 'Ya existe otra cita para este cliente en la misma fecha y hora',
                existing_id: duplicateCheck.rows[0].id
            });
        }

        // Actualizar cita y resetear flags de recordatorio
        const updateResult = await db.query(
            `UPDATE appointments
             SET appointment_date = $2,
                 start_time = $3,
                 end_time = $4,
                 reminder_sent = FALSE,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [id, appointment_date, start_time, end_time]
        );

        const updated = updateResult.rows[0];

        // Sync Google Calendar (best-effort)
        try {
            const googleCalendar = await import('../services/googleCalendarService.js');
            await googleCalendar.updateEvent(parseInt(id), {
                ...updated,
                client_name: prevAppointment.client_name,
                client_phone: prevAppointment.client_phone,
                service_name: prevAppointment.service_name
            });
        } catch (gcalError) {
            console.error('[RESCHEDULE] Google Calendar update error:', gcalError.message);
        }

        // Reenviar WhatsApp automáticamente (si está habilitado)
        let whatsappSent = false;
        if (prevAppointment.client_phone && prevAppointment.whatsapp_enabled !== false) {
            try {
                const dateObj = new Date(String(appointment_date) + 'T12:00:00');
                const formattedDate = dateObj.toLocaleDateString('es-MX', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                });

                const whatsappRes = await whatsappService.sendWhatsAppBookingConfirmation({
                    phone: prevAppointment.client_phone,
                    name: prevAppointment.client_name,
                    service: prevAppointment.service_name,
                    date: formattedDate,
                    time: String(start_time).slice(0, 5),
                    code: prevAppointment.checkout_code || '----'
                });
                whatsappSent = !!whatsappRes.success;
            } catch (whatsappError) {
                console.error('[RESCHEDULE] Error sending WhatsApp:', whatsappError);
            }
        }

        res.json({
            success: true,
            message: 'Cita reprogramada' + (whatsappSent ? ' y WhatsApp reenviado' : ''),
            data: updated,
            whatsapp_sent: whatsappSent
        });
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

// POST /api/admin/appointments/:id/send-reminder - Enviar recordatorio 24h manualmente
router.post('/appointments/:id/send-reminder', authenticateToken, async (req, res, next) => {
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

        // Enviar recordatorio 24h
        const whatsappRes = await whatsappService.sendReminder24h({
            phone: appointment.client_phone,
            name: appointment.client_name,
            service: appointment.service_name,
            time: appointment.start_time.slice(0, 5),
            code: appointment.checkout_code || '----'
        });

        if (whatsappRes.success) {
            // Marcar como enviado
            await db.query('UPDATE appointments SET reminder_sent = TRUE WHERE id = $1', [id]);

            console.log(`[ADMIN] Recordatorio 24h enviado a ${appointment.client_name}: ${whatsappRes.id}`);
            res.json({
                success: true,
                message: `Recordatorio 24h enviado a ${appointment.client_name}`,
                sid: whatsappRes.id
            });
        } else {
            console.error(`[ADMIN] Error enviando recordatorio 24h:`, whatsappRes.error);
            res.status(500).json({
                success: false,
                error: whatsappRes.error || 'Error al enviar recordatorio'
            });
        }

    } catch (error) {
        console.error('[ADMIN] Error en send-reminder:', error);
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

// GET /api/admin/memberships/export/data
// Reporte detallado para Excel (frontend espera esta ruta)
router.get('/memberships/export/data', authenticateToken, async (req, res, next) => {
    try {
        // Último uso por membresía (si existe)
        const result = await db.query(`
            SELECT
                cm.id,
                cm.folio_number AS folio,
                cm.status,
                cm.activation_date AS start_date,
                cm.expiration_date AS end_date,
                cm.total_services,
                cm.used_services,
                (cm.total_services - cm.used_services) AS remaining_services,
                cm.created_at,
                c.name AS client_name,
                c.phone AS client_phone,
                mt.name AS plan_name,
                mt.price AS price,
                u.service_name AS used_service,
                u.usage_date,
                u.appointment_id
            FROM client_memberships cm
            JOIN clients c ON cm.client_id = c.id
            JOIN membership_types mt ON cm.membership_type_id = mt.id
            LEFT JOIN LATERAL (
                SELECT
                    mu.used_at AS usage_date,
                    mu.appointment_id,
                    COALESCE(mu.service_name, s.name) AS service_name
                FROM membership_usage mu
                LEFT JOIN services s ON mu.service_id = s.id
                WHERE mu.membership_id = cm.id
                ORDER BY mu.used_at DESC
                LIMIT 1
            ) u ON TRUE
            ORDER BY cm.created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// GET /api/admin/memberships/export/detailed
// Reporte completo con historial de pagos y usos
router.get('/memberships/export/detailed', authenticateToken, async (req, res, next) => {
    try {
        // Get all memberships with basic info
        const memberships = await db.query(`
            SELECT
                cm.id,
                cm.folio_number AS folio,
                cm.status,
                cm.activation_date AS start_date,
                cm.expiration_date AS end_date,
                cm.total_services,
                cm.used_services,
                (cm.total_services - cm.used_services) AS remaining_services,
                cm.created_at,
                c.name AS client_name,
                c.phone AS client_phone,
                mt.name AS plan_name,
                mt.price AS price
            FROM client_memberships cm
            JOIN clients c ON cm.client_id = c.id
            JOIN membership_types mt ON cm.membership_type_id = mt.id
            ORDER BY cm.created_at DESC
        `);

        // Get all payment history for memberships
        const payments = await db.query(`
            SELECT
                t.membership_purchase_id AS membership_id,
                t.amount,
                t.payment_method,
                t.transaction_date,
                t.created_at
            FROM transactions t
            WHERE t.membership_purchase_id IS NOT NULL
            ORDER BY t.created_at DESC
        `);

        // Get all usage history for memberships
        const usage = await db.query(`
            SELECT
                mu.membership_id,
                mu.service_name,
                mu.used_at,
                s.price AS service_value
            FROM membership_usage mu
            LEFT JOIN services s ON mu.service_id = s.id
            ORDER BY mu.used_at DESC
        `);

        // Group payments and usage by membership_id
        const paymentsMap = {};
        payments.rows.forEach(p => {
            if (!paymentsMap[p.membership_id]) {
                paymentsMap[p.membership_id] = [];
            }
            paymentsMap[p.membership_id].push(p);
        });

        const usageMap = {};
        usage.rows.forEach(u => {
            if (!usageMap[u.membership_id]) {
                usageMap[u.membership_id] = [];
            }
            usageMap[u.membership_id].push(u);
        });

        // Combine everything
        const detailedData = memberships.rows.map(m => ({
            ...m,
            payments: paymentsMap[m.id] || [],
            usage_history: usageMap[m.id] || []
        }));

        res.json(detailedData);
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
        const { name, description, duration_minutes, price, category_id, is_active, image_url } = req.body;

        const result = await db.query(
            `INSERT INTO services (name, description, duration_minutes, price, category_id, is_active, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [name, description, duration_minutes, price, category_id, is_active ?? true, image_url || null]
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
        const { name, description, duration_minutes, price, category_id, is_active, image_url } = req.body;

        const result = await db.query(
            `UPDATE services 
             SET name = $2, description = $3, duration_minutes = $4, price = $5, 
                 category_id = $6, is_active = $7, image_url = $8, updated_at = CURRENT_TIMESTAMP
             WHERE id = $1 RETURNING *`,
            [id, name, description, duration_minutes, price, category_id, is_active, image_url || null]
        );

        res.json(result.rows[0]);

    } catch (error) {
        next(error);
    }
});

// DELETE /api/admin/services/:id
// Borrado en dos pasos: primero desactiva, segundo elimina permanentemente
router.delete('/services/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verificar estado actual
        const current = await db.query('SELECT is_active FROM services WHERE id = $1', [id]);

        if (current.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }

        if (current.rows[0].is_active) {
            // Primer borrado: Solo desactivar
            await db.query('UPDATE services SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
            res.json({ success: true, message: 'Servicio desactivado', action: 'deactivated' });
        } else {
            // Segundo borrado: Eliminar permanentemente
            await db.query('DELETE FROM services WHERE id = $1', [id]);
            res.json({ success: true, message: 'Servicio eliminado permanentemente', action: 'deleted' });
        }

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

// DELETE /api/admin/products/:id
// Borrado en dos pasos: primero desactiva, segundo elimina permanentemente
router.delete('/products/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        // Verificar estado actual
        const current = await db.query('SELECT is_active FROM products WHERE id = $1', [id]);

        if (current.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }

        if (current.rows[0].is_active) {
            // Primer borrado: Solo desactivar
            await db.query('UPDATE products SET is_active = false WHERE id = $1', [id]);
            res.json({ success: true, message: 'Producto desactivado', action: 'deactivated' });
        } else {
            // Segundo borrado: Eliminar permanentemente
            await db.query('DELETE FROM products WHERE id = $1', [id]);
            res.json({ success: true, message: 'Producto eliminado permanentemente', action: 'deleted' });
        }

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

// GET /api/admin/reports/sales/excel
// Genera un Excel con diseño "completo" (similar al ejemplo proporcionado), usando Postgres (NO Firebase).
router.get('/reports/sales/excel', authenticateToken, async (req, res, next) => {
    try {
        const { start_date, end_date } = req.query;
        const startDate = start_date || '2024-01-01';
        const endDate = end_date || new Date().toISOString().split('T')[0];

        // Totales por tipo (ingresos reales)
        const totalsResult = await db.query(`
            SELECT
                COALESCE(SUM(amount), 0) as total_revenue,
                COALESCE(COUNT(*), 0) as total_transactions,
                COALESCE(AVG(amount), 0) as avg_transaction,
                COALESCE(SUM(CASE WHEN type = 'membership' THEN amount ELSE 0 END), 0) as total_memberships,
                COALESCE(SUM(CASE WHEN type = 'service' THEN amount ELSE 0 END), 0) as total_services,
                COALESCE(SUM(CASE WHEN type = 'product' THEN amount ELSE 0 END), 0) as total_products
            FROM transactions
            WHERE transaction_date BETWEEN $1 AND $2
        `, [startDate, endDate]);

        const totals = totalsResult.rows[0] || {};

        const ingresosTotales = parseFloat(totals.total_revenue || 0);
        const totalTransacciones = parseInt(totals.total_transactions || 0, 10);
        const ticketPromedio = parseFloat(totals.avg_transaction || 0);
        const ventaMembresias = parseFloat(totals.total_memberships || 0);
        const serviciosPagados = parseFloat(totals.total_services || 0);
        const productos = parseFloat(totals.total_products || 0);

        // Top por tipo (servicios/membresías) usando transactions (lo más consistente para ingresos)
        // Servicios
        const servicesAgg = await db.query(`
            SELECT
                COALESCE(t.description, 'Servicio') as name,
                COUNT(*) as count,
                SUM(t.amount) as total
            FROM transactions t
            WHERE t.type = 'service'
              AND t.transaction_date BETWEEN $1 AND $2
            GROUP BY COALESCE(t.description, 'Servicio')
            ORDER BY total DESC
        `, [startDate, endDate]);

        // Membresías
        const membershipsAgg = await db.query(`
            SELECT
                COALESCE(t.description, 'Membresía') as name,
                COUNT(*) as count,
                SUM(t.amount) as total
            FROM transactions t
            WHERE t.type = 'membership'
              AND t.transaction_date BETWEEN $1 AND $2
            GROUP BY COALESCE(t.description, 'Membresía')
            ORDER BY total DESC
        `, [startDate, endDate]);

        // Uso de membresías (servicios prestados usando benefits). NO es ingreso nuevo.
        // Lo calculamos por checkouts con used_membership=true en el rango.
        const usageAgg = await db.query(`
            SELECT
                COUNT(*) as services_with_membership,
                COALESCE(SUM(service_cost), 0) as value_provided
            FROM checkouts
            WHERE used_membership = true
              AND DATE(completed_at) BETWEEN $1 AND $2
        `, [startDate, endDate]);

        const usage = usageAgg.rows[0] || {};

        const datos = {
            ingresosTotales,
            totalTransacciones,
            ticketPromedio,
            ventaMembresias,
            serviciosPagados,
            productos,
            servicios: servicesAgg.rows.map(r => ({
                nombre: r.name,
                cantidad: parseInt(r.count || 0, 10),
                precio: parseFloat(r.total || 0)
            })),
            membresias: membershipsAgg.rows.map(r => ({
                nombre: r.name,
                cantidad: parseInt(r.count || 0, 10),
                precio: parseFloat(r.total || 0)
            })),
            fechaInicio: formatDateEsMx(startDate),
            fechaFin: formatDateEsMx(endDate),
            usoMembresias: {
                servicios: parseInt(usage.services_with_membership || 0, 10),
                valorPrestado: parseFloat(usage.value_provided || 0),
                // En Postgres hoy no hay "sellos" por checkout. Lo dejamos como 0 para no inventar.
                sellosUtilizados: 0
            }
        };

        const buffer = await buildSalesReportWorkbook(datos);

        const filename = `Reporte_Ventas_${startDate}_${endDate}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.from(buffer));

    } catch (error) {
        next(error);
    }
});

function formatDateEsMx(fechaISO) {
    // fechaISO: YYYY-MM-DD
    const d = new Date(`${fechaISO}T12:00:00`);
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
}

async function buildSalesReportWorkbook(datos) {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Reporte de Ventas');

    const estilos = {
        titulo: {
            font: { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } },
            alignment: { horizontal: 'center', vertical: 'middle' }
        },
        subtitulo: {
            font: { name: 'Calibri', size: 11, bold: true },
            alignment: { horizontal: 'center' }
        },
        fechaPeriodo: {
            font: { name: 'Calibri', size: 9, italic: true },
            alignment: { horizontal: 'center' }
        },
        seccionHeader: {
            font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
        },
        seccionHeaderVerde: {
            font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } }
        },
        seccionHeaderMorado: {
            font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9966CC' } }
        },
        seccionHeaderNaranja: {
            font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } }
        },
        seccionHeaderAzul: {
            font: { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFFFFFFF' } },
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } }
        },
        fondoVerde: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }
        },
        fondoMorado: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE4DFEC' } }
        },
        fondoNaranja: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } }
        },
        fondoAzulClaro: {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
        },
        bordeThin: {
            border: {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            }
        }
    };

    // ENCABEZADO
    ws.mergeCells('A1:G1');
    const titulo = ws.getCell('A1');
    titulo.value = "BRACO'S BARBERÍA & PELUQUERÍA";
    Object.assign(titulo, estilos.titulo);
    ws.getRow(1).height = 25;

    ws.mergeCells('A2:G2');
    const subtitulo = ws.getCell('A2');
    subtitulo.value = 'Reporte de Ventas - Análisis de Ingresos y Rendimiento';
    Object.assign(subtitulo, estilos.subtitulo);

    ws.mergeCells('A3:G3');
    const fecha = ws.getCell('A3');
    fecha.value = `Período: ${datos.fechaInicio} - ${datos.fechaFin} | Generado: ${new Date().toLocaleString('es-MX')}`;
    Object.assign(fecha, estilos.fechaPeriodo);

    // MÉTRICAS PRINCIPALES
    let row = 5;
    ws.mergeCells(`A${row}:B${row}`);
    Object.assign(ws.getCell(`A${row}`), estilos.seccionHeader);
    ws.getCell(`A${row}`).value = 'MÉTRICAS PRINCIPALES';

    ws.mergeCells(`D${row}:E${row}`);
    Object.assign(ws.getCell(`D${row}`), estilos.seccionHeaderVerde);
    ws.getCell(`D${row}`).value = 'COMPOSICIÓN';

    row++;
    const porcentaje = (val) => {
        if (!datos.ingresosTotales) return '0.0%';
        return `${((val / datos.ingresosTotales) * 100).toFixed(1)}%`;
    };

    const metricas = [
        ['Ingresos Totales', datos.ingresosTotales, 'Membresías', datos.ventaMembresias, porcentaje(datos.ventaMembresias)],
        ['Transacciones', datos.totalTransacciones, 'Servicios Pagados', datos.serviciosPagados, porcentaje(datos.serviciosPagados)],
        ['Ticket Promedio', datos.ticketPromedio, 'Productos', datos.productos, porcentaje(datos.productos)]
    ];

    metricas.forEach(m => {
        ws.getCell(`A${row}`).value = m[0];
        ws.getCell(`B${row}`).value = m[1];
        ws.getCell(`D${row}`).value = m[2];
        ws.getCell(`E${row}`).value = m[3];
        ws.getCell(`F${row}`).value = m[4];

        if (typeof m[1] === 'number' && m[0] !== 'Transacciones') ws.getCell(`B${row}`).numFmt = '$#,##0.00';
        if (typeof m[3] === 'number') ws.getCell(`E${row}`).numFmt = '$#,##0.00';
        row++;
    });

    // DESGLOSE DE INGRESOS
    row++;
    ws.mergeCells(`A${row}:G${row}`);
    Object.assign(ws.getCell(`A${row}`), estilos.seccionHeaderAzul);
    ws.getCell(`A${row}`).value = 'DESGLOSE DE INGRESOS';

    // Servicios
    row++;
    ws.mergeCells(`A${row}:F${row}`);
    Object.assign(ws.getCell(`A${row}`), estilos.seccionHeaderVerde);
    ws.getCell(`A${row}`).value = 'Servicios Pagados';

    const totalServ = ws.getCell(`G${row}`);
    totalServ.value = datos.serviciosPagados;
    totalServ.numFmt = '$#,##0.00';
    Object.assign(totalServ, { font: { bold: true }, ...estilos.fondoVerde });

    row++;
    (datos.servicios || []).forEach(servicio => {
        ws.getCell(`B${row}`).value = servicio.nombre;
        ws.getCell(`F${row}`).value = `${servicio.cantidad} ventas`;
        ws.getCell(`G${row}`).value = servicio.precio;
        ws.getCell(`G${row}`).numFmt = '$#,##0.00';
        row++;
    });

    // Membresías
    ws.mergeCells(`A${row}:F${row}`);
    Object.assign(ws.getCell(`A${row}`), estilos.seccionHeaderMorado);
    ws.getCell(`A${row}`).value = 'Membresías Vendidas';

    const totalMemb = ws.getCell(`G${row}`);
    totalMemb.value = datos.ventaMembresias;
    totalMemb.numFmt = '$#,##0.00';
    Object.assign(totalMemb, { font: { bold: true }, ...estilos.fondoMorado });

    row++;
    (datos.membresias || []).forEach(m => {
        ws.getCell(`B${row}`).value = m.nombre;
        ws.getCell(`F${row}`).value = `${m.cantidad} ventas`;
        ws.getCell(`G${row}`).value = m.precio;
        ws.getCell(`G${row}`).numFmt = '$#,##0.00';
        row++;
    });

    // Productos
    ws.mergeCells(`A${row}:F${row}`);
    Object.assign(ws.getCell(`A${row}`), estilos.seccionHeaderNaranja);
    ws.getCell(`A${row}`).value = 'Productos';

    const totalProd = ws.getCell(`G${row}`);
    totalProd.value = datos.productos;
    totalProd.numFmt = '$#,##0.00';
    Object.assign(totalProd, { font: { bold: true }, ...estilos.fondoNaranja });

    // SERVICIOS TOP
    row += 2;
    ws.mergeCells(`A${row}:G${row}`);
    Object.assign(ws.getCell(`A${row}`), estilos.seccionHeaderAzul);
    ws.getCell(`A${row}`).value = 'SERVICIOS TOP (INGRESOS)';

    row++;
    ['Servicio', 'Ventas', 'Total'].forEach((header, i) => {
        const col = String.fromCharCode(65 + i);
        const celda = ws.getCell(`${col}${row}`);
        celda.value = header;
        Object.assign(celda, { font: { bold: true }, ...estilos.fondoAzulClaro, ...estilos.bordeThin });
    });

    row++;
    const todosServicios = [
        ...(datos.membresias || []).map(m => ({ nombre: m.nombre, cantidad: m.cantidad, total: m.precio })),
        ...(datos.servicios || []).map(s => ({ nombre: s.nombre, cantidad: s.cantidad, total: s.precio }))
    ].sort((a, b) => (b.total || 0) - (a.total || 0));

    todosServicios.forEach(item => {
        ws.getCell(`A${row}`).value = item.nombre;
        ws.getCell(`B${row}`).value = `${item.cantidad} ventas`;
        ws.getCell(`C${row}`).value = item.total;
        ws.getCell(`C${row}`).numFmt = '$#,##0.00';
        ['A', 'B', 'C'].forEach(col => Object.assign(ws.getCell(`${col}${row}`), estilos.bordeThin));
        row++;
    });

    // USO DE MEMBRESÍAS
    row++;
    ws.mergeCells(`A${row}:G${row}`);
    Object.assign(ws.getCell(`A${row}`), estilos.seccionHeaderMorado);
    ws.getCell(`A${row}`).value = 'USO DE MEMBRESÍAS';

    row++;
    ws.mergeCells(`A${row}:G${row}`);
    ws.getCell(`A${row}`).value = 'No suma a ventas - Servicios prestados usando beneficios de membresía.';
    ws.getCell(`A${row}`).font = { italic: true, size: 9 };

    row++;
    ws.getCell(`A${row}`).value = 'Servicios con Membresía:';
    ws.getCell(`B${row}`).value = datos.usoMembresias?.servicios || 0;
    ws.getCell(`B${row}`).font = { bold: true };

    row++;
    ws.getCell(`A${row}`).value = 'Valor Prestado:';
    ws.getCell(`B${row}`).value = datos.usoMembresias?.valorPrestado || 0;
    ws.getCell(`B${row}`).numFmt = '$#,##0.00';
    ws.getCell(`B${row}`).font = { bold: true };

    row++;
    ws.getCell(`A${row}`).value = 'Sellos Utilizados:';
    ws.getCell(`B${row}`).value = datos.usoMembresias?.sellosUtilizados || 0;
    ws.getCell(`B${row}`).font = { bold: true };

    // Anchos de columna
    ws.getColumn('A').width = 35;
    ws.getColumn('B').width = 15;
    ws.getColumn('C').width = 15;
    ws.getColumn('D').width = 20;
    ws.getColumn('E').width = 15;
    ws.getColumn('F').width = 12;
    ws.getColumn('G').width = 15;

    return workbook.xlsx.writeBuffer();
}

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
            SELECT id, blocked_date, reason, start_time, end_time, created_at
            FROM blocked_dates 
            WHERE blocked_date >= CURRENT_DATE
            ORDER BY blocked_date, start_time
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/admin/blocked-dates
router.post('/blocked-dates', authenticateToken, async (req, res, next) => {
    try {
        const { date, reason, start_time, end_time } = req.body;

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

        // Si es bloqueo de día completo, verificar que no exista
        if (!start_time && !end_time) {
            const existing = await db.query(
                'SELECT 1 FROM blocked_dates WHERE blocked_date = $1 AND start_time IS NULL',
                [date]
            );

            if (existing.rows.length > 0) {
                return res.status(409).json({
                    error: 'Esta fecha ya está bloqueada como día completo'
                });
            }
        }

        const result = await db.query(`
            INSERT INTO blocked_dates (blocked_date, reason, start_time, end_time)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [date, reason || null, start_time || null, end_time || null]);

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
// HORARIOS BLOQUEADOS (Time Slots)
// ============================

// GET /api/admin/blocked-time-slots
router.get('/blocked-time-slots', authenticateToken, async (req, res, next) => {
    try {
        const { date } = req.query;

        let query = `
            SELECT id, blocked_date, start_time, end_time, reason, created_at, created_by
            FROM blocked_time_slots
        `;
        const params = [];

        if (date) {
            query += ` WHERE blocked_date = $1`;
            params.push(date);
        } else {
            query += ` WHERE blocked_date >= CURRENT_DATE`;
        }

        query += ` ORDER BY blocked_date, start_time`;

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/admin/blocked-time-slots
router.post('/blocked-time-slots', authenticateToken, async (req, res, next) => {
    try {
        const { date, start_time, end_time, reason } = req.body;

        if (!date || !start_time || !end_time) {
            return res.status(400).json({
                error: 'Se requieren date, start_time y end_time'
            });
        }

        // Verificar que start_time sea menor que end_time
        if (start_time >= end_time) {
            return res.status(400).json({
                error: 'La hora de inicio debe ser menor a la hora de fin'
            });
        }

        const result = await db.query(`
            INSERT INTO blocked_time_slots (blocked_date, start_time, end_time, reason, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [date, start_time, end_time, reason || 'Sin motivo', req.user?.name || 'Admin']);

        res.status(201).json({
            success: true,
            message: 'Horario bloqueado exitosamente',
            data: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({
                error: 'Ya existe un bloqueo para esa fecha y hora'
            });
        }
        next(error);
    }
});

// DELETE /api/admin/blocked-time-slots/:id
router.delete('/blocked-time-slots/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM blocked_time_slots WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Horario bloqueado no encontrado' });
        }

        res.json({ success: true, message: 'Horario desbloqueado' });
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


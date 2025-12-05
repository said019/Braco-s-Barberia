import express from 'express';
import db from '../config/database.js';
// import auth from '../middleware/auth.js'; // Descomentar cuando esté disponible

const router = express.Router();

// ============================
// HORARIOS DE NEGOCIO
// ============================

// GET /api/admin/business-hours
router.get('/business-hours', async (req, res, next) => {
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
router.put('/business-hours/:day', async (req, res, next) => {
    try {
        const { day } = req.params;
        const { open_time, close_time, is_open, break_start, break_end } = req.body;

        // Validar día (0-6)
        const dayNum = parseInt(day);
        if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
            return res.status(400).json({ error: 'Día inválido (0-6)' });
        }

        // Validaciones si está abierto
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
router.get('/blocked-dates', async (req, res, next) => {
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
router.post('/blocked-dates', async (req, res, next) => {
    try {
        const { date, reason } = req.body;

        if (!date) {
            return res.status(400).json({ error: 'Se requiere la fecha' });
        }

        // Validar formato
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                error: 'Formato inválido. Use YYYY-MM-DD'
            });
        }

        // No permitir fechas pasadas
        const dateObj = new Date(date + 'T12:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateObj < today) {
            return res.status(400).json({
                error: 'No se puede bloquear una fecha pasada'
            });
        }

        // Verificar duplicado
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
router.delete('/blocked-dates/:id', async (req, res, next) => {
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
// CONFIGURACIÓN GENERAL
// ============================

// GET /api/admin/settings
router.get('/settings', async (req, res, next) => {
    try {
        const result = await db.query(
            'SELECT key, value, description FROM system_settings'
        );

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

// PUT /api/admin/settings
router.put('/settings', async (req, res, next) => {
    try {
        const settings = req.body;

        for (const [key, value] of Object.entries(settings)) {
            await db.query(
                'UPDATE system_settings SET value = $2 WHERE key = $1',
                [key, value.toString()]
            );
        }

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;

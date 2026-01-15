import express from 'express';
import db from '../config/database.js';
import Client from '../models/Client.js';

const router = express.Router();

// GET /api/public/client/login/:code - Login con código de 4 dígitos
router.get('/client/login/:code', async (req, res, next) => {
    try {
        const { code } = req.params;

        // Validar que sea un código de 4 dígitos
        if (!code || !/^\d{4}$/.test(code)) {
            return res.status(400).json({
                success: false,
                error: 'Código inválido. Debe ser un número de 4 dígitos.'
            });
        }

        const client = await Client.getByCode(code);

        if (!client) {
            return res.status(404).json({
                success: false,
                error: 'No se encontró ningún cliente con ese código.'
            });
        }

        // Obtener membresías activas del cliente
        const memberships = await Client.getActiveMemberships(client.id);

        // Retornar información del cliente (sin datos sensibles)
        res.json({
            success: true,
            client: {
                id: client.id,
                name: client.name,
                phone: client.phone,
                email: client.email,
                birthdate: client.birthdate,
                client_code: client.client_code,
                total_visits: client.total_visits || 0,
                client_type: client.client_type_name
            },
            memberships: memberships.map(m => ({
                name: m.membership_name,
                remaining: m.remaining_services,
                total: m.total_services,
                expiration: m.expiration_date
            }))
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/public/membership/:uuid
router.get('/membership/:uuid', async (req, res, next) => {
    try {
        const { uuid } = req.params;

        const result = await db.query(`
            SELECT cm.uuid, cm.folio_number, cm.activation_date, cm.expiration_date,
                   cm.status, cm.total_services, cm.used_services,
                   c.name as client_name, c.client_type_id,
                   mt.name as membership_type, mt.price,
                   ct.name as client_type_name
            FROM client_memberships cm
            JOIN clients c ON cm.client_id = c.id
            JOIN membership_types mt ON cm.membership_type_id = mt.id
            LEFT JOIN client_types ct ON c.client_type_id = ct.id
            WHERE cm.uuid = $1
        `, [uuid]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Membresía no encontrada' });
        }

        const membership = result.rows[0];

        // Format response public-safe
        res.json({
            uuid: membership.uuid,
            clientName: membership.client_name,
            folio: membership.folio_number,
            plan: membership.membership_type,
            startDate: membership.activation_date,
            endDate: membership.expiration_date,
            status: membership.status,
            services: {
                total: membership.total_services,
                used: membership.used_services || 0,
                remaining: membership.total_services - (membership.used_services || 0)
            }
        });

    } catch (error) {
        next(error);
    }
});

// GET /api/public/membership-types
router.get('/membership-types', async (req, res, next) => {
    try {
        const result = await db.query(`
            SELECT * FROM membership_types 
            ORDER BY price ASC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

// ============================================================================
// GESTIÓN DE CITAS PENDIENTES (para clientes autenticados)
// ============================================================================

// GET /api/public/client/:clientId/pending-appointments
// Obtener citas pendientes del cliente (fecha/hora >= ahora)
router.get('/client/:clientId/pending-appointments', async (req, res, next) => {
    try {
        const { clientId } = req.params;

        // Obtener citas pendientes (status scheduled/confirmed, fecha >= hoy)
        const result = await db.query(`
            SELECT 
                a.id,
                a.appointment_date,
                a.start_time,
                a.end_time,
                a.status,
                a.notes,
                a.created_at,
                s.id as service_id,
                s.name as service_name,
                s.price as service_price,
                s.duration_minutes as service_duration
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.client_id = $1
              AND a.status IN ('scheduled', 'confirmed', 'pending_deposit')
              AND (a.appointment_date > CURRENT_DATE 
                   OR (a.appointment_date = CURRENT_DATE 
                       AND a.start_time > CURRENT_TIME))
            ORDER BY a.appointment_date ASC, a.start_time ASC
            LIMIT 1
        `, [clientId]);

        if (result.rows.length === 0) {
            return res.json({
                success: true,
                hasPending: false,
                appointment: null
            });
        }

        const apt = result.rows[0];

        // Calcular si puede modificar/cancelar (mínimo 2 horas antes)
        const appointmentDateTime = new Date(`${apt.appointment_date}T${apt.start_time}`);
        const now = new Date();
        const hoursUntil = (appointmentDateTime - now) / (1000 * 60 * 60);
        const canModify = hoursUntil >= 2;

        res.json({
            success: true,
            hasPending: true,
            appointment: {
                id: apt.id,
                date: apt.appointment_date,
                time: apt.start_time,
                endTime: apt.end_time,
                status: apt.status,
                notes: apt.notes,
                createdAt: apt.created_at,
                service: {
                    id: apt.service_id,
                    name: apt.service_name,
                    price: apt.service_price,
                    duration: apt.service_duration
                },
                canModify,
                hoursUntil: Math.round(hoursUntil * 10) / 10
            }
        });

    } catch (error) {
        next(error);
    }
});

// PUT /api/public/appointments/:id - Modificar cita (fecha, hora, servicio)
router.put('/appointments/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { clientId, date, time, serviceId } = req.body;

        // Verificar que la cita existe y pertenece al cliente
        const aptCheck = await db.query(`
            SELECT a.*, c.name as client_name, c.phone as client_phone,
                   s.name as service_name, s.price as service_price
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN services s ON a.service_id = s.id
            WHERE a.id = $1 AND a.client_id = $2
        `, [id, clientId]);

        if (aptCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cita no encontrada'
            });
        }

        const oldApt = aptCheck.rows[0];

        // Verificar que faltan al menos 2 horas
        const oldDateTime = new Date(`${oldApt.appointment_date}T${oldApt.start_time}`);
        const now = new Date();
        const hoursUntil = (oldDateTime - now) / (1000 * 60 * 60);

        if (hoursUntil < 2) {
            return res.status(400).json({
                success: false,
                error: 'No es posible modificar la cita. Faltan menos de 2 horas. Por favor llama al 55 7343 2027.'
            });
        }

        // Obtener datos del nuevo servicio si cambió
        let newService = null;
        if (serviceId && serviceId !== oldApt.service_id) {
            const svcResult = await db.query('SELECT * FROM services WHERE id = $1', [serviceId]);
            if (svcResult.rows.length === 0) {
                return res.status(400).json({ success: false, error: 'Servicio no encontrado' });
            }
            newService = svcResult.rows[0];
        }

        const finalServiceId = serviceId || oldApt.service_id;
        const finalDate = date || oldApt.appointment_date;
        const finalTime = time || oldApt.start_time;
        const duration = newService ? newService.duration_minutes : oldApt.end_time ?
            (new Date(`2000-01-01T${oldApt.end_time}`) - new Date(`2000-01-01T${oldApt.start_time}`)) / 60000 : 60;

        // Calcular nueva hora de fin
        const startMinutes = parseInt(finalTime.split(':')[0]) * 60 + parseInt(finalTime.split(':')[1]);
        const endMinutes = startMinutes + duration;
        const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

        // Verificar disponibilidad (excluyendo esta cita)
        const conflictCheck = await db.query(`
            SELECT id FROM appointments 
            WHERE appointment_date = $1 
              AND id != $2
              AND status IN ('scheduled', 'confirmed', 'pending_deposit')
              AND (
                  (start_time <= $3 AND end_time > $3) OR
                  (start_time < $4 AND end_time >= $4) OR
                  (start_time >= $3 AND end_time <= $4)
              )
        `, [finalDate, id, finalTime, endTime]);

        if (conflictCheck.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'El horario seleccionado ya no está disponible. Por favor elige otro.'
            });
        }

        // Actualizar la cita
        await db.query(`
            UPDATE appointments 
            SET service_id = $1,
                appointment_date = $2,
                start_time = $3,
                end_time = $4,
                updated_at = NOW()
            WHERE id = $5
        `, [finalServiceId, finalDate, finalTime, endTime, id]);

        // Obtener datos actualizados
        const updatedResult = await db.query(`
            SELECT a.*, s.name as service_name, s.price as service_price
            FROM appointments a
            JOIN services s ON a.service_id = s.id
            WHERE a.id = $1
        `, [id]);

        const updatedApt = updatedResult.rows[0];

        // TODO: Enviar WhatsApp de confirmación al cliente y notificación al admin
        // Esto requiere importar whatsappService - se puede agregar después

        res.json({
            success: true,
            message: 'Cita modificada exitosamente',
            appointment: {
                id: updatedApt.id,
                date: updatedApt.appointment_date,
                time: updatedApt.start_time,
                service: {
                    id: updatedApt.service_id,
                    name: updatedApt.service_name,
                    price: updatedApt.service_price
                }
            },
            previous: {
                date: oldApt.appointment_date,
                time: oldApt.start_time,
                service: oldApt.service_name
            }
        });

    } catch (error) {
        next(error);
    }
});

// POST /api/public/appointments/:id/cancel - Cancelar cita
router.post('/appointments/:id/cancel', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { clientId, reason } = req.body;

        // Verificar que la cita existe y pertenece al cliente
        const aptCheck = await db.query(`
            SELECT a.*, c.name as client_name, c.phone as client_phone,
                   s.name as service_name, s.price as service_price
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            JOIN services s ON a.service_id = s.id
            WHERE a.id = $1 AND a.client_id = $2
        `, [id, clientId]);

        if (aptCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cita no encontrada'
            });
        }

        const apt = aptCheck.rows[0];

        // Verificar que faltan al menos 2 horas
        const aptDateTime = new Date(`${apt.appointment_date}T${apt.start_time}`);
        const now = new Date();
        const hoursUntil = (aptDateTime - now) / (1000 * 60 * 60);

        if (hoursUntil < 2) {
            return res.status(400).json({
                success: false,
                error: 'No es posible cancelar la cita. Faltan menos de 2 horas. Por favor llama al 55 7343 2027.'
            });
        }

        // Cancelar la cita
        await db.query(`
            UPDATE appointments 
            SET status = 'cancelled',
                notes = COALESCE(notes, '') || ' | Cancelado por cliente: ' || COALESCE($1, 'Sin motivo'),
                updated_at = NOW()
            WHERE id = $2
        `, [reason || null, id]);

        // Crear notificación para admin
        await db.query(`
            INSERT INTO notifications (type, title, message, data, created_at)
            VALUES ($1, $2, $3, $4, NOW())
        `, [
            'cita_cancelada',
            'Cita Cancelada por Cliente',
            `${apt.client_name} canceló: ${apt.service_name} - ${apt.appointment_date} ${apt.start_time}`,
            JSON.stringify({
                appointmentId: id,
                clientName: apt.client_name,
                clientPhone: apt.client_phone,
                serviceName: apt.service_name,
                date: apt.appointment_date,
                time: apt.start_time,
                cancelReason: reason || null
            })
        ]);

        // TODO: Enviar WhatsApp de confirmación al cliente y al admin

        res.json({
            success: true,
            message: 'Cita cancelada exitosamente',
            cancelled: {
                id: apt.id,
                date: apt.appointment_date,
                time: apt.start_time,
                service: apt.service_name
            }
        });

    } catch (error) {
        next(error);
    }
});

export default router;


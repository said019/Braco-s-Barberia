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

export default router;

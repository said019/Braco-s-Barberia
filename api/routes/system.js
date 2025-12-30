import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// Helper to safely clear a table
const safeClearTable = async (client, tableName) => {
    try {
        // Check if table exists
        const check = await client.query(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
            [tableName]
        );

        if (check.rows[0].exists) {
            console.log(`Clearing table: ${tableName}`);
            await client.query(`DELETE FROM ${tableName}`);

            // Try to restart sequence, ignore if it fails (e.g. no sequence)
            try {
                await client.query(`ALTER SEQUENCE ${tableName}_id_seq RESTART WITH 1`);
            } catch (seqError) {
                console.log(`No sequence to restart for ${tableName} or error:`, seqError.message);
            }
        } else {
            console.log(`Table ${tableName} does not exist, skipping.`);
        }
    } catch (error) {
        console.warn(`Skipping ${tableName}:`, error.message);
    }
};

// WIPE DATABASE ROUTE (TEMPORARY)
router.post('/wipe-database-danger', async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Use safe clear for all tables
        await safeClearTable(client, 'payments');
        await safeClearTable(client, 'appointments');
        await safeClearTable(client, 'memberships');
        await safeClearTable(client, 'clients');

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Limpieza completada exitosamente.'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error wiping database:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        client.release();
    }
});

// REMINDER DIAGNOSTIC ROUTE
router.get('/reminder-debug', async (req, res) => {
    const client = await pool.connect();
    try {
        // 1. Current time info
        const timeInfo = await client.query(`
            SELECT
                NOW() as utc_now,
                NOW() AT TIME ZONE 'America/Mexico_City' as mexico_now,
                (NOW() AT TIME ZONE 'America/Mexico_City') + INTERVAL '20 hours' as window_start,
                (NOW() AT TIME ZONE 'America/Mexico_City') + INTERVAL '28 hours' as window_end
        `);

        // 2. Upcoming appointments that need reminders
        const pendingReminders = await client.query(`
            SELECT
                a.id,
                a.appointment_date,
                a.start_time,
                (a.appointment_date || ' ' || a.start_time)::timestamp as appointment_datetime,
                a.status,
                a.reminder_sent,
                c.name as client_name,
                c.phone,
                c.whatsapp_enabled
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            WHERE a.status IN ('scheduled', 'confirmed')
              AND a.reminder_sent = FALSE
            ORDER BY a.appointment_date, a.start_time
            LIMIT 10
        `);

        // 3. Check which ones fall in the window
        const inWindow = await client.query(`
            SELECT
                a.id,
                a.appointment_date,
                a.start_time,
                c.name as client_name,
                c.phone,
                c.whatsapp_enabled,
                CASE
                    WHEN c.whatsapp_enabled = FALSE THEN 'WhatsApp disabled'
                    WHEN c.phone IS NULL THEN 'No phone'
                    WHEN (a.appointment_date || ' ' || a.start_time)::timestamp < (NOW() AT TIME ZONE 'America/Mexico_City') + INTERVAL '20 hours' THEN 'Too early (< 20h)'
                    WHEN (a.appointment_date || ' ' || a.start_time)::timestamp > (NOW() AT TIME ZONE 'America/Mexico_City') + INTERVAL '28 hours' THEN 'Too late (> 28h)'
                    ELSE 'IN WINDOW - Should send!'
                END as status_reason
            FROM appointments a
            JOIN clients c ON a.client_id = c.id
            WHERE a.status IN ('scheduled', 'confirmed')
              AND a.reminder_sent = FALSE
            ORDER BY a.appointment_date, a.start_time
            LIMIT 10
        `);

        res.json({
            success: true,
            server_time: timeInfo.rows[0],
            pending_reminders: pendingReminders.rows,
            window_analysis: inWindow.rows
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

// DB DIAGNOSTIC ROUTE
router.get('/db-status', async (req, res) => {
    const client = await pool.connect();
    try {
        const tables = ['clients', 'appointments', 'memberships', 'payments', 'services', 'products'];
        const status = {};

        for (const table of tables) {
            // Check if table exists
            const check = await client.query(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
                [table]
            );

            if (check.rows[0].exists) {
                const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
                status[table] = {
                    exists: true,
                    count: parseInt(count.rows[0].count),
                    columns: (await client.query(`
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_name = '${table}'
                    `)).rows.map(r => `${r.column_name} (${r.data_type})`)
                };
            } else {
                status[table] = { exists: false };
            }
        }

        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        client.release();
    }
});

export default router;

import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

// WIPE DATABASE ROUTE (TEMPORARY)
router.post('/wipe-database-danger', async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Delete data
        await client.query('DELETE FROM payments');
        await client.query('DELETE FROM appointments');
        await client.query('DELETE FROM memberships');
        await client.query('DELETE FROM clients');

        // Reset sequences
        await client.query('ALTER SEQUENCE clients_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE appointments_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE memberships_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE payments_id_seq RESTART WITH 1');

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'DATABASE WIPED SUCCESSFULLY. All data has been deleted and IDs reset.'
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

export default router;

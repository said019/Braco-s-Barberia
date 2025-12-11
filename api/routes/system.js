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

export default router;

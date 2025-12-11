import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../api/.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function clearDatabase() {
    const client = await pool.connect();

    try {
        console.log('🗑️  Limpiando base de datos...\n');

        await client.query('BEGIN');

        // Delete in correct order to respect foreign keys
        console.log('Eliminando pagos...');
        const payments = await client.query('DELETE FROM payments');
        console.log(`✅ ${payments.rowCount} pagos eliminados`);

        console.log('Eliminando citas...');
        const appointments = await client.query('DELETE FROM appointments');
        console.log(`✅ ${appointments.rowCount} citas eliminadas`);

        console.log('Eliminando membresías...');
        const memberships = await client.query('DELETE FROM memberships');
        console.log(`✅ ${memberships.rowCount} membresías eliminadas`);

        console.log('Eliminando clientes...');
        const clients = await client.query('DELETE FROM clients');
        console.log(`✅ ${clients.rowCount} clientes eliminados`);

        // Reset sequences
        console.log('\nReiniciando secuencias...');
        await client.query('ALTER SEQUENCE clients_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE appointments_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE memberships_id_seq RESTART WITH 1');
        await client.query('ALTER SEQUENCE payments_id_seq RESTART WITH 1');
        console.log('✅ Secuencias reiniciadas');

        await client.query('COMMIT');

        console.log('\n✨ Base de datos limpiada exitosamente!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error al limpiar la base de datos:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the clear
clearDatabase().catch(err => {
    console.error(err);
    process.exit(1);
});

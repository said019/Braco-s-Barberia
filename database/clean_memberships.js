import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'bracos_barberia',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || ''
});

async function cleanMemberships() {
    try {
        await client.connect();

        console.log('⚠️  ATENCIÓN: Borrando todas las membresías en:', process.env.DB_HOST || 'localhost');
        console.log('Esperando 3 segundos antes de continuar...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 1. Delete membership usage history
        const usageRes = await client.query('DELETE FROM membership_usage');
        console.log(`Deleted ${usageRes.rowCount} usage records.`);

        // 2. Delete transactions related to memberships
        const transRes = await client.query("DELETE FROM transactions WHERE type = 'membership'");
        console.log(`Deleted ${transRes.rowCount} membership transactions.`);

        // 3. Delete client memberships
        const memRes = await client.query('DELETE FROM client_memberships');
        console.log(`Deleted ${memRes.rowCount} memberships.`);

        // 4. Reset client types to 'normal' (ID 1)
        const clientsRes = await client.query("UPDATE clients SET client_type_id = 1 WHERE client_type_id > 1");
        console.log(`Reset ${clientsRes.rowCount} clients to type 'normal'.`);

        console.log('✅ Limpieza completada.');

    } catch (err) {
        console.error('Error cleaning up:', err);
    } finally {
        await client.end();
    }
}

cleanMemberships();

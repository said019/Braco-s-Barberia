import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : undefined
});

async function runSeed() {
    try {
        await client.connect();
        console.log('✓ Conectado a PostgreSQL (Railway/Remote)');

        const sqlFile = path.join(__dirname, 'seed_products_list.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('Ejecutando seed de productos...');
        await client.query(sql);
        console.log('✓ Productos insertados correctamente');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

runSeed();

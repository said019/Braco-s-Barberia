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
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'bracos_barberia',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || ''
});

async function runSeed() {
    try {
        await client.connect();
        console.log('✓ Conectado a PostgreSQL');

        const sqlFile = path.join(__dirname, 'seed_missing_memberships.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('Ejecutando seed...');
        await client.query(sql);
        console.log('✓ Membresías insertadas correctamente');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

runSeed();

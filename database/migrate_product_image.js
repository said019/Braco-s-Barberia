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
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DATABASE_URL ? undefined : (process.env.DB_HOST || 'localhost'),
    port: process.env.DATABASE_URL ? undefined : (process.env.DB_PORT || 5432),
    database: process.env.DATABASE_URL ? undefined : (process.env.DB_NAME || 'bracos_barberia'),
    user: process.env.DATABASE_URL ? undefined : (process.env.DB_USER || 'postgres'),
    password: process.env.DATABASE_URL ? undefined : (process.env.DB_PASSWORD || undefined),
    ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : undefined
});

async function runMigration() {
    try {
        await client.connect();
        console.log('✓ Conectado a PostgreSQL');

        const sqlFile = path.join(__dirname, 'add_image_url.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('Ejecutando migración...');
        await client.query(sql);
        console.log('✓ Columna image_url agregada correctamente');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

runMigration();

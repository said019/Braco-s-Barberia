import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../api/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    console.log('🚀 Agregando columna birthdate...');

    try {
        const sqlPath = path.join(__dirname, 'add_birthdate_column.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);
        console.log('✅ Migración de birthdate completada.');

    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

runMigration();

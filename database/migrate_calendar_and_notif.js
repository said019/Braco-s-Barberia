import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../api/config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    console.log('🚀 Iniciando migración de Google Calendar...');

    try {
        const sqlPath = path.join(__dirname, 'add_google_calendar_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📖 Leyendo archivo SQL...');

        await pool.query(sql);

        console.log('✅ Migración completada exitosamente.');

        // También ejecutar la migración de preferencias de notificación si no se ha hecho
        try {
            const notifSqlPath = path.join(__dirname, 'add_notification_preferences.sql');
            const notifSql = fs.readFileSync(notifSqlPath, 'utf8');
            console.log('📖 Leyendo archivo de preferencias de notificación...');
            await pool.query(notifSql);
            console.log('✅ Migración de preferencias de notificación completada.');
        } catch (err) {
            console.log('ℹ️ La migración de preferencias de notificación ya podría haber sido aplicada o falló (no crítica):', err.message);
        }

    } catch (error) {
        console.error('❌ Error durante la migración:', error.message);
        if (error.detail) console.error('Detalle:', error.detail);
    } finally {
        await pool.end();
        process.exit();
    }
}

runMigration();

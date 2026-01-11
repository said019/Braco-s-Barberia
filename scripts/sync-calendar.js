#!/usr/bin/env node
// ============================================================================
// BRACO'S BARBERÍA - SCRIPT DE SINCRONIZACIÓN DE GOOGLE CALENDAR
// ============================================================================
// Este script puede ser ejecutado por una IA o cron job para sincronizar
// las citas con Google Calendar.
//
// Uso:
//   node scripts/sync-calendar.js                    # Sincroniza próximos 30 días
//   node scripts/sync-calendar.js --days=7           # Sincroniza próximos 7 días
//   node scripts/sync-calendar.js --from=2026-01-01 --to=2026-01-31
//
// Variables de entorno requeridas:
//   - DATABASE_URL
//   - GOOGLE_CLIENT_ID
//   - GOOGLE_CLIENT_SECRET
//   - GOOGLE_REDIRECT_URI
//   - GOOGLE_CALENDAR_ID (opcional, usa 'primary' por defecto)
// ============================================================================

import 'dotenv/config';
import { google } from 'googleapis';
import pg from 'pg';

const { Pool } = pg;

// ============================
// CONFIGURACIÓN
// ============================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// ============================
// UTILIDADES
// ============================

const log = (level, message, data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, ...(data && { data }) };
    console.log(JSON.stringify(logEntry));
};

const formatDate = (date) => {
    if (typeof date === 'string') return date.split('T')[0];
    const pad = (n) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const getColorByStatus = (status) => {
    const colors = {
        'pending': '11',      // Rojo
        'scheduled': '9',     // Azul
        'confirmed': '10',    // Verde
        'in_progress': '5',   // Amarillo
        'completed': '2',     // Verde claro
        'cancelled': '8',     // Gris
        'no_show': '8'        // Gris
    };
    return colors[status] || '1';
};

// ============================
// CARGAR CREDENCIALES
// ============================

async function loadCredentials() {
    const result = await pool.query(
        'SELECT refresh_token, access_token, is_connected FROM google_calendar_config WHERE id = 1'
    );

    if (result.rows.length === 0 || !result.rows[0].is_connected) {
        throw new Error('Google Calendar no está conectado. Conecta primero desde el panel de admin.');
    }

    const { refresh_token, access_token } = result.rows[0];
    oauth2Client.setCredentials({ refresh_token, access_token });

    // Auto-refresh de tokens
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.refresh_token) {
            await pool.query(
                'UPDATE google_calendar_config SET refresh_token = $1 WHERE id = 1',
                [tokens.refresh_token]
            );
        }
        if (tokens.access_token) {
            await pool.query(
                'UPDATE google_calendar_config SET access_token = $1, token_expiry = $2 WHERE id = 1',
                [tokens.access_token, tokens.expiry_date ? new Date(tokens.expiry_date) : null]
            );
        }
    });

    log('INFO', 'Credenciales cargadas correctamente');
}

// ============================
// CREAR EVENTO
// ============================

async function createEvent(appointment) {
    const dateStr = formatDate(appointment.appointment_date);
    const startTime = appointment.start_time.length === 5 ? appointment.start_time + ':00' : appointment.start_time;
    const endTime = appointment.end_time.length === 5 ? appointment.end_time + ':00' : appointment.end_time;

    const event = {
        summary: `${appointment.service_name} - ${appointment.client_name}`,
        description: [
            `📋 Cita en Braco's Barbería`,
            ``,
            `👤 Cliente: ${appointment.client_name}`,
            `📞 Teléfono: ${appointment.client_phone || 'N/A'}`,
            `💈 Servicio: ${appointment.service_name}`,
            `📝 Notas: ${appointment.notes || 'N/A'}`,
            ``,
            `🔖 Código: ${appointment.checkout_code || 'N/A'}`
        ].join('\n'),
        start: { dateTime: `${dateStr}T${startTime}`, timeZone: 'America/Mexico_City' },
        end: { dateTime: `${dateStr}T${endTime}`, timeZone: 'America/Mexico_City' },
        colorId: getColorByStatus(appointment.status),
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 60 }] }
    };

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    const response = await calendar.events.insert({ calendarId, resource: event });

    await pool.query(`
        INSERT INTO google_calendar_mapping (appointment_id, google_event_id, last_synced_at, sync_status)
        VALUES ($1, $2, CURRENT_TIMESTAMP, 'synced')
        ON CONFLICT (appointment_id, google_event_id) DO UPDATE SET
            last_synced_at = CURRENT_TIMESTAMP, sync_status = 'synced'
    `, [appointment.id, response.data.id]);

    return response.data;
}

// ============================
// ACTUALIZAR EVENTO
// ============================

async function updateEvent(appointmentId, appointment) {
    // Si está cancelada, eliminar
    if (appointment.status === 'cancelled' || appointment.status === 'no_show') {
        await deleteEvent(appointmentId);
        return { deleted: true };
    }

    const mapping = await pool.query(
        'SELECT google_event_id FROM google_calendar_mapping WHERE appointment_id = $1',
        [appointmentId]
    );

    if (mapping.rows.length === 0) {
        return await createEvent(appointment);
    }

    const eventId = mapping.rows[0].google_event_id;
    const dateStr = formatDate(appointment.appointment_date);
    const startTime = appointment.start_time.length === 5 ? appointment.start_time + ':00' : appointment.start_time;
    const endTime = appointment.end_time.length === 5 ? appointment.end_time + ':00' : appointment.end_time;

    const event = {
        summary: `${appointment.service_name} - ${appointment.client_name}`,
        description: [
            `📋 Cita en Braco's Barbería`,
            ``,
            `👤 Cliente: ${appointment.client_name}`,
            `📞 Teléfono: ${appointment.client_phone || 'N/A'}`,
            `💈 Servicio: ${appointment.service_name}`,
            `📊 Estado: ${appointment.status}`,
            `📝 Notas: ${appointment.notes || 'N/A'}`,
            ``,
            `🔖 Código: ${appointment.checkout_code || 'N/A'}`
        ].join('\n'),
        start: { dateTime: `${dateStr}T${startTime}`, timeZone: 'America/Mexico_City' },
        end: { dateTime: `${dateStr}T${endTime}`, timeZone: 'America/Mexico_City' },
        colorId: getColorByStatus(appointment.status)
    };

    try {
        const response = await calendar.events.update({
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            eventId,
            resource: event
        });

        await pool.query(`
            UPDATE google_calendar_mapping
            SET last_synced_at = CURRENT_TIMESTAMP, sync_status = 'synced', error_message = NULL
            WHERE appointment_id = $1
        `, [appointmentId]);

        return response.data;
    } catch (error) {
        if (error.code === 404) {
            await pool.query('DELETE FROM google_calendar_mapping WHERE appointment_id = $1', [appointmentId]);
            return await createEvent(appointment);
        }
        throw error;
    }
}

// ============================
// ELIMINAR EVENTO
// ============================

async function deleteEvent(appointmentId) {
    const mapping = await pool.query(
        'SELECT google_event_id FROM google_calendar_mapping WHERE appointment_id = $1',
        [appointmentId]
    );

    if (mapping.rows.length === 0) return;

    const eventId = mapping.rows[0].google_event_id;

    try {
        await calendar.events.delete({
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            eventId
        });
    } catch (error) {
        if (error.code !== 404) throw error;
    }

    await pool.query('DELETE FROM google_calendar_mapping WHERE appointment_id = $1', [appointmentId]);
}

// ============================
// SINCRONIZACIÓN PRINCIPAL
// ============================

async function syncCalendar(startDate, endDate) {
    log('INFO', '🚀 Iniciando sincronización de Google Calendar', { startDate, endDate });

    await loadCredentials();

    // Obtener citas en el rango
    const result = await pool.query(`
        SELECT a.*, c.name as client_name, c.phone as client_phone, s.name as service_name
        FROM appointments a
        JOIN clients c ON a.client_id = c.id
        JOIN services s ON a.service_id = s.id
        WHERE a.appointment_date >= $1 AND a.appointment_date <= $2
          AND a.status NOT IN ('cancelled', 'no_show')
        ORDER BY a.appointment_date, a.start_time
    `, [startDate, endDate]);

    log('INFO', `📅 Encontradas ${result.rows.length} citas para sincronizar`);

    let synced = 0, failed = 0;
    const errors = [];

    for (const appointment of result.rows) {
        try {
            const existing = await pool.query(
                'SELECT google_event_id FROM google_calendar_mapping WHERE appointment_id = $1',
                [appointment.id]
            );

            if (existing.rows.length > 0) {
                await updateEvent(appointment.id, appointment);
                log('INFO', `✏️ Actualizada cita #${appointment.id}`);
            } else {
                await createEvent(appointment);
                log('INFO', `✅ Creada cita #${appointment.id}`);
            }
            synced++;
        } catch (error) {
            log('ERROR', `❌ Error sincronizando cita #${appointment.id}`, { error: error.message });
            failed++;
            errors.push({ appointmentId: appointment.id, error: error.message });
        }
    }

    // Actualizar timestamp de última sincronización
    await pool.query('UPDATE google_calendar_config SET last_sync_at = CURRENT_TIMESTAMP WHERE id = 1');

    const summary = { total: result.rows.length, synced, failed, errors };
    log('INFO', '🎉 Sincronización completada', summary);

    return summary;
}

// ============================
// PARSEO DE ARGUMENTOS
// ============================

function parseArgs() {
    const args = process.argv.slice(2);
    const params = {};

    for (const arg of args) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=');
            params[key] = value;
        }
    }

    return params;
}

// ============================
// EJECUCIÓN
// ============================

async function main() {
    try {
        const params = parseArgs();

        let startDate, endDate;

        if (params.from && params.to) {
            startDate = params.from;
            endDate = params.to;
        } else {
            const days = parseInt(params.days) || 30;
            const today = new Date();
            startDate = formatDate(today);
            const futureDate = new Date(today);
            futureDate.setDate(futureDate.getDate() + days);
            endDate = formatDate(futureDate);
        }

        const result = await syncCalendar(startDate, endDate);

        // Salir con código apropiado
        process.exit(result.failed > 0 ? 1 : 0);

    } catch (error) {
        log('ERROR', '💥 Error fatal en sincronización', { error: error.message, stack: error.stack });
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();

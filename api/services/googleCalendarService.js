import { google } from 'googleapis';
import db from '../config/database.js';

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

/**
 * Get Google OAuth authorization URL
 */
export const getAuthUrl = () => {
    const scopes = [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
    ];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent' // Force to get refresh token
    });
};

/**
 * Handle OAuth callback and save tokens
 */
export const handleCallback = async (code) => {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Save or update tokens in database
    await db.query(`
    INSERT INTO google_calendar_config (id, refresh_token, access_token, token_expiry, is_connected)
    VALUES (1, $1, $2, $3, true)
    ON CONFLICT (id) DO UPDATE SET
      refresh_token = COALESCE($1, google_calendar_config.refresh_token),
      access_token = $2,
      token_expiry = $3,
      is_connected = true,
      updated_at = CURRENT_TIMESTAMP
  `, [
        tokens.refresh_token,
        tokens.access_token,
        tokens.expiry_date ? new Date(tokens.expiry_date) : null
    ]);

    return tokens;
};

/**
 * Load credentials from database
 */
const loadCredentials = async () => {
    const result = await db.query(
        'SELECT refresh_token, access_token, is_connected FROM google_calendar_config WHERE id = 1'
    );

    if (result.rows.length === 0 || !result.rows[0].is_connected) {
        throw new Error('Google Calendar not connected');
    }

    const { refresh_token, access_token } = result.rows[0];

    oauth2Client.setCredentials({
        refresh_token,
        access_token
    });

    // Auto-refresh access token if needed
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.refresh_token) {
            await db.query(
                'UPDATE google_calendar_config SET refresh_token = $1 WHERE id = 1',
                [tokens.refresh_token]
            );
        }
        if (tokens.access_token) {
            await db.query(
                'UPDATE google_calendar_config SET access_token = $1, token_expiry = $2 WHERE id = 1',
                [tokens.access_token, tokens.expiry_date ? new Date(tokens.expiry_date) : null]
            );
        }
    });
};

/**
 * Get color ID by appointment status
 */
const getColorByStatus = (status) => {
    const colors = {
        'pending': '11',      // Red
        'scheduled': '9',     // Blue
        'confirmed': '10',    // Green
        'in_progress': '5',   // Yellow
        'completed': '2',     // Green light
        'cancelled': '8',     // Gray
        'no_show': '8'        // Gray
    };
    return colors[status] || '1';
};

/**
 * Create Google Calendar event from appointment
 */
// Helper to format date YYYY-MM-DD
const formatDate = (date) => {
    if (typeof date === 'string') return date.split('T')[0];
    if (date instanceof Date) {
        // Use local year/month/day to avoid UTC shifting
        // padding functions
        const pad = (n) => n < 10 ? '0' + n : n;
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }
    return date; // fallback
};

export const createEvent = async (appointment) => {
    await loadCredentials();

    const dateStr = formatDate(appointment.appointment_date);

    // Validate times
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
        start: {
            dateTime: `${dateStr}T${startTime}`,
            timeZone: 'America/Mexico_City',
        },
        end: {
            dateTime: `${dateStr}T${endTime}`,
            timeZone: 'America/Mexico_City',
        },
        colorId: getColorByStatus(appointment.status),
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 60 },      // 1 hour before
                { method: 'popup', minutes: 1440 },    // 1 day before
            ],
        },
    };

    try {
        const response = await calendar.events.insert({
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            resource: event,
        });

        // Save mapping
        await db.query(`
      INSERT INTO google_calendar_mapping (appointment_id, google_event_id, last_synced_at, sync_status)
      VALUES ($1, $2, CURRENT_TIMESTAMP, 'synced')
      ON CONFLICT (appointment_id, google_event_id) DO UPDATE SET
        last_synced_at = CURRENT_TIMESTAMP,
        sync_status = 'synced'
    `, [appointment.id, response.data.id]);

        console.log(`[GCAL] Created event ${response.data.id} for appointment ${appointment.id}`);

        return response.data;
    } catch (error) {
        console.error('[GCAL] Error creating event:', error.message);

        // Save error in mapping
        await db.query(`
      INSERT INTO google_calendar_mapping (appointment_id, google_event_id, sync_status, error_message)
      VALUES ($1, $2, 'failed', $3)
      ON CONFLICT (appointment_id, google_event_id) DO UPDATE SET
        sync_status = 'failed',
        error_message = $3
    `, [appointment.id, 'temp_' + appointment.id, error.message]);

        throw error;
    }
};

/**
 * Update Google Calendar event
 */
export const updateEvent = async (appointmentId, appointment) => {
    await loadCredentials();

    // Get existing mapping
    const mapping = await db.query(
        'SELECT google_event_id FROM google_calendar_mapping WHERE appointment_id = $1',
        [appointmentId]
    );

    if (mapping.rows.length === 0) {
        // Event doesn't exist, create it
        return await createEvent(appointment);
    }

    const eventId = mapping.rows[0].google_event_id;

    const dateStr = formatDate(appointment.appointment_date);
    // Validate times
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
        start: {
            dateTime: `${dateStr}T${startTime}`,
            timeZone: 'America/Mexico_City',
        },
        end: {
            dateTime: `${dateStr}T${endTime}`,
            timeZone: 'America/Mexico_City',
        },
        colorId: getColorByStatus(appointment.status),
    };

    try {
        const response = await calendar.events.update({
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            eventId: eventId,
            resource: event,
        });

        // Update mapping
        await db.query(`
      UPDATE google_calendar_mapping
      SET last_synced_at = CURRENT_TIMESTAMP, sync_status = 'synced', error_message = NULL
      WHERE appointment_id = $1
    `, [appointmentId]);

        console.log(`[GCAL] Updated event ${eventId} for appointment ${appointmentId}`);

        return response.data;
    } catch (error) {
        console.error('[GCAL] Error updating event:', error.message);

        // Update error
        await db.query(`
      UPDATE google_calendar_mapping
      SET sync_status = 'failed', error_message = $2
      WHERE appointment_id = $1
    `, [appointmentId, error.message]);

        throw error;
    }
};

/**
 * Delete Google Calendar event
 */
export const deleteEvent = async (appointmentId) => {
    await loadCredentials();

    const mapping = await db.query(
        'SELECT google_event_id FROM google_calendar_mapping WHERE appointment_id = $1',
        [appointmentId]
    );

    if (mapping.rows.length === 0) {
        console.log(`[GCAL] No mapping found for appointment ${appointmentId}`);
        return;
    }

    const eventId = mapping.rows[0].google_event_id;

    try {
        await calendar.events.delete({
            calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
            eventId: eventId,
        });

        // Delete mapping
        await db.query(
            'DELETE FROM google_calendar_mapping WHERE appointment_id = $1',
            [appointmentId]
        );

        console.log(`[GCAL] Deleted event ${eventId} for appointment ${appointmentId}`);
    } catch (error) {
        console.error('[GCAL] Error deleting event:', error.message);
        throw error;
    }
};

/**
 * Sync all appointments to Google Calendar
 */
export const syncAllAppointments = async (startDate, endDate) => {
    await loadCredentials();

    // Get appointments in date range
    const result = await db.query(`
    SELECT a.*, c.name as client_name, c.phone as client_phone,
           s.name as service_name
    FROM appointments a
    JOIN clients c ON a.client_id = c.id
    JOIN services s ON a.service_id = s.id
    WHERE a.appointment_date >= $1
      AND a.appointment_date <= $2
      AND a.status NOT IN ('cancelled', 'no_show')
    ORDER BY a.appointment_date, a.start_time
  `, [startDate, endDate]);

    let synced = 0;
    let failed = 0;
    const errors = [];

    for (const appointment of result.rows) {
        try {
            // Check if already has mapping
            const existing = await db.query(
                'SELECT google_event_id FROM google_calendar_mapping WHERE appointment_id = $1',
                [appointment.id]
            );

            if (existing.rows.length > 0) {
                await updateEvent(appointment.id, appointment);
            } else {
                await createEvent(appointment);
            }

            synced++;
        } catch (error) {
            console.error(`[GCAL] Failed to sync appointment ${appointment.id}:`, error.message);
            failed++;
            errors.push(`Cita ${appointment.id}: ${error.message}`);
        }
    }

    // Update last sync timestamp
    await db.query(
        'UPDATE google_calendar_config SET last_sync_at = CURRENT_TIMESTAMP WHERE id = 1'
    );

    return {
        total: result.rows.length,
        synced,
        failed,
        errors
    };
};

/**
 * Check if Google Calendar is connected
 */
export const isConnected = async () => {
    const result = await db.query(
        'SELECT is_connected FROM google_calendar_config WHERE id = 1'
    );

    return result.rows.length > 0 && result.rows[0].is_connected === true;
};

/**
 * Disconnect Google Calendar
 */
export const disconnect = async () => {
    await db.query(
        'UPDATE google_calendar_config SET is_connected = false WHERE id = 1'
    );
};

export default {
    getAuthUrl,
    handleCallback,
    createEvent,
    updateEvent,
    deleteEvent,
    syncAllAppointments,
    isConnected,
    disconnect
};

-- Google Calendar Integration Tables
-- Add support for Google Calendar synchronization

-- Table to store Google Calendar OAuth tokens and config
CREATE TABLE IF NOT EXISTS google_calendar_config (
    id SERIAL PRIMARY KEY,
    refresh_token TEXT,
    access_token TEXT,
    token_expiry TIMESTAMP,
    calendar_id VARCHAR(255) DEFAULT 'primary',
    is_connected BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to map appointments to Google Calendar events
CREATE TABLE IF NOT EXISTS google_calendar_mapping (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    google_event_id VARCHAR(255) NOT NULL UNIQUE,
    last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'synced', -- synced, pending, failed
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(appointment_id, google_event_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_gcal_mapping_appointment ON google_calendar_mapping(appointment_id);
CREATE INDEX IF NOT EXISTS idx_gcal_mapping_event ON google_calendar_mapping(google_event_id);
CREATE INDEX IF NOT EXISTS idx_gcal_mapping_status ON google_calendar_mapping(sync_status);

-- Comment
COMMENT ON TABLE google_calendar_config IS 'Stores Google Calendar OAuth credentials and configuration';
COMMENT ON TABLE google_calendar_mapping IS 'Maps Bracos appointments to Google Calendar events';

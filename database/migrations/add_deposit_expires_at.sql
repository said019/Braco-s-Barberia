-- Add deposit expiration column for auto-cancellation of pending appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_expires_at TIMESTAMPTZ;

-- Add index for faster cron job queries
CREATE INDEX IF NOT EXISTS idx_appointments_deposit_expires 
ON appointments(deposit_expires_at) 
WHERE status = 'pending';

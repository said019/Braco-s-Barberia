-- Add notification preference columns to clients table
-- This allows clients to opt-in/opt-out of WhatsApp and Email notifications

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT TRUE;

-- Update existing clients to have notifications enabled by default
UPDATE clients
SET whatsapp_enabled = TRUE, email_enabled = TRUE
WHERE whatsapp_enabled IS NULL OR email_enabled IS NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_notifications ON clients(whatsapp_enabled, email_enabled);

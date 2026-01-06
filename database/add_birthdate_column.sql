-- Add birthdate column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_clients_birthdate ON clients(birthdate);

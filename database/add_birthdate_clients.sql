-- Add birthdate column to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS birthdate DATE;

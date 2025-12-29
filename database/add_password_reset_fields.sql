-- =============================================================================
-- Migración: Agregar campos para recuperación de contraseña en admin_users
-- =============================================================================

-- Agregar columna email
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS email VARCHAR(100);

-- Agregar columna para token de reset
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS reset_token VARCHAR(100);

-- Agregar columna para expiración del token
ALTER TABLE admin_users 
ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;

-- Crear índice para búsqueda rápida por email
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- Crear índice para búsqueda rápida por token
CREATE INDEX IF NOT EXISTS idx_admin_users_reset_token ON admin_users(reset_token);

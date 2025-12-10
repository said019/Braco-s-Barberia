-- =============================================
-- MIGRACIÓN: Agregar tracking de depósitos/anticipos
-- Fecha: 2025-12-09
-- Propósito: Registrar anticipos de clientes nuevos
-- =============================================

-- Agregar columnas para rastrear depósitos en citas
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deposit_paid_at TIMESTAMP;

-- Agregar columna de descuento por anticipo en checkouts
ALTER TABLE checkouts
ADD COLUMN IF NOT EXISTS deposit_applied DECIMAL(10,2) DEFAULT 0;

-- Índice para buscar citas pendientes de depósito
CREATE INDEX IF NOT EXISTS idx_appointments_deposit ON appointments(deposit_required, deposit_paid);

-- Comentarios de documentación
COMMENT ON COLUMN appointments.deposit_required IS 'Indica si la cita requiere depósito (clientes nuevos)';
COMMENT ON COLUMN appointments.deposit_amount IS 'Monto del depósito requerido';
COMMENT ON COLUMN appointments.deposit_paid IS 'Indica si el depósito fue pagado';
COMMENT ON COLUMN appointments.deposit_paid_at IS 'Fecha/hora en que se confirmó el depósito';
COMMENT ON COLUMN checkouts.deposit_applied IS 'Monto de depósito aplicado como descuento';

-- Verificación
SELECT 'Migración de depósitos completada exitosamente' as status;

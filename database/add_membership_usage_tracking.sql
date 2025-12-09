-- =============================================
-- MIGRACIÓN: Agregar tracking de valor a membership_usage
-- Fecha: 2025-12-09
-- Propósito: Permitir reportes separados de ingreso real vs valor prestado
-- =============================================

-- Agregar columnas para rastrear el valor económico de servicios prestados con membresía
ALTER TABLE membership_usage
ADD COLUMN IF NOT EXISTS service_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS stamps_used INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Crear índices para optimizar consultas de reportes
CREATE INDEX IF NOT EXISTS idx_membership_usage_date ON membership_usage(used_at);
CREATE INDEX IF NOT EXISTS idx_membership_usage_membership ON membership_usage(membership_id);

-- Actualizar registros existentes (si los hay) con valores por defecto
-- Esto es seguro porque solo afecta registros sin valor
UPDATE membership_usage mu
SET service_value = s.price
FROM services s
WHERE mu.service_id = s.id
  AND mu.service_value IS NULL;

-- Comentarios de documentación
COMMENT ON COLUMN membership_usage.service_value IS 'Valor monetario del servicio prestado (precio normal del servicio)';
COMMENT ON COLUMN membership_usage.stamps_used IS 'Cantidad de sellos/servicios consumidos de la membresía';
COMMENT ON COLUMN membership_usage.notes IS 'Notas adicionales sobre el uso';

-- Verificación
SELECT 'Migración completada exitosamente' as status;
SELECT COUNT(*) as registros_actualizados
FROM membership_usage
WHERE service_value IS NOT NULL;

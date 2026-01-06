-- =============================================
-- AGREGAR SOPORTE PARA BLOQUEO DE HORARIOS ESPECÍFICOS
-- Fecha: 2025-12-31
-- =============================================

-- Agregar columnas para horarios específicos
ALTER TABLE blocked_dates 
ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT NULL,
ADD COLUMN IF NOT EXISTS end_time TIME DEFAULT NULL;

-- Comentario: Si start_time y end_time son NULL, significa día completo bloqueado
-- Si tienen valores, solo ese rango de horas está bloqueado

-- Verificar estructura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'blocked_dates';

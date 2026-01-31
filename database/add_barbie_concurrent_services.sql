-- =============================================
-- BRACO'S BARBERÍA - SERVICIOS DE BARBIE CON RESERVA CONCURRENTE
-- =============================================
-- Este script permite que los servicios de Barbie (mascarillas, manicura, pedicura)
-- puedan reservarse aunque ya exista una cita de corte caballero, niño, barba o dúo.

-- 1. Agregar columna allow_concurrent a la tabla services
ALTER TABLE services ADD COLUMN IF NOT EXISTS allow_concurrent BOOLEAN DEFAULT FALSE;

-- 2. Agregar columna is_barber_service para identificar servicios del barbero principal
-- (corte caballero, niño, barba, dúo) que NO pueden tener citas simultáneas entre sí
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_barber_service BOOLEAN DEFAULT TRUE;

-- 3. Marcar servicios de Barbie como allow_concurrent = TRUE y is_barber_service = FALSE
-- Estos servicios pueden reservarse aunque ya haya una cita de barbero
UPDATE services SET allow_concurrent = TRUE, is_barber_service = FALSE
WHERE LOWER(name) LIKE '%mascarilla%'
   OR LOWER(name) LIKE '%manicura%'
   OR LOWER(name) LIKE '%pedicura%'
   OR LOWER(name) LIKE '%tic%'
   OR LOWER(name) LIKE '%terapia integral%';

-- 4. Asegurar que los servicios del barbero principal estén marcados correctamente
UPDATE services SET allow_concurrent = FALSE, is_barber_service = TRUE
WHERE LOWER(name) LIKE '%corte%caballero%'
   OR LOWER(name) LIKE '%corte%niño%'
   OR LOWER(name) LIKE '%barba%'
   OR LOWER(name) LIKE '%dúo%'
   OR LOWER(name) LIKE '%duo%';

-- 5. Verificar los cambios
SELECT id, name, category_id, allow_concurrent, is_barber_service 
FROM services 
WHERE is_active = TRUE
ORDER BY category_id, display_order;

-- NOTA: La lógica de disponibilidad ahora funcionará así:
-- - Si el servicio solicitado tiene allow_concurrent = TRUE:
--   Solo verificará conflictos con otras citas que también tengan allow_concurrent = TRUE
-- - Si el servicio solicitado tiene allow_concurrent = FALSE (barbero):
--   Verificará conflictos con TODAS las citas de barbero (is_barber_service = TRUE)

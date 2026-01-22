-- =============================================
-- MIGRACIÓN: Sistema de Servicios Extras (Add-ons)
-- Fecha: 2026-01-22
-- Descripción: Agrega soporte para servicios extras que solo
--              suman precio pero NO afectan duración de la cita.
-- =============================================

-- 1. Agregar columna is_extra a tabla services
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_extra BOOLEAN DEFAULT FALSE;

-- 2. Comentario descriptivo
COMMENT ON COLUMN services.is_extra IS 'Si es TRUE, el servicio es un extra/add-on que solo suma precio, no tiempo. No aparece en la web pública.';

-- 3. Crear tabla de relación cita-extras
CREATE TABLE IF NOT EXISTS appointment_extras (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
    service_id INTEGER REFERENCES services(id) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(appointment_id, service_id)
);

-- 4. Índice para consultas
CREATE INDEX IF NOT EXISTS idx_appointment_extras_appointment ON appointment_extras(appointment_id);

-- 5. Verificación
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'services' AND column_name = 'is_extra') THEN
        RAISE NOTICE '✓ Columna is_extra agregada correctamente a services';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointment_extras') THEN
        RAISE NOTICE '✓ Tabla appointment_extras creada correctamente';
    END IF;
END $$;

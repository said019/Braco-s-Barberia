-- Migración: Agregar sender_label a gift_certificates
-- Ejecutar si la tabla ya existe en producción sin esta columna

ALTER TABLE gift_certificates
    ADD COLUMN IF NOT EXISTS sender_label VARCHAR(100);

-- Esta columna almacena cómo quiere que aparezca el remitente en el certificado
-- Ejemplos: "tu papá", "tu tío", "Miguel Trujillo"
-- Si es NULL, se usa buyer_name como fallback

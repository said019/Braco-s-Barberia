-- Migración: Agregar campo image_url a productos
-- Fecha: 2026-01-10

-- Agregar columna image_url a la tabla products
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

-- Comentario descriptivo
COMMENT ON COLUMN products.image_url IS 'URL de la imagen del producto';

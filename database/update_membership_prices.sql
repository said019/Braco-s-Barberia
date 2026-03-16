-- =============================================
-- ACTUALIZACIÓN DE PRECIOS DE MEMBRESÍAS
-- Fecha: 2026-03-16
-- Golden Card Corte: $1,650
-- Golden NeoCapilar: $3,850
-- Black Card: $3,630
-- =============================================

-- Actualizar precio de Golden Card Corte
UPDATE membership_types 
SET price = 1650.00,
    updated_at = CURRENT_TIMESTAMP
WHERE name ILIKE '%golden%card%corte%' OR (name ILIKE '%golden%' AND name NOT ILIKE '%neo%' AND name NOT ILIKE '%TIC%');

-- Actualizar precio de Golden NeoCapilar
UPDATE membership_types 
SET price = 3850.00,
    updated_at = CURRENT_TIMESTAMP
WHERE name ILIKE '%neocapilar%' OR name ILIKE '%TIC%';

-- Actualizar precio de Black Card
UPDATE membership_types 
SET price = 3630.00,
    updated_at = CURRENT_TIMESTAMP
WHERE name ILIKE '%black%card%';

-- Verificar los cambios
SELECT id, name, price FROM membership_types ORDER BY display_order;

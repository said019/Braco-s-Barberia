-- =============================================
-- ACTUALIZACIÓN DE PRECIOS DE MEMBRESÍAS
-- Fecha: 2025-12-31
-- Golden NeoCapilar: $3,850
-- Black Card: $3,300
-- =============================================

-- Actualizar precio de Golden NeoCapilar
UPDATE membership_types 
SET price = 3850.00,
    updated_at = CURRENT_TIMESTAMP
WHERE name ILIKE '%neocapilar%' OR name ILIKE '%TIC%';

-- Actualizar precio de Black Card
UPDATE membership_types 
SET price = 3300.00,
    updated_at = CURRENT_TIMESTAMP
WHERE name ILIKE '%black%card%';

-- Verificar los cambios
SELECT id, name, price FROM membership_types ORDER BY display_order;

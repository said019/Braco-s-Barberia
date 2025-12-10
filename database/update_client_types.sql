-- =============================================
-- ACTUALIZACIÓN: Tipos de Cliente
-- Fecha: 2025-12-09
-- Nuevos tipos: Nuevo, Recurrente, Golden Card, NeoCapilar, Black Card
-- =============================================

-- Primero, actualizar los tipos existentes y agregar los nuevos
-- Nota: Esto preserva los IDs existentes para no romper relaciones

-- Actualizar tipo 1: normal -> nuevo
UPDATE client_types 
SET name = 'nuevo', 
    display_name = 'Nuevo', 
    color = '#64B5F6',
    description = 'Cliente nuevo (primera visita)',
    priority = 0,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Actualizar tipo 2: premium -> recurrente
UPDATE client_types 
SET name = 'recurrente', 
    display_name = 'Recurrente', 
    color = '#C4A35A',
    description = 'Cliente recurrente',
    priority = 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 2;

-- Actualizar tipo 3: vip -> golden_card
UPDATE client_types 
SET name = 'golden_card', 
    display_name = 'Golden Card', 
    color = '#FFD700',
    description = 'Miembro Golden Card',
    priority = 2,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 3;

-- Insertar o actualizar tipo 4: neocapilar
INSERT INTO client_types (id, name, display_name, color, description, priority)
VALUES (4, 'neocapilar', 'NeoCapilar', '#4CAF50', 'Miembro NeoCapilar', 3)
ON CONFLICT (id) DO UPDATE SET
    name = 'neocapilar',
    display_name = 'NeoCapilar',
    color = '#4CAF50',
    description = 'Miembro NeoCapilar',
    priority = 3,
    updated_at = CURRENT_TIMESTAMP;

-- Insertar o actualizar tipo 5: black_card
INSERT INTO client_types (id, name, display_name, color, description, priority)
VALUES (5, 'black_card', 'Black Card', '#1A1A1A', 'Miembro Black Card', 4)
ON CONFLICT (id) DO UPDATE SET
    name = 'black_card',
    display_name = 'Black Card',
    color = '#1A1A1A',
    description = 'Miembro Black Card',
    priority = 4,
    updated_at = CURRENT_TIMESTAMP;

-- Actualizar secuencia
SELECT setval('client_types_id_seq', (SELECT MAX(id) FROM client_types));

-- Verificar resultados
SELECT * FROM client_types ORDER BY priority;

-- Mensaje de confirmación
SELECT 'Tipos de cliente actualizados correctamente' as status;


-- =============================================
-- ACTUALIZAR MEMBERSHIP_TYPES para usar los nuevos client_type_id
-- =============================================

-- Golden Card Corte -> client_type_id = 3 (Golden Card)
UPDATE membership_types 
SET client_type_id = 3 
WHERE name ILIKE '%golden%corte%' OR name ILIKE '%golden card corte%';

-- Golden NeoCapilar -> client_type_id = 4 (NeoCapilar)
UPDATE membership_types 
SET client_type_id = 4 
WHERE name ILIKE '%neocapilar%' OR name ILIKE '%golden neocapilar%';

-- Black Card -> client_type_id = 5 (Black Card)
UPDATE membership_types 
SET client_type_id = 5 
WHERE name ILIKE '%black%card%';

-- Verificar membership_types
SELECT id, name, client_type_id, 
       (SELECT display_name FROM client_types WHERE id = membership_types.client_type_id) as tipo_cliente
FROM membership_types 
ORDER BY display_order;

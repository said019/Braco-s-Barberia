-- Script para actualizar membresías sin fecha de vencimiento
-- Las membresías expiran al usar todos los servicios, no por fecha

-- 1. Actualizar membresías activas existentes para quitar fecha de vencimiento
UPDATE client_memberships 
SET expiration_date = NULL 
WHERE status = 'active';

-- 2. Actualizar la vista de membresías activas para manejar NULL
DROP VIEW IF EXISTS active_memberships_view;

CREATE VIEW active_memberships_view AS
SELECT 
    cm.id,
    cm.client_id,
    c.name AS client_name,
    c.phone AS client_phone,
    mt.name AS membership_name,
    cm.total_services - cm.used_services AS remaining_services
FROM client_memberships cm
JOIN clients c ON cm.client_id = c.id
JOIN membership_types mt ON cm.membership_type_id = mt.id
WHERE cm.status = 'active'
AND (cm.expiration_date IS NULL OR cm.expiration_date >= CURRENT_DATE);

-- Verificar cambios
SELECT 
    cm.id,
    c.name as client_name,
    mt.name as membership_type,
    cm.expiration_date,
    cm.status,
    cm.total_services - cm.used_services as remaining_services
FROM client_memberships cm
JOIN clients c ON cm.client_id = c.id
JOIN membership_types mt ON cm.membership_type_id = mt.id
WHERE cm.status = 'active'
ORDER BY c.name;

-- Limpiar historial de uso de membresía
DELETE FROM membership_usage 
WHERE membership_id IN (
    SELECT id FROM client_memberships 
    WHERE client_id IN (SELECT id FROM clients WHERE phone IN ('4272757136', '4272757131'))
);

-- Desvincular membresías de checkouts para permitir borrado
UPDATE checkouts SET membership_id = NULL, used_membership = false 
WHERE client_id IN (SELECT id FROM clients WHERE phone IN ('4272757136', '4272757131'));

-- Borrar transacciones de membresía
DELETE FROM transactions 
WHERE type='membership' 
AND client_id IN (SELECT id FROM clients WHERE phone IN ('4272757136', '4272757131'));

-- Borrar membresías
DELETE FROM client_memberships 
WHERE client_id IN (SELECT id FROM clients WHERE phone IN ('4272757136', '4272757131'));

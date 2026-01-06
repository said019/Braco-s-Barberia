-- Limpiar datos de Pedro Hernandez para prueba TIC
DO $$
DECLARE
    client_uuid INTEGER;
BEGIN
    SELECT id INTO client_uuid FROM clients WHERE email = 'saidromero19+2@gmail.com' OR phone = '4271620358';
    
    IF client_uuid IS NOT NULL THEN
        -- Desvincular de checkouts
        UPDATE checkouts SET membership_id = NULL WHERE client_id = client_uuid;
        DELETE FROM checkout_products WHERE checkout_id IN (SELECT id FROM checkouts WHERE client_id = client_uuid);
        
        -- Borrar datos dependientes
        DELETE FROM transactions WHERE client_id = client_uuid;
        DELETE FROM membership_usage WHERE appointment_id IN (SELECT id FROM appointments WHERE client_id = client_uuid);
        -- Borrar uso de membresias del cliente borrar primero por membership_id
        DELETE FROM membership_usage WHERE membership_id IN (SELECT id FROM client_memberships WHERE client_id = client_uuid);

        DELETE FROM checkouts WHERE client_id = client_uuid;
        DELETE FROM appointments WHERE client_id = client_uuid;
        DELETE FROM client_memberships WHERE client_id = client_uuid;
        DELETE FROM clients WHERE id = client_uuid;
        
        RAISE NOTICE 'Cliente Pedro Hernandez eliminado correctamente.';
    ELSE
        RAISE NOTICE 'Cliente Pedro Hernandez no encontrado, nada que borrar.';
    END IF;
END $$;

-- Limpiar TODOS los usuarios de prueba
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN 
        SELECT id FROM clients 
        WHERE email IN ('saidromero19@gmail.com', 'saidromero19+1@gmail.com', 'saidromero19+2@gmail.com')
        OR phone IN ('4272757136', '4272757131', '4271620358')
    LOOP
        -- Desvincular de checkouts
        UPDATE checkouts SET membership_id = NULL WHERE client_id = rec.id;
        DELETE FROM checkout_products WHERE checkout_id IN (SELECT id FROM checkouts WHERE client_id = rec.id);
        
        -- Borrar datos dependientes
        DELETE FROM transactions WHERE client_id = rec.id;
        DELETE FROM membership_usage WHERE appointment_id IN (SELECT id FROM appointments WHERE client_id = rec.id);
        -- Borrar uso de membresias del cliente borrar primero por membership_id
        DELETE FROM membership_usage WHERE membership_id IN (SELECT id FROM client_memberships WHERE client_id = rec.id);

        DELETE FROM checkouts WHERE client_id = rec.id;
        DELETE FROM appointments WHERE client_id = rec.id;
        DELETE FROM client_memberships WHERE client_id = rec.id;
        DELETE FROM clients WHERE id = rec.id;
        
        RAISE NOTICE 'Cliente ID % eliminado.', rec.id;
    END LOOP;
END $$;

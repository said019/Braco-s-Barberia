-- Script SQL para limpiar toda la base de datos
-- Ejecuta esto en el Query Editor de Railway

-- Eliminar todos los datos
DELETE FROM payments;
DELETE FROM appointments;
DELETE FROM memberships;
DELETE FROM clients;

-- Reiniciar secuencias
ALTER SEQUENCE clients_id_seq RESTART WITH 1;
ALTER SEQUENCE appointments_id_seq RESTART WITH 1;
ALTER SEQUENCE memberships_id_seq RESTART WITH 1;
ALTER SEQUENCE payments_id_seq RESTART WITH 1;

-- Verificar que todo está limpio
SELECT 'clients' as table_name, COUNT(*) as count FROM clients
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'memberships', COUNT(*) FROM memberships
UNION ALL
SELECT 'payments', COUNT(*) FROM payments;

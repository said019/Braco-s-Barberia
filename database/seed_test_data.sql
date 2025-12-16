-- Limpiar datos de prueba anteriores si existen
DELETE FROM transactions WHERE client_id IN (SELECT id FROM clients WHERE phone IN ('4272757136', '4272757131'));
DELETE FROM checkouts WHERE client_id IN (SELECT id FROM clients WHERE phone IN ('4272757136', '4272757131'));
DELETE FROM client_memberships WHERE client_id IN (SELECT id FROM clients WHERE phone IN ('4272757136', '4272757131'));
DELETE FROM appointments WHERE client_id IN (SELECT id FROM clients WHERE phone IN ('4272757136', '4272757131'));
DELETE FROM clients WHERE phone IN ('4272757136', '4272757131');

-- 1. Crear Clientes
INSERT INTO clients (name, phone, email, client_type_id, total_visits, total_spent, created_at) VALUES 
('Said Romero', '4272757136', 'saidromero19@gmail.com', 1, 0, 0, CURRENT_TIMESTAMP),
('Cristopher Juarez', '4272757131', 'saidromero19+1@gmail.com', 1, 0, 0, CURRENT_TIMESTAMP);

-- 2. Agendar Citas (Said)
WITH c AS (SELECT id FROM clients WHERE phone = '4272757136')
INSERT INTO appointments (client_id, service_id, appointment_date, start_time, end_time, status, checkout_code) VALUES
((SELECT id FROM c), 1, CURRENT_DATE + 1, '10:00', '10:45', 'confirmed', 'SAID01'), -- Corte (Aprobada)
((SELECT id FROM c), 3, CURRENT_DATE + 2, '11:00', '11:30', 'scheduled', 'SAID02'), -- Barba
((SELECT id FROM c), 11, CURRENT_DATE + 3, '12:00', '13:00', 'scheduled', 'SAID03'); -- Duo

-- 3. Agendar Citas (Cristopher)
WITH c AS (SELECT id FROM clients WHERE phone = '4272757131')
INSERT INTO appointments (client_id, service_id, appointment_date, start_time, end_time, status, checkout_code) VALUES
((SELECT id FROM c), 1, CURRENT_DATE + 1, '10:00', '10:45', 'confirmed', 'CRIS01'), -- Corte (Aprobada)
((SELECT id FROM c), 3, CURRENT_DATE + 2, '11:00', '11:30', 'scheduled', 'CRIS02'), -- Barba
((SELECT id FROM c), 11, CURRENT_DATE + 3, '12:00', '13:00', 'scheduled', 'CRIS03'), -- Duo
((SELECT id FROM c), 9, CURRENT_DATE + 4, '13:00', '13:45', 'scheduled', 'CRIS04'), -- Manicura
((SELECT id FROM c), 10, CURRENT_DATE + 5, '14:00', '14:45', 'scheduled', 'CRIS05'), -- Pedicura
((SELECT id FROM c), 7, CURRENT_DATE + 6, '15:00', '15:30', 'scheduled', 'CRIS06'), -- Masc. Negra
((SELECT id FROM c), 8, CURRENT_DATE + 7, '16:00', '16:30', 'scheduled', 'CRIS07'); -- Arcilla

-- 4. Asignar Membresía Golden a Said
WITH c AS (SELECT id FROM clients WHERE phone = '4272757136'),
     mt AS (SELECT * FROM membership_types WHERE id = 1)
INSERT INTO client_memberships (client_id, membership_type_id, status, total_services, used_services, purchase_date, activation_date, expiration_date, payment_method, payment_amount, folio_number)
SELECT c.id, mt.id, 'active', mt.total_services, 0, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE + mt.validity_days, 'cash', mt.price, 'GOLD-TEST-001'
FROM c, mt;

-- Actualizar tipo de cliente Said a Golden (3)
UPDATE clients SET client_type_id = 3 WHERE phone = '4272757136';

-- Registrar transacción compra membresía Said
INSERT INTO transactions (client_id, membership_purchase_id, type, amount, description, payment_method, transaction_date)
SELECT c.id, m.id, 'membership', 2500, 'Membresía Golden Card', 'cash', CURRENT_DATE
FROM clients c
JOIN client_memberships m ON c.id = m.client_id
WHERE c.phone = '4272757136';


-- 5. Asignar Membresía Black a Cristopher
WITH c AS (SELECT id FROM clients WHERE phone = '4272757131'),
     mt AS (SELECT * FROM membership_types WHERE id = 2)
INSERT INTO client_memberships (client_id, membership_type_id, status, total_services, used_services, purchase_date, activation_date, expiration_date, payment_method, payment_amount, folio_number)
SELECT c.id, mt.id, 'active', mt.total_services, 0, CURRENT_DATE, CURRENT_DATE, CURRENT_DATE + mt.validity_days, 'cash', mt.price, 'BLACK-TEST-001'
FROM c, mt;

-- Actualizar tipo de cliente Cristopher a Black (4)
UPDATE clients SET client_type_id = 4 WHERE phone = '4272757131';

-- Registrar transacción compra membresía Cristopher
INSERT INTO transactions (client_id, membership_purchase_id, type, amount, description, payment_method, transaction_date)
SELECT c.id, m.id, 'membership', 3500, 'Membresía Black Card', 'cash', CURRENT_DATE
FROM clients c
JOIN client_memberships m ON c.id = m.client_id
WHERE c.phone = '4272757131';


-- 6. Checkouts Said
-- Cita 1 (Corte): Paga normal (Efectivo)
WITH a AS (SELECT * FROM appointments WHERE checkout_code = 'SAID01')
INSERT INTO checkouts (uuid, appointment_id, client_id, client_name, client_phone, service_cost, subtotal, total, payment_method)
SELECT gen_random_uuid(), a.id, a.client_id, 'Said Romero', '4272757136', 250, 250, 250, 'cash'
FROM a;

UPDATE appointments SET status = 'completed' WHERE checkout_code = 'SAID01';

INSERT INTO transactions (checkout_id, client_id, type, amount, description, payment_method, transaction_date)
SELECT ch.id, ch.client_id, 'service', 250, 'Corte de Cabello', 'cash', CURRENT_DATE
FROM checkouts ch
JOIN appointments a ON ch.appointment_id = a.id
WHERE a.checkout_code = 'SAID01';

-- Cita 2 (Barba): Usa Membresía
-- Actualizamos uso membresía
UPDATE client_memberships SET used_services = used_services + 1 
WHERE client_id = (SELECT id FROM clients WHERE phone = '4272757136');

WITH a AS (SELECT * FROM appointments WHERE checkout_code = 'SAID02'),
     m AS (SELECT id FROM client_memberships WHERE client_id = a.client_id)
INSERT INTO checkouts (uuid, appointment_id, client_id, client_name, client_phone, service_cost, subtotal, total, payment_method, used_membership, membership_id)
SELECT gen_random_uuid(), a.id, a.client_id, 'Said Romero', '4272757136', 200, 200, 0, 'membership', true, m.id
FROM a, m;

UPDATE appointments SET status = 'completed' WHERE checkout_code = 'SAID02';

-- Cita 3 (Duo): Usa Membresía (Duo consume 2 sellos? Vamos a asumir 1 o manual)
-- Duo ID 11. Costo uso 2? Consultamos services..
-- UPDATE client_memberships SET used_services = used_services + 2 ...
-- Para el test asumimos consumo simple

UPDATE client_memberships SET used_services = used_services + 1
WHERE client_id = (SELECT id FROM clients WHERE phone = '4272757136');

WITH a AS (SELECT * FROM appointments WHERE checkout_code = 'SAID03'),
     m AS (SELECT id FROM client_memberships WHERE client_id = a.client_id)
INSERT INTO checkouts (uuid, appointment_id, client_id, client_name, client_phone, service_cost, subtotal, total, payment_method, used_membership, membership_id)
SELECT gen_random_uuid(), a.id, a.client_id, 'Said Romero', '4272757136', 500, 500, 0, 'membership', true, m.id
FROM a, m;

UPDATE appointments SET status = 'completed' WHERE checkout_code = 'SAID03';


-- 7. Checkouts Cristopher
-- Cita 1 (Corte): Paga normal (Efectivo) - SIN membresía
WITH a AS (SELECT * FROM appointments WHERE checkout_code = 'CRIS01')
INSERT INTO checkouts (uuid, appointment_id, client_id, client_name, client_phone, service_cost, subtotal, total, payment_method)
SELECT gen_random_uuid(), a.id, a.client_id, 'Cristopher Juarez', '4272757131', 250, 250, 250, 'cash'
FROM a;

UPDATE appointments SET status = 'completed' WHERE checkout_code = 'CRIS01';

INSERT INTO transactions (checkout_id, client_id, type, amount, description, payment_method, transaction_date)
SELECT ch.id, ch.client_id, 'service', 250, 'Corte de Cabello', 'cash', CURRENT_DATE
FROM checkouts ch
JOIN appointments a ON ch.appointment_id = a.id
WHERE a.checkout_code = 'CRIS01';

-- Resto de citas (Barba, Duo, etc): Usa Membresía Black
-- Simulamos uso masivo (6 servicios restantes)
UPDATE client_memberships SET used_services = used_services + 6
WHERE client_id = (SELECT id FROM clients WHERE phone = '4272757131');

-- Insertamos checkouts masivos para las citas restantes
WITH a AS (SELECT * FROM appointments WHERE checkout_code IN ('CRIS02', 'CRIS03', 'CRIS04', 'CRIS05', 'CRIS06', 'CRIS07')),
     m AS (SELECT id FROM client_memberships WHERE client_id = (SELECT id FROM clients WHERE phone = '4272757131'))
INSERT INTO checkouts (uuid, appointment_id, client_id, client_name, client_phone, service_cost, subtotal, total, payment_method, used_membership, membership_id)
SELECT gen_random_uuid(), a.id, a.client_id, 'Cristopher Juarez', '4272757131', 300, 300, 0, 'membership', true, m.id
FROM a, m;

UPDATE appointments SET status = 'completed' WHERE checkout_code IN ('CRIS02', 'CRIS03', 'CRIS04', 'CRIS05', 'CRIS06', 'CRIS07');


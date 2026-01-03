-- Importar clientes con Golden Card Tradicional
BEGIN;

-- Insertar clientes
INSERT INTO clients (name, phone, client_type_id, created_at)
VALUES
('Javier Perez', '4421880001', 3, '2025-03-01'),
('Derek Herrera', '4421890001', 3, '2025-03-03'),
('Sebastian Rueda', '4422010001', 3, '2025-07-31'),
('Emiliano Sanchez Martinez', '4422020001', 3, '2025-07-31'),
('Axel Quijada Miranda', '4422030001', 3, '2025-08-12'),
('Vito Mastrorocco', '4422070001', 3, '2025-08-26'),
('Ricardo Garcia Jaeger', '4422080001', 3, '2025-08-26'),
('Mateo Palacios Urias', '4422090001', 3, '2025-08-29'),
('Luis Angel Hernandez Olvera', '4422100001', 3, '2025-09-06'),
('Alfredo Olvera', '4422110001', 3, '2025-09-10'),
('Fernando Cervantes', '4422120001', 3, '2025-09-15'),
('Gerardo de la O', '4422130001', 3, '2025-09-26'),
('Edgar Mendoza', '4422150001', 3, '2025-03-04'),
('Ivan Santiago', '4422160001', 3, '2025-10-04'),
('Fernando Monreal', '4422170001', 3, '2025-10-16'),
('Emil Garcia', '4422180001', 3, '2025-10-17'),
('Luis Perez', '4422190001', 3, '2025-10-20'),
('Cutberto Lozano', '4422200001', 3, '2025-10-21'),
('Juan Patlan Avila', '4422210001', 3, '2025-10-22'),
('Victor Ornelas', '4422220001', 3, '2025-11-12'),
('Matias Franco', '4422230001', 3, '2025-11-22'),
('Daniel Aguirre', '4422240001', 3, '2025-12-13'),
('Eduardo Aguirre', '4422250001', 3, '2025-12-16'),
('Luis F. Quirino', '4422260001', 3, '2025-12-17'),
('Carlos Quintanilla', '4422270001', 3, '2025-12-20'),
('Neftali Ruiz', '4422290001', 3, '2025-12-23')
ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, client_type_id = 3;

-- Insertar membresías para cada cliente
INSERT INTO client_memberships (client_id, membership_type_id, total_services, used_services, purchase_date, activation_date, expiration_date, status, payment_method, payment_amount, folio_number)
SELECT 
    c.id,
    8, -- Golden Card Tradicional
    6,
    0,
    c.created_at::date,
    c.created_at::date,
    (c.created_at::date + INTERVAL '100 years')::date,
    'active',
    'cash',
    1500.00,
    'GC-' || c.id
FROM clients c
WHERE c.phone IN (
    '4421880001', '4421890001', '4422010001', '4422020001', '4422030001',
    '4422070001', '4422080001', '4422090001', '4422100001', '4422110001',
    '4422120001', '4422130001', '4422150001', '4422160001', '4422170001',
    '4422180001', '4422190001', '4422200001', '4422210001', '4422220001',
    '4422230001', '4422240001', '4422250001', '4422260001', '4422270001',
    '4422290001'
)
AND NOT EXISTS (
    SELECT 1 FROM client_memberships cm 
    WHERE cm.client_id = c.id AND cm.membership_type_id = 8 AND cm.status = 'active'
);

COMMIT;

-- Verificar
SELECT c.name, c.phone, mt.name as membresia, cm.total_services, cm.used_services, cm.status
FROM client_memberships cm
JOIN clients c ON cm.client_id = c.id
JOIN membership_types mt ON cm.membership_type_id = mt.id
WHERE cm.status = 'active'
ORDER BY c.name;

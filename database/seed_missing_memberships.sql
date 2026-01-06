-- Insert missing client types
INSERT INTO client_types (id, name, display_name, color, description, priority)
OVERRIDING SYSTEM VALUE VALUES
(4, 'black_card', 'Black Card', '#1A1A1A', 'Miembro Black Card', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO membership_types (id, name, description, client_type_id, total_services, validity_days, price, benefits, is_active, display_order)
OVERRIDING SYSTEM VALUE VALUES
(8, 'Golden Card Corte', 'Membresía de 6 Servicios Totales (Corte, Barba, Dúo)', 2, 6, 180, 1500.00, '{"transferable": false}', true, 4),
(9, 'Golden NeoCapilar', 'Membresía de 8 Servicios Totales (TIC, Salud y Prevención)', 3, 8, 365, 3850.00, '{"transferable": false}', true, 5),
(10, 'Black Card', 'Membresía de 12 Servicios Totales (Cortes, Barba, Mascarillas, Manicura)', 4, 12, 365, 3300.00, '{"transferable": true}', true, 6)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    total_services = EXCLUDED.total_services;

-- Reset sequence to avoid next insert collision
SELECT setval('membership_types_id_seq', (SELECT MAX(id) FROM membership_types));

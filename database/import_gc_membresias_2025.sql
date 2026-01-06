-- Bulk import: Golden Card Corte memberships + usage (2025)
-- Source: user-provided list, normalized to 2025 for incomplete dates

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM membership_types WHERE name ILIKE '%Golden Card Corte%'
  ) THEN
    RAISE EXCEPTION 'Golden Card Corte membership type not found.';
  END IF;
END $$;

ALTER TABLE client_memberships
ADD COLUMN IF NOT EXISTS folio_number VARCHAR(50);

WITH
mt AS (
  SELECT id, total_services, validity_days, price, client_type_id
  FROM membership_types
  WHERE name ILIKE '%Golden Card Corte%'
  LIMIT 1
),
input_clients AS (
  SELECT * FROM (VALUES
    ('Javier Perez', '188', DATE '2025-03-01'),
    ('Derek Herrera', '189', DATE '2025-03-03'),
    ('Sebastian Rueda', '201', DATE '2025-07-31'),
    ('Emiliano Sanchez Martinez', '202', DATE '2025-07-31'),
    ('Axel Quijada Miranda', '203', DATE '2025-08-12'),
    ('Vito Mastrorocco', '207', DATE '2025-08-26'),
    ('Ricardo Garcia Jaeger', '208', DATE '2025-08-26'),
    ('Mateo Palacios Urias', '209', DATE '2025-08-29'),
    ('Luis Angel Hernandez Olvera', '210', DATE '2025-09-06'),
    ('Alfredo Olvera', '211', DATE '2025-09-10'),
    ('Fernando Cervantes', '212', DATE '2025-09-15'),
    ('Gerardo de la O', '213', DATE '2025-09-26'),
    ('Edgar Mendoza', '215', DATE '2025-03-04'),
    ('Ivan Santiago', '216', DATE '2025-10-04'),
    ('Fernando Monreal', '217', DATE '2025-10-16'),
    ('Emil Garcia', '218', DATE '2025-10-17'),
    ('Luis Perez', '219', DATE '2025-10-20'),
    ('Cutberto Lozano', '220', DATE '2025-10-21'),
    ('Juan Patlan Avila', '221', DATE '2025-10-22'),
    ('Victor Ornelas', '222', DATE '2025-11-12'),
    ('Matias Franco', '223', DATE '2025-11-22'),
    ('Daniel Aguirre', '224', DATE '2025-12-13'),
    ('Eduardo Aguirre', '225', DATE '2025-12-16'),
    ('Luis F. Quirino', '226', DATE '2025-12-17'),
    ('Carlos Quintanilla', '227', DATE '2025-12-20'),
    ('Neftali Ruiz', '229', DATE '2025-12-23')
  ) AS t(name, folio, start_date)
),
upsert_clients AS (
  INSERT INTO clients (name, phone, client_type_id)
  SELECT name, '1234456780-' || folio, 1
  FROM input_clients
  ON CONFLICT (phone) DO UPDATE
  SET name = EXCLUDED.name
  RETURNING id, phone
),
client_map AS (
  SELECT ic.name, ic.folio, ic.start_date, c.id AS client_id
  FROM input_clients ic
  JOIN upsert_clients uc ON uc.phone = '1234456780-' || ic.folio
  JOIN clients c ON c.phone = uc.phone
),
update_client_types AS (
  UPDATE clients c
  SET client_type_id = mt.client_type_id,
      updated_at = CURRENT_TIMESTAMP
  FROM client_map cm, mt
  WHERE c.id = cm.client_id
  RETURNING c.id
),
insert_memberships AS (
  INSERT INTO client_memberships (
    client_id,
    membership_type_id,
    total_services,
    used_services,
    purchase_date,
    activation_date,
    expiration_date,
    status,
    payment_method,
    payment_amount,
    folio_number
  )
  SELECT
    cm.client_id,
    mt.id,
    mt.total_services,
    0,
    cm.start_date,
    cm.start_date,
    (cm.start_date + (mt.validity_days * INTERVAL '1 day'))::date,
    'active',
    'cash',
    mt.price,
    'GC' || cm.folio
  FROM client_map cm
  CROSS JOIN mt
  WHERE NOT EXISTS (
    SELECT 1
    FROM client_memberships cmx
    WHERE cmx.folio_number = 'GC' || cm.folio
      AND cmx.membership_type_id = mt.id
      AND cmx.status <> 'cancelled'
  )
  RETURNING id, client_id
),
membership_map AS (
  SELECT cm.client_id, cm.folio, m.id AS membership_id
  FROM client_map cm
  JOIN client_memberships m
    ON m.client_id = cm.client_id
   AND m.folio_number = 'GC' || cm.folio
   AND m.membership_type_id = (SELECT id FROM mt)
  LEFT JOIN insert_memberships im ON im.client_id = cm.client_id
  LEFT JOIN update_client_types uct ON uct.id = cm.client_id
),
svc AS (
  SELECT
    (SELECT id FROM services WHERE name ILIKE 'Corte de cabello%' LIMIT 1) AS corte_id,
    (SELECT id FROM services WHERE name ILIKE 'Ritual Tradicional de Barba' LIMIT 1) AS barba_id,
    (SELECT id FROM services WHERE name ILIKE 'MASCARILLA PLASTIFICADA NEGRA' LIMIT 1) AS masc_id,
    (SELECT id FROM services WHERE name ILIKE 'MANICURA CABALLERO' LIMIT 1) AS mani_id
),
usage_data AS (
  SELECT * FROM (VALUES
    ('188', 'corte', DATE '2025-08-25'),
    ('188', 'barba', DATE '2025-08-25'),
    ('189', 'corte', DATE '2025-03-03'),
    ('189', 'corte', DATE '2025-06-17'),
    ('189', 'corte', DATE '2025-09-17'),
    ('189', 'corte', DATE '2025-11-10'),
    ('201', 'corte', DATE '2025-07-31'),
    ('201', 'corte', DATE '2025-08-28'),
    ('201', 'corte', DATE '2025-09-23'),
    ('201', 'corte', DATE '2025-10-25'),
    ('201', 'corte', DATE '2025-12-04'),
    ('202', 'corte', DATE '2025-07-31'),
    ('202', 'barba', DATE '2025-07-31'),
    ('202', 'corte', DATE '2025-09-12'),
    ('202', 'barba', DATE '2025-09-12'),
    ('202', 'corte', DATE '2025-10-11'),
    ('203', 'corte', DATE '2025-08-12'),
    ('207', 'corte', DATE '2025-10-09'),
    ('207', 'corte', DATE '2025-11-21'),
    ('207', 'corte', DATE '2025-12-29'),
    ('208', 'corte', DATE '2025-11-21'),
    ('208', 'barba', DATE '2025-11-21'),
    ('209', 'corte', DATE '2025-08-29'),
    ('210', 'corte', DATE '2025-12-01'),
    ('210', 'corte', DATE '2025-12-26'),
    ('211', 'corte', DATE '2025-10-01'),
    ('211', 'corte', DATE '2025-10-20'),
    ('211', 'corte', DATE '2025-11-12'),
    ('211', 'corte', DATE '2025-12-09'),
    ('211', 'corte', DATE '2025-12-30'),
    ('212', 'corte', DATE '2025-10-22'),
    ('212', 'barba', DATE '2025-10-22'),
    ('213', 'corte', DATE '2025-10-25'),
    ('215', 'corte', DATE '2025-10-04'),
    ('215', 'corte', DATE '2025-11-15'),
    ('215', 'corte', DATE '2025-12-13'),
    ('216', 'corte', DATE '2025-10-04'),
    ('216', 'corte', DATE '2025-10-20'),
    ('216', 'barba', DATE '2025-10-20'),
    ('216', 'corte', DATE '2025-11-03'),
    ('216', 'barba', DATE '2025-11-03'),
    ('217', 'corte', DATE '2025-10-16'),
    ('217', 'corte', DATE '2025-12-11'),
    ('218', 'corte', DATE '2025-12-12'),
    ('219', 'corte', DATE '2025-10-20'),
    ('219', 'corte', DATE '2025-11-13'),
    ('219', 'corte', DATE '2025-12-23'),
    ('220', 'corte', DATE '2025-10-21'),
    ('220', 'corte', DATE '2025-11-11'),
    ('220', 'corte', DATE '2025-12-02'),
    ('220', 'corte', DATE '2025-12-19'),
    ('221', 'corte', DATE '2025-10-21'),
    ('221', 'corte', DATE '2025-12-20'),
    ('222', 'corte', DATE '2025-11-12'),
    ('222', 'barba', DATE '2025-11-12'),
    ('222', 'corte', DATE '2025-12-12'),
    ('222', 'barba', DATE '2025-12-12'),
    ('223', 'corte', DATE '2025-11-22'),
    ('223', 'corte', DATE '2025-12-23'),
    ('224', 'corte', DATE '2025-11-13'),
    ('225', 'barba', DATE '2025-12-16'),
    ('226', 'masc', DATE '2025-12-17'),
    ('226', 'mani', DATE '2025-12-17'),
    ('227', 'corte', DATE '2025-12-20'),
    ('227', 'barba', DATE '2025-12-20'),
    ('229', 'corte', DATE '2025-12-23')
  ) AS u(folio, service_code, used_date)
),
usage_expanded AS (
  SELECT
    u.folio,
    u.service_code,
    u.used_date,
    CASE u.service_code
      WHEN 'corte' THEN svc.corte_id
      WHEN 'barba' THEN svc.barba_id
      WHEN 'masc' THEN svc.masc_id
      WHEN 'mani' THEN svc.mani_id
    END AS service_id,
    ROW_NUMBER() OVER (
      PARTITION BY u.folio, u.used_date
      ORDER BY u.service_code
    ) AS seq
  FROM usage_data u
  CROSS JOIN svc
),
usage_with_time AS (
  SELECT
    ue.*,
    (TIME '10:00' + (ue.seq - 1) * INTERVAL '1 hour')::time AS start_time,
    (TIME '11:00' + (ue.seq - 1) * INTERVAL '1 hour')::time AS end_time
  FROM usage_expanded ue
),
appointments_ins AS (
  INSERT INTO appointments (
    client_id,
    service_id,
    appointment_date,
    start_time,
    end_time,
    status,
    created_by
  )
  SELECT
    cm.client_id,
    uwt.service_id,
    uwt.used_date,
    uwt.start_time,
    uwt.end_time,
    'completed',
    'admin'
  FROM usage_with_time uwt
  JOIN client_map cm ON cm.folio = uwt.folio
  WHERE NOT EXISTS (
    SELECT 1
    FROM appointments a
    WHERE a.client_id = cm.client_id∫
      AND a.service_id = uwt.service_id
      AND a.appointment_date = uwt.used_date
      AND a.start_time = uwt.start_time
  )
  RETURNING id, client_id, service_id, appointment_date, start_time
),
appointments_all AS (
  SELECT a.id, a.client_id, a.service_id, a.appointment_date, a.start_time
  FROM appointments a
  JOIN client_map cm ON cm.client_id = a.client_id
  JOIN usage_with_time uwt
    ON uwt.folio = cm.folio
   AND uwt.service_id = a.service_id
   AND uwt.used_date = a.appointment_date
   AND uwt.start_time = a.start_time
  LEFT JOIN appointments_ins ai ON ai.id = a.id
),
usage_ins AS (
  INSERT INTO membership_usage (
    membership_id,
    appointment_id,
    service_id,
    service_name,
    used_at,
    service_value,
    stamps_used
  )
  SELECT
    mm.membership_id,
    ap.id,
    ap.service_id,
    s.name,
    ap.appointment_date::timestamp,
    s.price,
    1
  FROM appointments_all ap
  JOIN services s ON s.id = ap.service_id
  JOIN membership_map mm ON mm.client_id = ap.client_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM membership_usage mu
    WHERE mu.membership_id = mm.membership_id
      AND mu.appointment_id = ap.id
  )
  RETURNING membership_id
),
usage_counts AS (
  SELECT mu.membership_id, COUNT(*) AS cnt
  FROM membership_usage mu
  JOIN membership_map mm ON mm.membership_id = mu.membership_id
  LEFT JOIN usage_ins ui ON ui.membership_id = mu.membership_id
  GROUP BY mu.membership_id
)
UPDATE client_memberships cm
SET used_services = usage_counts.cnt
FROM usage_counts
WHERE cm.id = usage_counts.membership_id;

COMMIT;

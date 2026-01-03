-- Importar Golden Card con folios correctos y servicios usados
BEGIN;

-- Obtener IDs de servicios
-- corte = Corte de cabello para CABALLERO
-- barba = Ritual Tradicional de Barba  
-- masc = MASCARILLA PLASTIFICADA NEGRA
-- mani = MANICURA CABALLERO

-- 1. Insertar clientes con client_type_id = 3 (Golden Card)
INSERT INTO clients (name, phone, client_type_id, created_at) VALUES
('Javier Perez', '4421880188', 3, '2025-03-01'),
('Derek Herrera', '4421890189', 3, '2025-03-03'),
('Sebastian Rueda', '4422010201', 3, '2025-07-31'),
('Emiliano Sanchez Martinez', '4422020202', 3, '2025-07-31'),
('Axel Quijada Miranda', '4422030203', 3, '2025-08-12'),
('Vito Mastrorocco', '4422070207', 3, '2025-08-26'),
('Ricardo Garcia Jaeger', '4422080208', 3, '2025-08-26'),
('Mateo Palacios Urias', '4422090209', 3, '2025-08-29'),
('Luis Angel Hernandez Olvera', '4422100210', 3, '2025-09-06'),
('Alfredo Olvera', '4422110211', 3, '2025-09-10'),
('Fernando Cervantes', '4422120212', 3, '2025-09-15'),
('Gerardo de la O', '4422130213', 3, '2025-09-26'),
('Edgar Mendoza', '4422150215', 3, '2025-03-04'),
('Ivan Santiago', '4422160216', 3, '2025-10-04'),
('Fernando Monreal', '4422170217', 3, '2025-10-16'),
('Emil Garcia', '4422180218', 3, '2025-10-17'),
('Luis Perez', '4422190219', 3, '2025-10-20'),
('Cutberto Lozano', '4422200220', 3, '2025-10-21'),
('Juan Patlan Avila', '4422210221', 3, '2025-10-22'),
('Victor Ornelas', '4422220222', 3, '2025-11-12'),
('Matias Franco', '4422230223', 3, '2025-11-22'),
('Daniel Aguirre', '4422240224', 3, '2025-12-13'),
('Eduardo Aguirre', '4422250225', 3, '2025-12-16'),
('Luis F. Quirino', '4422260226', 3, '2025-12-17'),
('Carlos Quintanilla', '4422270227', 3, '2025-12-20'),
('Neftali Ruiz', '4422290229', 3, '2025-12-23')
ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, client_type_id = 3;

COMMIT;

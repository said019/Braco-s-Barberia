-- =============================================
-- ACTUALIZACIÓN DE SERVICIOS Y PRODUCTOS
-- Descripciones completas y detalladas
-- =============================================

-- Limpiar servicios existentes para evitar duplicados
DELETE FROM services;
DELETE FROM service_categories;

-- Reiniciar secuencias
ALTER SEQUENCE service_categories_id_seq RESTART WITH 1;
ALTER SEQUENCE services_id_seq RESTART WITH 1;

-- Recrear categorías
INSERT INTO service_categories (name, display_order) VALUES
('Cortes', 1),
('Barba', 2),
('Tratamientos Capilares', 3),
('Cuidado Facial', 4),
('Cuidado Personal', 5),
('Paquetes', 6);

-- =============================================
-- SERVICIOS CON DESCRIPCIONES COMPLETAS
-- =============================================

-- CORTES
INSERT INTO services (category_id, name, description, duration_minutes, price, display_order) VALUES
(1, 'Corte de Cabello Caballero', 
'Incluye:
• Lavado de cabello
• Visagismo
• Corte de cabello
• Estilizado de peinado
• Productos Premium
• Bebidas de cortesía', 
60, 300.00, 1),

(1, 'Corte de Cabello Niño', 
'Hasta 11 años. Incluye:
• Lavado de cabello
• Visagismo
• Corte de cabello
• Estilizado de peinado
• Productos Premium
• Bebidas de cortesía', 
60, 220.00, 2);

-- BARBA
INSERT INTO services (category_id, name, description, duration_minutes, price, display_order) VALUES
(2, 'Ritual Tradicional de Barba', 
'Incluye:
• Visagismo
• Rasurado completo o arreglo de barba y bigote
• Toallas calientes
• Toallas frías
• Masaje facial y craneal
• Aromaterapia
• Productos Premium
• Bebidas de cortesía', 
60, 300.00, 1);

-- TRATAMIENTOS CAPILARES
INSERT INTO services (category_id, name, description, duration_minutes, price, display_order) VALUES
(3, 'Instalación de Prótesis Capilar', 
'Solución innovadora y efectiva para pérdida de cabello o calvicie severa.

Incluye:
• Diagnóstico
• Prótesis capilar
• Visagismo
• Personalización
• Bebidas de cortesía', 
180, 4800.00, 1),

(3, 'Mantenimiento de Prótesis Capilar', 
'Limpieza profesional de prótesis capilar para limpieza profunda, restauración e hidratación.

Incluye:
• Retiro seguro
• Limpieza profesional
• Ajuste de adhesivos
• Colocación segura
• Bebidas de cortesía', 
120, 650.00, 2),

(3, 'Terapia Integral Capilar (TIC)', 
'Recomendado para personas que inician con calvicie leve a moderada. Terapia enfocada en el cuidado y limpieza del cuero cabelludo para lograr un cabello grueso y abundante.

Incluye:
• Exfoliación capilar
• Alta Frecuencia
• Fotobiomodulación
• Ozonoterapia
• Aplicación de productos Premium
• Bebidas de cortesía', 
60, 550.00, 3);

-- CUIDADO FACIAL
INSERT INTO services (category_id, name, description, duration_minutes, price, display_order) VALUES
(4, 'Mascarilla Plastificada Negra', 
'Recomendada para obtener un rostro limpio de puntos negros y espinillas.

Incluye:
• Limpieza de rostro
• Aplicación y retiro de mascarilla
• Aplicación de productos Premium
• Masaje facial
• Bebidas de cortesía', 
60, 300.00, 1),

(4, 'Mascarilla de Arcilla', 
'Después de la mascarilla plástica, recomendamos esta como mantenimiento. Exfolia el rostro de manera amigable y sutil sin perder efectividad.

Incluye:
• Limpieza de rostro
• Aplicación y retiro de mascarilla
• Aplicación de productos Premium
• Masaje facial
• Bebidas de cortesía', 
60, 300.00, 2);

-- CUIDADO PERSONAL
INSERT INTO services (category_id, name, description, duration_minutes, price, display_order) VALUES
(5, 'Manicura Caballero', 
'Incluye:
• Retiro de cutícula
• Exfoliación de manos
• Recorte de uñas
• Arreglo de uñas
• Humectación de manos
• Masaje de manos y dedos
• Bebidas de cortesía', 
60, 300.00, 1),

(5, 'Pedicura Caballero', 
'Incluye:
• Retiro de cutícula
• Exfoliación de pies
• Recorte y limado de uñas
• Limado de callosidad
• Humectación de pies
• Masaje de pies
• Bebidas de cortesía', 
60, 300.00, 2);

-- PAQUETES
INSERT INTO services (category_id, name, description, duration_minutes, price, display_order) VALUES
(6, 'DÚO', 
'Incluye:
• Visagismo
• Corte de cabello
• Ritual tradicional para rasurado o arreglo de barba y bigote
• Bebidas de cortesía', 
120, 550.00, 1),

(6, 'Paquete Nupcial D''Lux', 
'Eleva tu imagen con un ritual completo de elegancia masculina. El mejor día de tu vida... la mejor versión de ti.

Incluye:
• Visagismo
• Corte de cabello
• Ritual de barba o rasurado clásico
• Mascarilla de carbón activado o mascarilla de arcilla natural
• Manicura SPA
• Bebidas de cortesía

NOTA: Todos los servicios incluyen bebidas de cortesía: agua, té, refrescos, café mezcla Premium de Chiapas (expresso, cappuccino, latte, americano), whisky, tequila, cerveza, carajillo (18+)', 
240, 1200.00, 2);

-- =============================================
-- ACTUALIZAR PRODUCTOS CON DESCRIPCIONES
-- =============================================

UPDATE products 
SET description = 'Shampoo 100% natural, libre de sulfatos, parabenos y sales. Enriquecido con Minoxidil al 2%'
WHERE name = 'Shampoo Braco''s';

UPDATE products 
SET description = 'Aceite hidratante para barba con esencias naturales'
WHERE name = 'Aceite para Barba Braco''s';

-- =============================================
-- ACTUALIZAR INFORMACIÓN DEL NEGOCIO
-- =============================================

UPDATE system_settings 
SET value = 'Todos los servicios son con cita. Primera cita 10:00am, última cita 7:00pm (para terminar a las 8:00pm) de lunes a viernes. Sábados: primera cita 10:00am, última cita 4:00pm (para terminar a las 5:00pm). Domingos: cerrado.'
WHERE key = 'business_description';

-- Agregar nota sobre bebidas si no existe
INSERT INTO system_settings (key, value, description) 
VALUES (
    'complimentary_drinks', 
    'Agua, té, refrescos, refrescos sin azúcar, café mezcla Premium de Chiapas (expresso, cappuccino, latte, americano). Para mayores de 18 años: whisky, tequila, cerveza, carajillo',
    'Bebidas de cortesía incluidas en todos los servicios'
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;

-- Agregar configuración de última cita
INSERT INTO system_settings (key, value, description) 
VALUES (
    'last_appointment_weekday', 
    '19:00',
    'Hora de última cita en días de semana (lunes a viernes)'
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;

INSERT INTO system_settings (key, value, description) 
VALUES (
    'last_appointment_saturday', 
    '16:00',
    'Hora de última cita los sábados'
)
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;

-- =============================================
-- VERIFICACIÓN
-- =============================================

-- Mostrar servicios actualizados
SELECT 
    sc.name as categoria,
    s.name as servicio,
    s.duration_minutes as minutos,
    s.price as precio,
    LEFT(s.description, 50) || '...' as descripcion_preview
FROM services s
JOIN service_categories sc ON s.category_id = sc.id
ORDER BY sc.display_order, s.display_order;

-- Mostrar productos
SELECT name, price, description FROM products;

-- Mostrar configuraciones
SELECT key, value FROM system_settings WHERE key LIKE '%appointment%' OR key LIKE '%drink%' OR key = 'business_description';

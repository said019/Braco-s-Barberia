-- =============================================
-- LIMPIEZA DE SERVICIOS DUPLICADOS
-- =============================================

-- Ver duplicados actuales
SELECT name, COUNT(*) as cantidad 
FROM services 
GROUP BY name 
HAVING COUNT(*) > 1;

-- Eliminar duplicados manteniendo el ID más bajo
DELETE FROM services a USING services b
WHERE a.id > b.id 
AND a.name = b.name;

-- Ver duplicados de productos
SELECT name, COUNT(*) as cantidad 
FROM products 
GROUP BY name 
HAVING COUNT(*) > 1;

-- Eliminar duplicados de productos
DELETE FROM products a USING products b
WHERE a.id > b.id 
AND a.name = b.name;

-- =============================================
-- ACTUALIZAR DESCRIPCIONES DE SERVICIOS
-- =============================================

-- CORTES
UPDATE services 
SET description = 'Incluye:
• Lavado de cabello
• Visagismo
• Corte de cabello
• Estilizado de peinado
• Productos Premium
• Bebidas de cortesía'
WHERE name = 'Corte de Cabello Caballero';

UPDATE services 
SET description = 'Hasta 11 años. Incluye:
• Lavado de cabello
• Visagismo
• Corte de cabello
• Estilizado de peinado
• Productos Premium
• Bebidas de cortesía'
WHERE name = 'Corte de Cabello Niño';

-- BARBA
UPDATE services 
SET description = 'Incluye:
• Visagismo
• Rasurado completo o arreglo de barba y bigote
• Toallas calientes
• Toallas frías
• Masaje facial y craneal
• Aromaterapia
• Productos Premium
• Bebidas de cortesía'
WHERE name = 'Ritual Tradicional de Barba';

-- TRATAMIENTOS CAPILARES
UPDATE services 
SET description = 'Solución innovadora y efectiva para pérdida de cabello o calvicie severa.

Incluye:
• Diagnóstico
• Prótesis capilar
• Visagismo
• Personalización
• Bebidas de cortesía'
WHERE name = 'Instalación de Prótesis Capilar';

UPDATE services 
SET description = 'Limpieza profesional de prótesis capilar para limpieza profunda, restauración e hidratación.

Incluye:
• Retiro seguro
• Limpieza profesional
• Ajuste de adhesivos
• Colocación segura
• Bebidas de cortesía'
WHERE name = 'Mantenimiento de Prótesis Capilar';

UPDATE services 
SET description = 'Recomendado para personas que inician con calvicie leve a moderada. Terapia enfocada en el cuidado y limpieza del cuero cabelludo para lograr un cabello grueso y abundante.

Incluye:
• Exfoliación capilar
• Alta Frecuencia
• Fotobiomodulación
• Ozonoterapia
• Aplicación de productos Premium
• Bebidas de cortesía'
WHERE name = 'Terapia Integral Capilar (TIC)';

-- CUIDADO FACIAL
UPDATE services 
SET description = 'Recomendada para obtener un rostro limpio de puntos negros y espinillas.

Incluye:
• Limpieza de rostro
• Aplicación y retiro de mascarilla
• Aplicación de productos Premium
• Masaje facial
• Bebidas de cortesía'
WHERE name = 'Mascarilla Plastificada Negra';

UPDATE services 
SET description = 'Después de la mascarilla plástica, recomendamos esta como mantenimiento. Exfolia el rostro de manera amigable y sutil sin perder efectividad.

Incluye:
• Limpieza de rostro
• Aplicación y retiro de mascarilla
• Aplicación de productos Premium
• Masaje facial
• Bebidas de cortesía'
WHERE name = 'Mascarilla de Arcilla';

-- CUIDADO PERSONAL
UPDATE services 
SET description = 'Incluye:
• Retiro de cutícula
• Exfoliación de manos
• Recorte de uñas
• Arreglo de uñas
• Humectación de manos
• Masaje de manos y dedos
• Bebidas de cortesía'
WHERE name = 'Manicura Caballero';

UPDATE services 
SET description = 'Incluye:
• Retiro de cutícula
• Exfoliación de pies
• Recorte y limado de uñas
• Limado de callosidad
• Humectación de pies
• Masaje de pies
• Bebidas de cortesía'
WHERE name = 'Pedicura Caballero';

-- PAQUETES
UPDATE services 
SET description = 'Incluye:
• Visagismo
• Corte de cabello
• Ritual tradicional para rasurado o arreglo de barba y bigote
• Bebidas de cortesía'
WHERE name = 'DÚO';

UPDATE services 
SET description = 'Eleva tu imagen con un ritual completo de elegancia masculina. El mejor día de tu vida... la mejor versión de ti.

Incluye:
• Visagismo
• Corte de cabello
• Ritual de barba o rasurado clásico
• Mascarilla de carbón activado o mascarilla de arcilla natural
• Manicura SPA
• Bebidas de cortesía

NOTA: Todos los servicios incluyen bebidas de cortesía: agua, té, refrescos, café mezcla Premium de Chiapas (expresso, cappuccino, latte, americano), whisky, tequila, cerveza, carajillo (18+)'
WHERE name LIKE 'Paquete Nupcial%';

-- =============================================
-- ACTUALIZAR PRODUCTOS
-- =============================================

UPDATE products 
SET description = 'Shampoo 100% natural, libre de sulfatos, parabenos y sales. Enriquecido con Minoxidil al 2%'
WHERE name LIKE '%Shampoo%';

UPDATE products 
SET description = 'Aceite hidratante para barba con esencias naturales'
WHERE name LIKE '%Aceite%';

-- Eliminar productos que no están en la lista original
DELETE FROM products 
WHERE name NOT IN ('Shampoo Braco''s', 'Aceite para Barba Braco''s');

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

\echo '═══════════════════════════════════════════════'
\echo 'SERVICIOS ACTUALIZADOS:'
\echo '═══════════════════════════════════════════════'

SELECT 
    sc.name as categoria,
    s.name as servicio,
    s.duration_minutes || ' min' as duracion,
    '$' || s.price as precio
FROM services s
JOIN service_categories sc ON s.category_id = sc.id
ORDER BY sc.display_order, s.display_order;

\echo ''
\echo '═══════════════════════════════════════════════'
\echo 'PRODUCTOS:'
\echo '═══════════════════════════════════════════════'

SELECT name, '$' || price as precio, description FROM products;

\echo ''
\echo '═══════════════════════════════════════════════'
\echo 'TOTAL DE REGISTROS:'
\echo '═══════════════════════════════════════════════'

SELECT 
    (SELECT COUNT(*) FROM services) as servicios,
    (SELECT COUNT(*) FROM products) as productos,
    (SELECT COUNT(*) FROM service_categories) as categorias;

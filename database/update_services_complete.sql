-- =============================================
-- ACTUALIZACIÓN COMPLETA DE SERVICIOS
-- Descripciones detalladas + Imágenes
-- =============================================

-- Primero, agregar columna para imágenes si no existe
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);

-- =============================================
-- ACTUALIZAR SERVICIOS CON DESCRIPCIONES E IMÁGENES
-- =============================================

-- 1. CORTE DE CABELLO CABALLERO
UPDATE services SET
    name = 'Corte de cabello para CABALLERO',
    description = 'Duración aproximada 60 minutos
• Lavado de cabello
• Visagismo
• Corte de cabello
• Estilizado de peinado
• Productos Premium',
    duration_minutes = 60,
    price = 300.00,
    image_url = 'assets/corte_caballero.jpeg'
WHERE name = 'Corte de Cabello Caballero';

-- 2. CORTE DE CABELLO NIÑO
UPDATE services SET
    name = 'Corte de cabello NIÑO (hasta 11 años)',
    description = 'Duración aproximada 60 minutos
• Lavado de cabello
• Visagismo
• Corte de cabello
• Estilizado de peinado
• Productos Premium',
    duration_minutes = 60,
    price = 220.00,
    image_url = 'assets/corte_nino.jpeg'
WHERE name = 'Corte de Cabello Niño';

-- 3. RITUAL TRADICIONAL DE BARBA
UPDATE services SET
    name = 'Ritual Tradicional de Barba',
    description = 'Duración 60 minutos
• Visagismo
• Rasurado completo o arreglo de barba y bigote
• Toallas calientes
• Toallas frías
• Masaje facial y craneal
• Aromaterapia
• Productos Premium',
    duration_minutes = 60,
    price = 300.00,
    image_url = 'assets/f428c49b-d85d-4b47-9349-dbb31e0b90bb_removalai_preview.png'
WHERE name = 'Ritual Tradicional de Barba';

-- 4. DÚO
UPDATE services SET
    name = 'DÚO',
    description = 'Duración 120min (2 horas)
• Visagismo
• Corte de cabello
• Ritual tradicional para rasurado o arreglo de barba y bigote',
    duration_minutes = 120,
    price = 550.00,
    image_url = 'assets/corte_caballero.jpeg'
WHERE name = 'DÚO';

-- 5. INSTALACIÓN DE PRÓTESIS CAPILAR
UPDATE services SET
    name = 'INSTALACIÓN DE PRÓTESIS CAPILAR',
    description = 'Las prótesis o reemplazo capilar es una solución innovadora y efectiva para aquellos que experimentan pérdida de cabello o calvicie severa.

Tiempo aproximado 180 minutos (3 horas)
• Diagnóstico
• Prótesis capilar
• Visagismo
• Personalización',
    duration_minutes = 180,
    price = 4800.00,
    image_url = 'assets/instalacio_protesis.jpeg'
WHERE name = 'Instalación de Prótesis Capilar';

-- 6. MANTENIMIENTO DE PRÓTESIS CAPILAR
UPDATE services SET
    name = 'MANTENIMIENTO DE PRÓTESIS CAPILAR',
    description = 'Limpieza profesional de prótesis capilar en uso para limpieza profunda, restauración e hidratación.

Tiempo aproximado 120 minutos (2 horas)
• Retiro seguro
• Limpieza profesional
• Ajuste de adhesivos
• Colocación segura',
    duration_minutes = 120,
    price = 650.00,
    image_url = 'assets/mant_protesis.jpeg'
WHERE name = 'Mantenimiento de Prótesis Capilar';

-- 7. TERAPIA INTEGRAL CAPILAR (TIC)
UPDATE services SET
    name = 'TERAPIA INTEGRAL CAPILAR (TIC)',
    description = 'Recomendado para las personas que inician con un problema de calvicie de leve a moderada.

El TIC es una terapia que se enfoca en el cuidado y limpieza del cuero cabelludo con el objetivo de lograr un cuero cabelludo sano y por lo tanto un cabello grueso y en ocasiones abundante.

Duración 60 minutos
• Exfoliación capilar
• Alta Frecuencia
• Fotobiomodulación
• Ozonoterapia
• Aplicación de productos Premium',
    duration_minutes = 60,
    price = 550.00,
    image_url = 'assets/TIC.jpeg'
WHERE name = 'Terapia Integral Capilar (TIC)';

-- 8. MASCARILLA PLASTIFICADA NEGRA
UPDATE services SET
    name = 'MASCARILLA PLASTIFICADA NEGRA',
    description = 'Recomendada para obtener un rostro limpio de puntos negros y espinillas.

Duración 60 minutos
• Limpieza de rostro
• Aplicación y retiro de mascarilla
• Aplicación de productos Premium
• Masaje facial',
    duration_minutes = 60,
    price = 300.00,
    image_url = 'assets/mascarilla_negra.jpeg'
WHERE name = 'Mascarilla Plastificada Negra';

-- 9. MASCARILLA DE ARCILLA
UPDATE services SET
    name = 'MASCARILLA DE ARCILLA',
    description = 'Después de la aplicación de la mascarilla plástica recomendamos como mantenimiento la mascarilla de arcilla que exfolia el rostro de una manera más amigable y sutil pero sin perder efectividad en el proceso.

Duración 60 minutos
• Limpieza de rostro
• Aplicación y retiro de mascarilla
• Aplicación de productos Premium
• Masaje facial',
    duration_minutes = 60,
    price = 300.00,
    image_url = 'assets/arcilla.jpeg'
WHERE name = 'Mascarilla de Arcilla';

-- 10. MANICURA CABALLERO
UPDATE services SET
    name = 'MANICURA CABALLERO',
    description = 'Duración aproximada 60 minutos
• Retiro de cutícula
• Exfoliación de manos
• Recorte de uñas
• Arreglo de uñas
• Humectación de manos
• Masaje de manos y dedos',
    duration_minutes = 60,
    price = 300.00,
    image_url = 'assets/manicura_caballero.jpeg'
WHERE name = 'Manicura Caballero';

-- 11. PEDICURA CABALLERO
UPDATE services SET
    name = 'PEDICURA CABALLERO',
    description = 'Duración aproximada 60 minutos
• Retiro de cutícula
• Exfoliación de pies
• Recorte y limado de uñas
• Limado de callosidad
• Humectación de pies
• Masaje de pies',
    duration_minutes = 60,
    price = 300.00,
    image_url = 'assets/pedicura.jpeg'
WHERE name = 'Pedicura Caballero';

-- 12. PAQUETE NUPCIAL D'LUX
UPDATE services SET
    name = 'PAQUETE NUPCIAL D''Lux',
    description = 'Eleva tu imagen con un ritual completo de elegancia masculina. Ese es el mejor día de tu vida…Y la mejor versión de ti.

Duración 240 minutos (4 horas)
• Visagismo
• Corte de cabello
• Ritual de barba o rasurado clásico
• Mascarilla de carbón activado o mascarilla de arcilla natural
• Manicura SPA',
    duration_minutes = 240,
    price = 1200.00,
    image_url = 'assets/pqte_dlux.jpeg'
WHERE name LIKE 'Paquete Nupcial%';

-- =============================================
-- VERIFICAR ACTUALIZACIONES
-- =============================================
SELECT 
    s.id,
    s.name,
    s.price,
    s.duration_minutes,
    s.image_url,
    sc.name as categoria
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
ORDER BY sc.display_order, s.display_order;

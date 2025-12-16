-- Semilla para nuevos productos (con verificación para no duplicar)

-- 1. Aceite para barba Braco's
INSERT INTO products (name, description, price, stock, is_active, image_url)
SELECT 'Aceite para barba Braco''s', 'Aceite natural para humectar la barba, enriquecido con esencias naturales', 250.00, 50, true, 'assets/tecitaly.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Aceite para barba Braco''s');

-- 2. CERA DE FIJACIÓN FUERTE (ROJA)
INSERT INTO products (name, description, price, stock, is_active, image_url)
SELECT 'CERA DE FIJACIÓN FUERTE (ROJA) 4Oz', E'Cera base agua con excelente fijación y duración prolongada, da brillo y cuerpo al cabello\nAROMA: Café-Cacao\nBENEFICIOS: No deja residuos, Fácil de enjuagar', 350.00, 30, true, 'assets/cerafijacionfuerteroja.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name LIKE 'CERA DE FIJACIÓN FUERTE (ROJA)%');

-- 3. CERA DE FIJACIÓN FUERTE (VIP)
INSERT INTO products (name, description, price, stock, is_active, image_url)
SELECT 'CERA DE FIJACIÓN FUERTE (VIP) 4Oz', E'Cera base agua con excelente fijación y duración prolongada, da brillo y cuerpo al cabello\nAROMA: Acuosa-Amaderada\nBENEFICIOS: No deja residuos, Fácil de enjuagar', 350.00, 30, true, 'assets/cerafijacionfuertevip.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name LIKE 'CERA DE FIJACIÓN FUERTE (VIP)%');

-- 4. CERA DE FIJACIÓN FUERTE (VERDE)
INSERT INTO products (name, description, price, stock, is_active, image_url)
SELECT 'CERA DE FIJACIÓN FUERTE (VERDE) 4Oz', E'Cera base agua con excelente fijación y duración prolongada, da brillo y cuerpo al cabello\nAROMA: Limó-musgo-ambarada\nBENEFICIOS: No deja residuos, Fácil de enjuagar', 350.00, 30, true, 'assets/cerafijacionfuerteverde.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name LIKE 'CERA DE FIJACIÓN FUERTE (VERDE)%');

-- 5. CERA DE FIJACIÓN FUERTE MATE (NARANJA)
INSERT INTO products (name, description, price, stock, is_active, image_url)
SELECT 'CERA DE FIJACIÓN FUERTE MATE (NARANJA) 4Oz', E'Cera base agua con excelente fijación y duración prolongada, da brillo y cuerpo al cabello\nBENEFICIOS: No deja residuos, Fácil de enjuagar\nINGREDIENTES DESTACADOS: Cera de abeja, Aceite de ricino', 350.00, 30, true, 'assets/cerafijacionfuertematenaranja.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name LIKE 'CERA DE FIJACIÓN FUERTE MATE%');

-- 6. CERA DE FIJACIÓN SUAVE (AZUL)
INSERT INTO products (name, description, price, stock, is_active, image_url)
SELECT 'CERA DE FIJACIÓN SUAVE (AZUL) 4Oz', E'Cera base agua con excelente fijación y duración prolongada, da brillo y cuerpo al cabello\nAROMA: Cacao-Café\nBENEFICIOS: No deja residuos, Fácil de enjuagar', 350.00, 30, true, 'assets/cerafijacionsuaveazul.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name LIKE 'CERA DE FIJACIÓN SUAVE%');

-- 7. BÁLSAMO PARA BARBA Y BIGOTE
INSERT INTO products (name, description, price, stock, is_active, image_url)
SELECT 'BÁLSAMO PARA BARBA Y BIGOTE', 'Bálsamo para el crecimiento de la barba y bigote contiene Minoxidil a 2% y alga marina para un cuidado completo', 750.00, 20, true, 'assets/balsamobarbaybigote.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BÁLSAMO PARA BARBA Y BIGOTE');

-- 8. CERA WEB (Telaraña)
INSERT INTO products (name, description, price, stock, is_active, image_url)
SELECT 'CERA WEB (Telaraña) 4oz', E'Formula versátil para conseguir estilos desenfadados y estructurados.\nBeneficios: No deja residuos, Fácil de enjuagar', 350.00, 30, true, 'assets/ceraweb.jpeg'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name LIKE 'CERA WEB%');

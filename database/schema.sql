-- =============================================
-- BRACO'S BARBERÍA - ESQUEMA DE BASE DE DATOS
-- =============================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLA: TIPOS DE CLIENTE
-- =============================================
CREATE TABLE client_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL,
    description VARCHAR(255),
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO client_types (name, display_name, color, description, priority) VALUES
('normal', 'Cliente', '#C4A35A', 'Cliente regular', 0),
('premium', 'Premium', '#D4B76A', 'Cliente con membresía Premium', 1),
('vip', 'VIP', '#1A1A1A', 'Cliente VIP con beneficios exclusivos', 2);

-- =============================================
-- TABLA: CLIENTES
-- =============================================
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20) UNIQUE NOT NULL,
    client_type_id INTEGER REFERENCES client_types(id) DEFAULT 1,
    notes TEXT,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    last_visit_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_uuid ON clients(uuid);

-- =============================================
-- TABLA: CATEGORÍAS DE SERVICIOS
-- =============================================
CREATE TABLE service_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO service_categories (name, display_order) VALUES
('Cortes', 1),
('Barba', 2),
('Tratamientos Capilares', 3),
('Cuidado Facial', 4),
('Cuidado Personal', 5),
('Paquetes', 6);

-- =============================================
-- TABLA: SERVICIOS
-- =============================================
CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES service_categories(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar servicios de Braco's
INSERT INTO services (category_id, name, description, duration_minutes, price, display_order) VALUES
(1, 'Corte de Cabello Caballero', 'Lavado, visagismo, corte, estilizado y productos premium', 60, 300.00, 1),
(1, 'Corte de Cabello Niño', 'Hasta 11 años. Lavado, visagismo, corte y estilizado', 60, 220.00, 2),
(2, 'Ritual Tradicional de Barba', 'Visagismo, rasurado o arreglo, toallas calientes/frías, masaje facial y craneal', 60, 300.00, 1),
(3, 'Instalación de Prótesis Capilar', 'Diagnóstico, prótesis capilar, visagismo y personalización', 180, 4800.00, 1),
(3, 'Mantenimiento de Prótesis Capilar', 'Retiro, limpieza, restauración, ajuste y colocación', 120, 650.00, 2),
(3, 'Terapia Integral Capilar (TIC)', 'Exfoliación, alta frecuencia, fotobiomodulación, ozonoterapia', 60, 550.00, 3),
(4, 'Mascarilla Plastificada Negra', 'Limpieza de puntos negros. Incluye masaje facial', 60, 300.00, 1),
(4, 'Mascarilla de Arcilla', 'Exfoliación suave y mantenimiento. Incluye masaje facial', 60, 300.00, 2),
(5, 'Manicura Caballero', 'Cutícula, exfoliación, recorte, humectación y masaje', 60, 300.00, 1),
(5, 'Pedicura Caballero', 'Cutícula, exfoliación, recorte, limado y masaje', 60, 300.00, 2),
(6, 'DÚO', 'Visagismo, corte de cabello y ritual tradicional de barba', 120, 550.00, 1),
(6, 'Paquete Nupcial D''Lux', 'Visagismo, corte, ritual de barba, mascarilla y manicura SPA', 240, 1200.00, 2);

-- =============================================
-- TABLA: PRODUCTOS
-- =============================================
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products (name, description, price, stock) VALUES
('Shampoo Braco''s', '100% natural, libre de sulfatos, parabenos y sales. Con Minoxidil 2%', 350.00, 50),
('Aceite para Barba Braco''s', 'Aceite hidratante con esencias naturales', 250.00, 40);

-- =============================================
-- TABLA: TIPOS DE MEMBRESÍA
-- =============================================
CREATE TABLE membership_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    client_type_id INTEGER REFERENCES client_types(id) NOT NULL,
    total_services INTEGER NOT NULL,
    validity_days INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount_products INTEGER DEFAULT 0,
    benefits JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0
);

INSERT INTO membership_types (name, description, client_type_id, total_services, validity_days, price, discount_products, benefits, display_order) VALUES
('Premium', '6 cortes de cabello', 2, 6, 180, 1500.00, 10, '{"priority_booking": true, "free_drinks": true}', 1),
('Premium Plus', '10 cortes de cabello + 1 ritual de barba', 2, 10, 365, 2400.00, 15, '{"priority_booking": true, "free_drinks": true, "free_ritual": true}', 2),
('VIP', '12 servicios a elegir + tratamiento facial', 3, 12, 365, 4500.00, 20, '{"priority_booking": true, "free_drinks": true, "exclusive_services": true, "free_facial": true}', 3);

-- =============================================
-- TABLA: MEMBRESÍAS DE CLIENTES
-- =============================================
CREATE TABLE client_memberships (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    client_id INTEGER REFERENCES clients(id) NOT NULL,
    membership_type_id INTEGER REFERENCES membership_types(id) NOT NULL,
    total_services INTEGER NOT NULL,
    used_services INTEGER DEFAULT 0,
    purchase_date DATE NOT NULL,
    activation_date DATE,
    expiration_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
    payment_method VARCHAR(50),
    payment_amount DECIMAL(10,2),
    notes TEXT,
    activated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_memberships_client ON client_memberships(client_id);
CREATE INDEX idx_memberships_status ON client_memberships(status);

-- =============================================
-- TABLA: USO DE MEMBRESÍA (BITÁCORA)
-- =============================================
CREATE TABLE membership_usage (
    id SERIAL PRIMARY KEY,
    membership_id INTEGER REFERENCES client_memberships(id) NOT NULL,
    appointment_id INTEGER,
    service_id INTEGER REFERENCES services(id) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: HORARIOS DEL NEGOCIO
-- =============================================
CREATE TABLE business_hours (
    id SERIAL PRIMARY KEY,
    day_of_week INTEGER NOT NULL UNIQUE CHECK (day_of_week >= 0 AND day_of_week <= 6),
    day_name VARCHAR(20) NOT NULL,
    open_time TIME,
    close_time TIME,
    is_open BOOLEAN DEFAULT TRUE,
    break_start TIME,
    break_end TIME
);

-- 0=Domingo, 1=Lunes, ..., 6=Sábado
INSERT INTO business_hours (day_of_week, day_name, open_time, close_time, is_open, break_start, break_end) VALUES
(0, 'Domingo', NULL, NULL, FALSE, NULL, NULL),
(1, 'Lunes', '10:00', '20:00', TRUE, '14:00', '15:00'),
(2, 'Martes', '10:00', '20:00', TRUE, '14:00', '15:00'),
(3, 'Miércoles', '10:00', '20:00', TRUE, '14:00', '15:00'),
(4, 'Jueves', '10:00', '20:00', TRUE, '14:00', '15:00'),
(5, 'Viernes', '10:00', '20:00', TRUE, '14:00', '15:00'),
(6, 'Sábado', '10:00', '17:00', TRUE, NULL, NULL);

-- =============================================
-- TABLA: DÍAS BLOQUEADOS
-- =============================================
CREATE TABLE blocked_dates (
    id SERIAL PRIMARY KEY,
    blocked_date DATE NOT NULL UNIQUE,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: CITAS
-- =============================================
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    client_id INTEGER REFERENCES clients(id) NOT NULL,
    service_id INTEGER REFERENCES services(id) NOT NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    checkout_code VARCHAR(6) UNIQUE,
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    confirmation_sent BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(50) DEFAULT 'client',
    cancelled_at TIMESTAMP,
    cancelled_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_client ON appointments(client_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_code ON appointments(checkout_code);

-- =============================================
-- TABLA: CHECKOUTS
-- =============================================
CREATE TABLE checkouts (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    appointment_id INTEGER REFERENCES appointments(id) NOT NULL UNIQUE,
    client_id INTEGER REFERENCES clients(id) NOT NULL,
    service_cost DECIMAL(10,2) NOT NULL,
    products_cost DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer', 'membership')),
    used_membership BOOLEAN DEFAULT FALSE,
    membership_id INTEGER REFERENCES client_memberships(id),
    notes TEXT,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLA: PRODUCTOS EN CHECKOUT
-- =============================================
CREATE TABLE checkout_products (
    id SERIAL PRIMARY KEY,
    checkout_id INTEGER REFERENCES checkouts(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL
);

-- =============================================
-- TABLA: TRANSACCIONES (REPORTES)
-- =============================================
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    checkout_id INTEGER REFERENCES checkouts(id),
    membership_purchase_id INTEGER REFERENCES client_memberships(id),
    client_id INTEGER REFERENCES clients(id) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('service', 'product', 'membership')),
    description VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(type);

-- =============================================
-- TABLA: CONFIGURACIONES
-- =============================================
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    description VARCHAR(255)
);

INSERT INTO system_settings (key, value, description) VALUES
('business_name', 'Braco''s Barbería & Peluquería', 'Nombre del negocio'),
('business_phone', '5573432027', 'Teléfono'),
('business_address', 'Calle Heroico Colegio Militar #46, Local J, Plaza Comercial Hacienda, Tequisquiapan, Querétaro', 'Dirección'),
('slot_interval_minutes', '30', 'Intervalo de slots'),
('advance_booking_days', '30', 'Días de anticipación'),
('timezone', 'America/Mexico_City', 'Zona horaria');

-- =============================================
-- TABLA: ADMIN USERS
-- =============================================
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- FUNCIONES ÚTILES
-- =============================================

-- Función para generar código de checkout único por día
CREATE OR REPLACE FUNCTION generate_checkout_code(p_date DATE)
RETURNS VARCHAR(6) AS $$
DECLARE
    v_code VARCHAR(6);
    v_exists BOOLEAN;
BEGIN
    LOOP
        v_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        SELECT EXISTS(
            SELECT 1 FROM appointments 
            WHERE checkout_code = v_code 
            AND appointment_date = p_date
        ) INTO v_exists;
        EXIT WHEN NOT v_exists;
    END LOOP;
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar disponibilidad
CREATE OR REPLACE FUNCTION check_slot_availability(
    p_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_exclude_id INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_conflicts INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_conflicts
    FROM appointments
    WHERE appointment_date = p_date
    AND status NOT IN ('cancelled', 'no_show')
    AND (p_exclude_id IS NULL OR id != p_exclude_id)
    AND (start_time < p_end_time AND end_time > p_start_time);
    
    RETURN v_conflicts = 0;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_clients_updated BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_appointments_updated BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_memberships_updated BEFORE UPDATE ON client_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- VISTAS ÚTILES
-- =============================================

-- Vista: Citas de hoy
CREATE VIEW v_today_appointments AS
SELECT 
    a.id,
    a.uuid,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.status,
    a.checkout_code,
    c.name AS client_name,
    c.phone AS client_phone,
    ct.name AS client_type,
    ct.color AS client_color,
    s.name AS service_name,
    s.price AS service_price,
    s.duration_minutes
FROM appointments a
JOIN clients c ON a.client_id = c.id
JOIN client_types ct ON c.client_type_id = ct.id
JOIN services s ON a.service_id = s.id
WHERE a.appointment_date = CURRENT_DATE
ORDER BY a.start_time;

-- Vista: Membresías activas
CREATE VIEW v_active_memberships AS
SELECT 
    cm.*,
    c.name AS client_name,
    c.phone AS client_phone,
    mt.name AS membership_name,
    cm.total_services - cm.used_services AS remaining_services
FROM client_memberships cm
JOIN clients c ON cm.client_id = c.id
JOIN membership_types mt ON cm.membership_type_id = mt.id
WHERE cm.status = 'active'
AND cm.expiration_date >= CURRENT_DATE;

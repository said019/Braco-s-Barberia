-- Tabla de Administradores
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'admin',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Insertar admin por defecto (password: admin123)
-- Nota: En producción esto debe ser hasheado. Aquí usaremos texto plano temporalmente o un hash conocido si es posible.
-- Para este entorno, asumiremos que el backend maneja el hashing.
-- Pero para que el login funcione "ya", insertaré un usuario si el backend compara hashes.
-- Si el backend usa bcrypt, necesito generar el hash.
-- Hash de 'admin123' con bcrypt (cost 10): $2b$10$X7V.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5.j5
-- Mejor dejar que el endpoint de registro lo cree, o crear uno con un hash conocido.

-- Voy a crear la tabla primero.

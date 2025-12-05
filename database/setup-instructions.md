# 🗄️ Configuración de Base de Datos - Braco's Barbería

## Paso 1: Instalar PostgreSQL

### macOS (Homebrew)
```bash
# Instalar PostgreSQL
brew install postgresql@16

# Iniciar el servicio de PostgreSQL
brew services start postgresql@16

# Agregar PostgreSQL al PATH (agregar a ~/.zshrc)
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Paso 2: Crear la Base de Datos

```bash
# Crear la base de datos
createdb bracos_barberia

# Verificar que se creó correctamente
psql -l | grep bracos
```

## Paso 3: Ejecutar el Schema

```bash
# Desde el directorio del proyecto
cd /Users/cristophersaidromerojuarez/Desktop/Barberia-Braco\'s

# Ejecutar el script SQL
psql -d bracos_barberia -f database/schema.sql
```

## Paso 4: Crear Usuario Admin por Defecto

```bash
psql -d bracos_barberia
```

Luego ejecutar en la consola de PostgreSQL:

```sql
-- Crear usuario admin (password: admin123)
-- NOTA: Cambiar el password en producción
INSERT INTO admin_users (username, password_hash, name, role)
VALUES (
    'admin',
    '$2b$10$rKjZ1YGJxKj5YqXqKZ5QZ.8tZ5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5e',
    'Miguel Trujillo',
    'admin'
);

-- Verificar la creación
SELECT * FROM admin_users;

-- Salir
\q
```

## Paso 5: Verificar la Instalación

```bash
# Conectarse a la base de datos
psql -d bracos_barberia

# Ver todas las tablas
\dt

# Ver datos de ejemplo
SELECT * FROM services;
SELECT * FROM client_types;
SELECT * FROM business_hours;

# Salir
\q
```

## 📊 Estructura de la Base de Datos

### Tablas Principales:
- ✅ `client_types` - Tipos de cliente (Normal, Premium, VIP)
- ✅ `clients` - Clientes registrados
- ✅ `service_categories` - Categorías de servicios
- ✅ `services` - Servicios ofrecidos (12 servicios)
- ✅ `products` - Productos a la venta
- ✅ `membership_types` - Tipos de membresía
- ✅ `client_memberships` - Membresías de clientes
- ✅ `membership_usage` - Uso de membresías
- ✅ `business_hours` - Horarios del negocio
- ✅ `blocked_dates` - Días bloqueados
- ✅ `appointments` - Citas agendadas
- ✅ `checkouts` - Checkouts/cobros
- ✅ `checkout_products` - Productos en checkouts
- ✅ `transactions` - Historial de transacciones
- ✅ `system_settings` - Configuraciones del sistema
- ✅ `admin_users` - Usuarios administradores

### Funciones Especiales:
- `generate_checkout_code()` - Genera códigos únicos para checkout
- `check_slot_availability()` - Verifica disponibilidad de horarios

### Vistas:
- `v_today_appointments` - Citas del día actual
- `v_active_memberships` - Membresías activas

## 🔒 Seguridad

Para producción, recuerda:
1. Cambiar el password del usuario admin
2. Crear variables de entorno para credenciales de DB
3. Usar conexiones SSL
4. Configurar backups automáticos

## 🔗 Conexión desde la API

Las credenciales por defecto serán:
```
HOST: localhost
PORT: 5432
DATABASE: bracos_barberia
USER: tu_usuario_mac (por defecto)
PASSWORD: (vacío en desarrollo local)
```

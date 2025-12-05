# 🗄️ Base de Datos - Braco's Barbería

Base de datos PostgreSQL para el sistema de agendamiento de Braco's Barbería & Peluquería.

## 🚀 Instalación Rápida

### Opción 1: Script Automático (Recomendado)

```bash
cd database
./install.sh
```

Este script instalará automáticamente:
- ✅ Homebrew (si no está instalado)
- ✅ PostgreSQL 16
- ✅ Node.js 20
- ✅ Creará la base de datos `bracos_barberia`
- ✅ Ejecutará el schema completo

### Opción 2: Instalación Manual

#### 1. Instalar Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 2. Instalar PostgreSQL
```bash
brew install postgresql@16
brew services start postgresql@16

# Agregar al PATH
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

#### 3. Crear Base de Datos
```bash
createdb bracos_barberia
```

#### 4. Ejecutar Schema
```bash
psql -d bracos_barberia -f database/schema.sql
```

## 📊 Estructura de la Base de Datos

### Tablas Principales

| Tabla | Descripción | Registros Iniciales |
|-------|-------------|---------------------|
| `client_types` | Tipos de cliente (Normal, Premium, VIP) | 3 |
| `clients` | Clientes registrados | 0 |
| `service_categories` | Categorías de servicios | 6 |
| `services` | Servicios ofrecidos | 12 |
| `products` | Productos a la venta | 2 |
| `membership_types` | Tipos de membresía | 3 |
| `client_memberships` | Membresías activas de clientes | 0 |
| `business_hours` | Horarios del negocio | 7 |
| `appointments` | Citas agendadas | 0 |
| `checkouts` | Checkouts/cobros | 0 |
| `transactions` | Historial de transacciones | 0 |
| `admin_users` | Usuarios administradores | 0 |

### Funciones Especiales

- **`generate_checkout_code(date)`**: Genera códigos únicos de 4 dígitos para checkout
- **`check_slot_availability(date, start_time, end_time)`**: Verifica disponibilidad de horarios

### Triggers

- **`update_updated_at`**: Actualiza automáticamente `updated_at` en tablas principales

### Vistas

- **`v_today_appointments`**: Citas del día actual con información completa
- **`v_active_memberships`**: Membresías activas con servicios restantes

## 🔍 Consultas Útiles

### Ver todos los servicios
```sql
SELECT 
    sc.name as categoria,
    s.name as servicio,
    s.duration_minutes as duracion,
    s.price as precio
FROM services s
JOIN service_categories sc ON s.category_id = sc.id
WHERE s.is_active = TRUE
ORDER BY sc.display_order, s.display_order;
```

### Ver horarios del negocio
```sql
SELECT 
    day_name as dia,
    CASE 
        WHEN is_open THEN open_time || ' - ' || close_time
        ELSE 'CERRADO'
    END as horario,
    CASE
        WHEN break_start IS NOT NULL 
        THEN 'Descanso: ' || break_start || ' - ' || break_end
        ELSE 'Sin descanso'
    END as descanso
FROM business_hours
ORDER BY day_of_week;
```

### Ver citas de hoy
```sql
SELECT * FROM v_today_appointments;
```

### Ver membresías activas
```sql
SELECT 
    client_name,
    membership_name,
    remaining_services as servicios_restantes,
    expiration_date as vence
FROM v_active_memberships
ORDER BY expiration_date;
```

## 🔧 Mantenimiento

### Hacer Backup
```bash
pg_dump bracos_barberia > backup_$(date +%Y%m%d).sql
```

### Restaurar Backup
```bash
psql -d bracos_barberia < backup_20231204.sql
```

### Reiniciar Base de Datos
```bash
dropdb bracos_barberia
createdb bracos_barberia
psql -d bracos_barberia -f database/schema.sql
```

## 📝 Datos Precargados

### Servicios (12)
- Corte de Cabello Caballero ($300, 60 min)
- Corte de Cabello Niño ($220, 60 min)
- Ritual Tradicional de Barba ($300, 60 min)
- DÚO - Corte + Barba ($550, 120 min)
- Instalación de Prótesis Capilar ($4,800, 180 min)
- Mantenimiento de Prótesis ($650, 120 min)
- Terapia Integral Capilar ($550, 60 min)
- Mascarilla Plastificada Negra ($300, 60 min)
- Mascarilla de Arcilla ($300, 60 min)
- Manicura Caballero ($300, 60 min)
- Pedicura Caballero ($300, 60 min)
- Paquete Nupcial D'Lux ($1,200, 240 min)

### Productos (2)
- Shampoo Braco's ($350)
- Aceite para Barba Braco's ($250)

### Membresías (3)
- Premium: 6 cortes / 6 meses / $1,500
- Premium Plus: 10 cortes / 12 meses / $2,400
- VIP: 12 servicios / 12 meses / $4,500

### Horarios
- Lunes a Viernes: 10:00 - 20:00 (Descanso 14:00-15:00)
- Sábado: 10:00 - 17:00
- Domingo: Cerrado

## 🔗 Conexión desde la API

Las credenciales por defecto para desarrollo local:

```javascript
{
  host: 'localhost',
  port: 5432,
  database: 'bracos_barberia',
  user: process.env.USER, // Tu usuario de macOS
  password: '' // Sin password en desarrollo local
}
```

## 🛡️ Seguridad

Para producción:
1. ✅ Crear usuario específico con password
2. ✅ Configurar SSL/TLS
3. ✅ Backups automáticos diarios
4. ✅ Variables de entorno para credenciales
5. ✅ Limitar conexiones por IP

## 📞 Soporte

Si encuentras errores durante la instalación:

1. Verifica que PostgreSQL esté corriendo:
   ```bash
   brew services list | grep postgresql
   ```

2. Reinicia PostgreSQL:
   ```bash
   brew services restart postgresql@16
   ```

3. Verifica la conexión:
   ```bash
   psql -l
   ```

---

**Desarrollado para Braco's Barbería & Peluquería**  
Miguel Trujillo | Tequisquiapan, Querétaro

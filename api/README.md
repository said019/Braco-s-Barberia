# 🚀 Braco's Barbería - Backend API

API RESTful para el sistema de agendamiento de Braco's Barbería & Peluquería.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Uso](#uso)
- [Endpoints API](#endpoints-api)
- [Estructura del Proyecto](#estructura-del-proyecto)

## ✨ Características

- ✅ API RESTful completa
- ✅ Autenticación JWT
- ✅ Validación de datos
- ✅ Manejo centralizado de errores
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ Seguridad con Helmet
- ✅ Compresión de respuestas
- ✅ Logging con Morgan
- ✅ Conexión a PostgreSQL
- ✅ Transacciones de base de datos
- ✅ Código modular y escalable

## 🛠️ Tecnologías

- **Node.js** v18+
- **Express** v4.18
- **PostgreSQL** v16
- **JWT** - Autenticación
- **Bcrypt** - Hash de contraseñas
- **Express Validator** - Validación de datos
- **Helmet** - Seguridad HTTP
- **CORS** - Cross-Origin Resource Sharing
- **Morgan** - HTTP request logger
- **Compression** - Compresión gzip

## 📦 Instalación

```bash
# Navegar al directorio de la API
cd api

# Instalar dependencias
npm install
```

## ⚙️ Configuración

1. Copiar el archivo `.env` y configurar las variables de entorno:

```bash
cp .env.example .env
```

2. Editar `.env` con tus configuraciones:

```env
# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bracos_barberia
DB_USER=tu_usuario
DB_PASSWORD=tu_password

# JWT
JWT_SECRET=tu_secreto_super_seguro

# Puerto del servidor
PORT=3000
```

## 🚀 Uso

### Modo Desarrollo

```bash
npm run dev
```

### Modo Producción

```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📍 Endpoints API

### Health Check

```
GET /api/health
```

Verifica que el API esté funcionando correctamente.

**Respuesta:**
```json
{
  "success": true,
  "message": "Braco's Barbería API está funcionando",
  "timestamp": "2025-12-04T19:04:53.583Z"
}
```

---

### 🎯 Servicios

#### Obtener todos los servicios

```
GET /api/services
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "services": [...],
    "grouped": {
      "Cortes": [...],
      "Barba": [...],
      "Tratamientos Capilares": [...],
      ...
    }
  }
}
```

#### Obtener categorías

```
GET /api/services/categories
```

#### Obtener servicio por ID

```
GET /api/services/:id
```

#### Obtener servicios por categoría

```
GET /api/services/category/:categoryId
```

#### Crear servicio (Admin)

```
POST /api/services
Authorization: Bearer <token>
```

**Body:**
```json
{
  "category_id": 1,
  "name": "Nuevo Servicio",
  "description": "Descripción del servicio",
  "duration_minutes": 60,
  "price": 300,
  "display_order": 1
}
```

---

### 👥 Clientes

#### Obtener todos los clientes (Admin)

```
GET /api/clients
Authorization: Bearer <token>
```

**Query params:**
- `search` - Buscar por nombre, teléfono o email
- `limit` - Limitar resultados

#### Buscar cliente por teléfono

```
GET /api/clients/phone/:phone
```

#### Crear cliente

```
POST /api/clients
```

**Body:**
```json
{
  "name": "Juan Pérez",
  "phone": "5512345678",
  "email": "juan@example.com",
  "notes": "Cliente preferente"
}
```

#### Obtener historial de citas del cliente

```
GET /api/clients/:id/appointments
Authorization: Bearer <token>
```

#### Obtener membresías del cliente

```
GET /api/clients/:id/memberships
Authorization: Bearer <token>
```

---

### 📅 Citas

#### Obtener horarios disponibles

```
GET /api/appointments/available-slots?date=2025-12-05&serviceId=1
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "date": "2025-12-05",
    "service": {
      "id": 1,
      "name": "Corte de Cabello Caballero",
      "duration": 60
    },
    "slots": [
      { "start": "10:00", "end": "11:00", "available": true },
      { "start": "10:30", "end": "11:30", "available": true },
      ...
    ]
  }
}
```

#### Crear cita

```
POST /api/appointments
```

**Body:**
```json
{
  "client_id": 1,
  "service_id": 1,
  "appointment_date": "2025-12-05",
  "start_time": "10:00",
  "end_time": "11:00",
  "notes": "Cliente nuevo"
}
```

#### Obtener citas de hoy (Admin)

```
GET /api/appointments/today
Authorization: Bearer <token>
```

#### Obtener todas las citas (Admin)

```
GET /api/appointments
Authorization: Bearer <token>
```

**Query params:**
- `date` - Filtrar por fecha específica
- `status` - Filtrar por estado
- `clientId` - Filtrar por cliente
- `startDate` & `endDate` - Rango de fechas

#### Confirmar cita (Admin)

```
POST /api/appointments/:id/confirm
Authorization: Bearer <token>
```

#### Cancelar cita

```
POST /api/appointments/:id/cancel
Authorization: Bearer <token>
```

**Body:**
```json
{
  "reason": "Motivo de cancelación"
}
```

#### Completar cita (Admin)

```
POST /api/appointments/:id/complete
Authorization: Bearer <token>
```

#### Marcar como no show (Admin)

```
POST /api/appointments/:id/no-show
Authorization: Bearer <token>
```

---

## 📁 Estructura del Proyecto

```
api/
├── config/
│   ├── database.js       # Configuración de PostgreSQL
│   └── index.js          # Configuraciones generales
├── controllers/
│   ├── serviceController.js
│   ├── clientController.js
│   └── appointmentController.js
├── middleware/
│   ├── auth.js           # Autenticación JWT
│   ├── errorHandler.js   # Manejo de errores
│   └── validators.js     # Validación de datos
├── models/
│   ├── Service.js        # Modelo de servicios
│   ├── Client.js         # Modelo de clientes
│   ├── Appointment.js    # Modelo de citas
│   ├── Product.js        # Modelo de productos
│   └── Membership.js     # Modelo de membresías
├── routes/
│   ├── index.js          # Router principal
│   ├── services.js       # Rutas de servicios
│   ├── clients.js        # Rutas de clientes
│   └── appointments.js   # Rutas de citas
├── utils/
│   └── (utilidades)
├── .env                  # Variables de entorno
├── .gitignore
├── package.json
├── server.js             # Punto de entrada
└── README.md
```

## 🔐 Autenticación

Las rutas protegidas requieren un token JWT en el header:

```
Authorization: Bearer <tu_token_jwt>
```

### Ejemplo de uso:

```bash
curl -H "Authorization: Bearer eyJhbGc..." \
     http://localhost:3000/api/appointments/today
```

## ✅ Validaciones

Todas las peticiones son validadas antes de procesarse. Ejemplos de respuestas de validación:

```json
{
  "success": false,
  "message": "Errores de validación",
  "errors": [
    {
      "field": "phone",
      "message": "El teléfono debe tener 10 dígitos"
    }
  ]
}
```

## 🛡️ Seguridad

- ✅ Helmet para headers HTTP seguros
- ✅ Rate limiting (100 requests / 15 minutos)
- ✅ CORS configurado
- ✅ Validación de entrada
- ✅ Sanitización de datos
- ✅ JWT para autenticación
- ✅ Hash de contraseñas con bcrypt

## 📊 Base de Datos

La API se conecta a PostgreSQL usando un pool de conexiones. Ver `/database/README.md` para información sobre la estructura de la base de datos.

## 🚨 Manejo de Errores

Todos los errores son manejados centralizadamente y devuelven respuestas consistentes:

```json
{
  "success": false,
  "message": "Descripción del error"
}
```

## 📝 Logging

En desarrollo, se usa `morgan` en modo 'dev' para logging detallado de requests HTTP.

## 🧪 Testing

```bash
# Probar health check
curl http://localhost:3000/api/health

# Probar servicios
curl http://localhost:3000/api/services

# Probar slots disponibles
curl "http://localhost:3000/api/appointments/available-slots?date=2025-12-05&serviceId=1"
```

## 📞 Soporte

Para problemas o preguntas:
- Revisar los logs del servidor
- Verificar la conexión a PostgreSQL
- Asegurarse de que las variables de entorno estén configuradas correctamente

---

**Desarrollado para Braco's Barbería & Peluquería**  
Miguel Trujillo | Tequisquiapan, Querétaro

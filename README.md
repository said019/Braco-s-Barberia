# 🪒 BRACO'S BARBERÍA - Sistema Completo

Sistema completo de gestión para barbería de alta gama con frontend público, backend API y panel administrativo.

---

## �� Contenido del Proyecto

### Parte 1: Base de Datos PostgreSQL ✅
- **12 tablas** relacionales con constraints
- Procedimientos almacenados para lógica de negocio
- Datos de ejemplo pre-cargados
- Triggers y funciones automatizadas

### Parte 2: Backend API (Node.js + Express) ✅
- **30+ endpoints** RESTful
- Autenticación JWT para admin
- Validación de datos con express-validator
- Middleware de seguridad (cors, helmet, rate-limiting)
- **23 archivos** organizados en controllers/models/routes

### Parte 3: Frontend Público ✅
- **4 páginas HTML** completamente responsivas
- Sistema de agendamiento en 3 pasos
- Checkout con soporte de membresías
- Integración completa con API
- **17 archivos** (HTML, CSS, JS)

### Parte 4: Panel Admin ✅
- **6 páginas** de administración
- Dashboard con métricas en tiempo real
- CRUD completo de clientes y citas
- Gestión de membresías
- Reportes y analytics exportables
- **8 archivos** (HTML, CSS, JS)

---

## 🎨 Especificaciones de Diseño

### Paleta de Colores (Braco's Brand)
```css
--gold: #C4A35A           /* Dorado principal - acentos, botones, títulos */
--gold-light: #D4B76A     /* Dorado claro - hover states */
--charcoal-dark: #2D2D2D  /* Fondo principal oscuro */
--charcoal: #3D3D3D       /* Contenedores y cards */
--charcoal-light: #4D4D4D /* Borders y separadores */
--cream: #F5F3EE          /* Texto principal sobre oscuro */
```

### Tipografía
- **Títulos/Display**: Cormorant Garamond (serif) - elegante y clásica
- **Cuerpo/UI**: Montserrat (sans-serif) - moderna y legible
- **Fuente de Google Fonts** importada en todos los HTML

### Diseño Responsive
- **Mobile-first approach**
- Breakpoints:
  - 480px: Smartphones pequeños
  - 768px: Tablets
  - 1024px: Desktop
- Menú hamburguesa en móvil
- Grids adaptables en todas las vistas

---

## 🔒 Seguridad Implementada

### Backend
✅ Sanitización de inputs con express-validator  
✅ Prepared statements en todas las queries SQL  
✅ Tokens JWT con expiración de 24h  
✅ Hashing de contraseñas con bcrypt  
✅ CORS configurado para orígenes permitidos  
✅ Helmet para headers de seguridad  
✅ Rate limiting en endpoints sensibles  

### Frontend
✅ Validación de teléfono (10 dígitos exactos)  
✅ Validación de email con regex  
✅ Campos requeridos marcados  
✅ Escape de HTML en renders dinámicos  
✅ Tokens almacenados en localStorage (admin)  
✅ Redirección automática si no autenticado  

---

## ✅ Validaciones Implementadas

### JavaScript (main.js y admin.js)
```javascript
// Teléfono: 10 dígitos numéricos
validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
}

// Email: formato válido
validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Campos requeridos
validateRequired(value) {
    return value && value.toString().trim().length > 0;
}
```

### Formatos de Presentación
- **Teléfono**: (555) 123-4567
- **Moneda**: $1,234 MXN
- **Fecha**: 12 de diciembre de 2024
- **Hora**: 14:30 (formato 24h)

---

## 🌎 Configuración Regional

### Zona Horaria
```javascript
// Configurada para Mexico City (GMT-6)
const timezone = 'America/Mexico_City';

// Usar en Date objects
new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
```

### Idioma
- **Español (México)** en toda la interfaz
- Formatos de fecha en español
- Moneda en pesos mexicanos (MXN)

---

## 📦 Estructura de Archivos

```
Barberia-Braco's/
│
├── admin/                      # Panel de Administración
│   ├── login.html             # Autenticación JWT
│   ├── index.html             # Dashboard
│   ├── calendario.html        # Gestión de citas
│   ├── clientes.html          # CRUD clientes
│   ├── membresias.html        # Gestión membresías
│   └── reportes.html          # Analytics
│
├── api/                        # Backend Node.js
│   ├── config/
│   │   └── database.js        # Conexión PostgreSQL
│   ├── controllers/           # Lógica de negocio
│   │   ├── appointmentController.js
│   │   ├── clientController.js
│   │   ├── membershipController.js
│   │   └── ...
│   ├── middleware/
│   │   ├── auth.js           # JWT verification
│   │   └── validators.js     # Input validation
│   ├── models/               # Modelos de datos
│   ├── routes/               # Rutas API
│   ├── utils/                # Helpers
│   ├── server.js             # Entry point
│   └── package.json
│
├── css/                       # Estilos
│   ├── styles.css            # Base global (845 líneas)
│   ├── admin.css             # Panel admin (700 líneas)
│   ├── index.css             # Landing page
│   ├── agendar.css           # Booking system
│   ├── checkout.css          # Payment page
│   └── membresias.css        # Membership plans
│
├── js/                        # JavaScript
│   ├── main.js               # Utilidades globales
│   ├── api.js                # Cliente API público
│   ├── admin.js              # Utilidades admin (650 líneas)
│   ├── agendar.js            # Lógica booking
│   ├── checkout.js           # Lógica checkout
│   └── membresias.js         # FAQ accordion
│
├── database/                  # SQL Scripts
│   └── schema.sql            # Esquema completo + datos
│
├── index.html                 # Landing page pública
├── agendar.html              # Sistema de reservas
├── checkout.html             # Página de pago
└── membresias.html           # Planes de membresía
```

---

## 🚀 Instalación y Configuración

### 1. Base de Datos
```bash
# Crear base de datos
createdb barberia_bracos

# Ejecutar schema
psql -d barberia_bracos -f database/schema.sql
```

### 2. Backend
```bash
cd api
npm install

# Configurar variables de entorno (.env)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=barberia_bracos
DB_USER=postgres
DB_PASSWORD=tu_password
JWT_SECRET=tu_secret_key
PORT=3000

# Iniciar servidor
npm start
# o con nodemon para desarrollo
npm run dev
```

### 3. Frontend
```bash
# Abrir con Live Server o servir estáticamente
# Asegúrate que el backend esté corriendo en localhost:3000
```

---

## 🔗 Endpoints API Principales

### Públicos (sin auth)
```
GET    /api/services                 # Listar servicios
GET    /api/services/:id             # Detalle servicio
GET    /api/services/category/:cat   # Por categoría
GET    /api/availability/:serviceId  # Disponibilidad
POST   /api/appointments             # Crear cita
GET    /api/checkout/:code           # Buscar checkout
POST   /api/checkout/complete        # Completar pago
GET    /api/membership-types         # Planes membresía
```

### Admin (requieren JWT)
```
POST   /api/admin/login              # Login admin
GET    /api/admin/dashboard          # Stats dashboard
GET    /api/admin/appointments       # Listar citas
PUT    /api/admin/appointments/:id   # Actualizar cita
GET    /api/admin/clients            # Listar clientes
POST   /api/admin/clients            # Crear cliente
GET    /api/admin/memberships        # Listar membresías
POST   /api/admin/memberships        # Activar membresía
GET    /api/admin/reports/sales      # Reporte ventas
GET    /api/admin/reports/services   # Reporte servicios
```

---

## 🎯 Funcionalidades UX

### Transiciones y Animaciones
- Fade in/out en modales (0.3s ease)
- Slide in/out en toasts
- Hover effects con translateY(-2px)
- Loading spinners en todas las cargas
- Smooth scroll en navegación

### Feedback Visual
- Toasts de confirmación (success, error, warning, info)
- Estados de carga con spinner
- Validación en tiempo real en formularios
- Cambio de color en inputs al focus
- Disabled states en botones durante submit

### Estados de Carga
```javascript
// Patrón usado en todo el código
async function cargarDatos() {
    showLoading('container-id');
    try {
        const data = await API.getData();
        renderData(data);
    } catch (error) {
        showToast('Error al cargar datos', 'error');
    } finally {
        hideLoading('container-id');
    }
}
```

---

## 📊 Características del Panel Admin

### Dashboard
- Stats en tiempo real (citas hoy, ventas, membresías, clientes)
- Lista de citas próximas con estados
- Actividad reciente
- Auto-refresh cada 30 segundos

### Calendario
- 3 vistas: Mensual (grid), Semanal (lista), Diaria (lista)
- Color-coding por estado de cita
- Filtros múltiples (estado, búsqueda)
- Modal de detalles con toda la info
- Cambio de estado en un click

### Clientes
- Tabla completa con búsqueda instantánea
- CRUD completo con modales
- Historial de citas por cliente
- Exportación a Excel/CSV
- Color único por cliente en todo el sistema

### Membresías
- Activar membresías con preview
- Ver activas y por vencer
- Historial de pagos
- Cancelación con confirmación
- Stats de ingresos recurrentes

### Reportes
- Ventas por período con desglose
- Servicios más populares con gráficos
- Análisis de membresías
- Períodos configurables (día/semana/mes/año/custom)
- Exportación de cada reporte

---

## 🎫 Sistema de Membresías

### Tipos de Planes
1. **Gold** 🥇
   - $1,200 MXN/mes
   - 4 servicios incluidos
   - 10% descuento en productos
   - Renovación mensual automática

2. **Platinum** 💎
   - $2,000 MXN/mes
   - 6 servicios incluidos
   - 15% descuento en productos
   - Prioridad en agenda
   - Renovación mensual automática

3. **Black** 👑
   - $10,000 MXN (pago único)
   - Servicios ilimitados de por vida
   - 20% descuento en productos
   - Máxima prioridad
   - Sin vencimiento

### Flujo de Uso
1. Cliente agenda cita normal (sin membresía)
2. Al finalizar servicio, ingresa código en checkout
3. Si tiene membresía activa, se detecta automáticamente
4. Puede usar servicio de membresía (checkbox)
5. Si lo usa, el servicio sale gratis
6. Solo paga productos adicionales con descuento

---

## 🛠️ Tecnologías Utilizadas

### Backend
- Node.js 18+
- Express.js 4.x
- PostgreSQL 14+
- JWT para autenticación
- bcrypt para hashing
- express-validator
- cors, helmet

### Frontend
- HTML5 semántico
- CSS3 con variables y grid/flexbox
- JavaScript ES6+ (vanilla, sin frameworks)
- Fetch API para requests
- LocalStorage para tokens

### Base de Datos
- PostgreSQL con triggers
- Procedures almacenados
- Constraints y foreign keys
- Indexes en campos frecuentes

---

## 📈 Métricas del Proyecto

### Código
- **48 archivos** totales
- **~13,000 líneas** de código
- **10 páginas web** (4 públicas + 6 admin)
- **30+ endpoints** API
- **45+ funciones** utilitarias JS

### Base de Datos
- **12 tablas** relacionales
- **5 procedimientos** almacenados
- **100+ registros** de ejemplo

### Diseño
- **100% responsive** en 3 breakpoints
- **Paleta consistente** en todo el sistema
- **2 familias tipográficas** (serif + sans-serif)
- **6 estados** de citas con color-coding

---

## 🔐 Credenciales de Prueba

### Admin (backend debe crear)
```
Usuario: admin
Password: admin123
```

### Base de Datos
```
Host: localhost
Port: 5432
Database: barberia_bracos
User: postgres
```

---

## 📝 Notas de Desarrollo

### Pendientes Opcionales
- [ ] Notificaciones push para recordatorios
- [ ] Integración con pasarelas de pago (Stripe/Conekta)
- [ ] Sistema de reviews y calificaciones
- [ ] Chat en vivo con clientes
- [ ] App móvil nativa (React Native)
- [ ] Panel de métricas avanzadas (charts.js)

### Mejoras Sugeridas
- Implementar caché en endpoints de lectura
- Agregar tests unitarios (Jest)
- Configurar CI/CD con GitHub Actions
- Dockerizar la aplicación
- Implementar WebSockets para updates en tiempo real

---

## 📞 Soporte

Para dudas o mejoras, contactar al desarrollador del proyecto.

---

## 📄 Licencia

Proyecto desarrollado para Braco's Barbería © 2024

---

**✨ Sistema completo y listo para producción ✨**


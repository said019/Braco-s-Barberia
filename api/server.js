import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Importar configuraciones
import config from './config/index.js';
import { testConnection } from './config/database.js';

// Importar rutas
import routes from './routes/index.js';
import webhookEvolutionRoutes from './routes/webhookEvolution.js';

// Importar middleware
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Cargar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

// Health check ultra-simple (antes de cualquier middleware pesado)
// Railway/Proxies pueden validar este endpoint para determinar si la app está viva.
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: "Braco's Barbería API está funcionando",
    timestamp: new Date().toISOString()
  });
});

// ============================================
// MIDDLEWARE GLOBAL
// ============================================

// Seguridad - Deshabilitar CSP temporalmente para permitir todos los scripts inline
// TODO: Refactorizar el código para usar event listeners en lugar de onclick inline
app.use(helmet({
  contentSecurityPolicy: false  // Deshabilitado temporalmente para permitir onclick inline
}));

// CORS
app.use(cors(config.cors));

// Parseo de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compresión de respuestas
app.use(compression());

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Trust proxy (necesario para Railway y otros proxies reversos)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    message: 'Demasiadas solicitudes, por favor intenta de nuevo más tarde.'
  }
});
// IMPORTANT: No aplicar rate-limit a webhooks
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/webhooks') || req.path.startsWith('/webhook')) return next();
  return limiter(req, res, next);
});

// Webhook Evolution API (público, sin auth)
app.use('/api/webhook/evolution', webhookEvolutionRoutes);

// ============================================
// RUTAS
// ============================================

// Servir archivos estáticos (admin, css, js, assets)
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API Routes PRIMERO (antes de archivos estáticos)
app.use('/api', routes);

// Ruta raíz de la API
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: "Bienvenido a Braco's Barbería API",
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      services: '/api/services',
      clients: '/api/clients',
      appointments: '/api/appointments'
    }
  });
});

// Servir archivos estáticos DESPUÉS (para que no interfiera con la API)
app.use(express.static(path.join(__dirname, '..')));

// Ruta catch-all para SPA (sirve index.html para rutas no encontradas)
app.get('*', (req, res, next) => {
  // Si la ruta es de API y no se encontró, pasar al error handler
  if (req.path.startsWith('/api')) {
    return next();
  }
  // Para otras rutas, intentar servir el archivo estático (ya manejado arriba)
  // Si no existe, retornar index.html (útil para SPAs)
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ============================================
// MANEJO DE ERRORES
// ============================================

// 404 - Ruta no encontrada (solo para API)
app.use('/api/*', notFound);

// Error handler global
app.use(errorHandler);

// ============================================
// INICIAR SERVIDOR
// ============================================

const PORT = config.port;

const startServer = async () => {
  try {
    // Probar conexión a base de datos
    console.log('🔌 Probando conexión a base de datos...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ No se pudo conectar a la base de datos');
      process.exit(1);
    }

    // Auto-migración: crear tabla gift_certificates si no existe
    try {
      const { query } = await import('./config/database.js');
      await query(`
        CREATE TABLE IF NOT EXISTS gift_certificates (
          id              SERIAL PRIMARY KEY,
          uuid            UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
          buyer_name      VARCHAR(100) NOT NULL,
          buyer_phone     VARCHAR(20)  NOT NULL,
          buyer_email     VARCHAR(100),
          recipient_name  VARCHAR(100) NOT NULL,
          recipient_phone VARCHAR(20),
          services        JSONB        NOT NULL DEFAULT '[]',
          total           DECIMAL(10,2) NOT NULL,
          payment_method  VARCHAR(20)  NOT NULL DEFAULT 'efectivo'
            CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia')),
          status          VARCHAR(20)  NOT NULL DEFAULT 'active'
            CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
          redeemed_at     TIMESTAMP,
          expires_at      DATE GENERATED ALWAYS AS
                          (CAST(created_at AS DATE) + INTERVAL '6 months') STORED,
          created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          notes           TEXT
        )
      `);
      await query(`CREATE INDEX IF NOT EXISTS idx_gc_uuid   ON gift_certificates(uuid)`);
      await query(`CREATE INDEX IF NOT EXISTS idx_gc_status ON gift_certificates(status)`);
      // Agregar sender_label si la tabla ya existía sin esa columna
      await query(`
        ALTER TABLE gift_certificates ADD COLUMN IF NOT EXISTS sender_label VARCHAR(120)
      `).catch(() => {});
      console.log('✅ Tabla gift_certificates lista');

      // Asegurarse de que transactions.client_id admita NULL
      // (para ventas de mostrador y certificados de regalo sin cliente registrado)
      await query(`
        ALTER TABLE transactions ALTER COLUMN client_id DROP NOT NULL
      `).catch(() => {}); // Ignorar si ya es nullable o si falla
    } catch (migErr) {
      console.error('⚠️  Auto-migración gift_certificates falló:', migErr.message);
    }

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('');
      console.log('╔══════════════════════════════════════════════╗');
      console.log('║                                              ║');
      console.log("║     BRACO'S BARBERÍA - API BACKEND           ║");
      console.log('║                                              ║');
      console.log('╚══════════════════════════════════════════════╝');
      console.log('');
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🌍 Entorno: ${config.env}`);
      console.log(`📊 Base de datos: ${config.database.name}`);
      console.log('');
      console.log('Endpoints disponibles:');
      console.log(`  → API Health: http://localhost:${PORT}/api/health`);
      console.log(`  → Servicios: http://localhost:${PORT}/api/services`);
      console.log(`  → Clientes: http://localhost:${PORT}/api/clients`);
      console.log(`  → Citas: http://localhost:${PORT}/api/appointments`);
      console.log('');
      console.log('Presiona CTRL+C para detener el servidor');
      console.log('══════════════════════════════════════════════════');
    });

  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Iniciar Cron Job de Recordatorios
import initReminderJob from './cron/reminderJob.js';
initReminderJob();

// Iniciar Cron Job de Timeout de Depósitos (auto-cancelar después de 1 hora)
import initDepositTimeoutJob from './cron/depositTimeoutJob.js';
initDepositTimeoutJob();

// Iniciar servidor
startServer();

export default app;

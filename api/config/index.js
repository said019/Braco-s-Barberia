import dotenv from 'dotenv';

dotenv.config();

export default {
  // Servidor
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  apiUrl: process.env.API_URL || 'http://localhost:3000',

  // Base de datos
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'bracos_barberia',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-secret-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // Negocio
  business: {
    name: process.env.BUSINESS_NAME || "Braco's Barbería & Peluquería",
    phone: process.env.BUSINESS_PHONE || '5573432027',
    email: process.env.BUSINESS_EMAIL || 'info@bracosbarberia.com',
    timezone: process.env.TIMEZONE || 'America/Mexico_City',
  },

  // Agendamiento
  booking: {
    slotInterval: parseInt(process.env.SLOT_INTERVAL_MINUTES) || 30,
    advanceDays: parseInt(process.env.ADVANCE_BOOKING_DAYS) || 30,
    minBookingHours: parseInt(process.env.MIN_BOOKING_HOURS) || 2,
  },
};

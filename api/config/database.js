import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configuración del pool de conexiones
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bracos_barberia',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || undefined,
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'true' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway.net')) ? { rejectUnauthorized: false } : false
});

// Evento de conexión exitosa
pool.on('connect', () => {
  console.log('✓ Conectado a PostgreSQL');
});

// Evento de error
pool.on('error', (err) => {
  console.error('✗ Error inesperado en PostgreSQL:', err);
  process.exit(-1);
});

// Función para probar la conexión
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✓ Conexión a base de datos exitosa:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('✗ Error al conectar a la base de datos:', error.message);
    return false;
  }
};

// Función helper para queries
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Query error:', { text, error: error.message });
    throw error;
  }
};

// Función para transacciones
export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default pool;

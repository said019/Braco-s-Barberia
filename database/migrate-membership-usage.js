import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bracos_barberia',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || ''
});

async function runMigration() {
  try {
    await client.connect();
    console.log('✓ Conectado a PostgreSQL');

    // Leer el archivo SQL de migración
    const sqlFile = path.join(__dirname, 'add_membership_usage_tracking.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('\n📋 Ejecutando migración: add_membership_usage_tracking.sql');

    // Ejecutar la migración
    await client.query(sql);

    console.log('✓ Migración completada exitosamente');

    // Verificar las columnas agregadas
    const checkQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'membership_usage'
      AND column_name IN ('service_value', 'stamps_used', 'notes')
      ORDER BY column_name;
    `;

    const result = await client.query(checkQuery);
    console.log('\n✓ Columnas agregadas a membership_usage:');
    console.table(result.rows);

    // Verificar índices creados
    const indexQuery = `
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'membership_usage'
      AND indexname LIKE 'idx_membership_usage%';
    `;

    const indexResult = await client.query(indexQuery);
    console.log('\n✓ Índices creados:');
    console.table(indexResult.rows);

  } catch (error) {
    console.error('✗ Error durante la migración:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Conexión cerrada');
  }
}

runMigration();

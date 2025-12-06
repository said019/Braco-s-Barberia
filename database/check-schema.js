import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bracos_barberia',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || ''
});

async function checkSchema() {
  try {
    await client.connect();
    console.log('✓ Conectado a PostgreSQL\n');

    // Ver el esquema de la tabla clients
    const schemaQuery = await client.query(`
      SELECT
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clients'
      ORDER BY ordinal_position
    `);

    console.log('Esquema de la tabla clients:');
    console.table(schemaQuery.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkSchema();

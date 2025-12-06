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

async function fixClientsDefaults() {
  try {
    await client.connect();
    console.log('✓ Conectado a PostgreSQL\n');

    console.log('Aplicando valores DEFAULT a la tabla clients...\n');

    // Agregar valores DEFAULT
    await client.query(`
      ALTER TABLE clients
        ALTER COLUMN client_type_id SET DEFAULT 1,
        ALTER COLUMN total_visits SET DEFAULT 0,
        ALTER COLUMN total_spent SET DEFAULT 0,
        ALTER COLUMN is_active SET DEFAULT TRUE,
        ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
        ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✓ Valores DEFAULT agregados');

    // Actualizar registros existentes con valores NULL
    console.log('\nActualizando registros existentes con valores NULL...');

    const updateResult = await client.query(`
      UPDATE clients
      SET
        client_type_id = COALESCE(client_type_id, 1),
        total_visits = COALESCE(total_visits, 0),
        total_spent = COALESCE(total_spent, 0),
        is_active = COALESCE(is_active, TRUE),
        created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
        updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
      WHERE
        client_type_id IS NULL OR
        total_visits IS NULL OR
        total_spent IS NULL OR
        is_active IS NULL OR
        created_at IS NULL OR
        updated_at IS NULL;
    `);

    console.log(`✓ ${updateResult.rowCount} registros actualizados\n`);

    // Verificar el esquema actualizado
    const schemaQuery = await client.query(`
      SELECT
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'clients'
        AND column_name IN ('client_type_id', 'total_visits', 'total_spent', 'is_active', 'created_at', 'updated_at')
      ORDER BY ordinal_position
    `);

    console.log('Esquema actualizado:');
    console.table(schemaQuery.rows);

    // Verificar clientes
    const clientsQuery = await client.query(`
      SELECT id, name, phone, client_type_id, created_at
      FROM clients
      ORDER BY id DESC
      LIMIT 5
    `);

    console.log('\nClientes verificados:');
    console.table(clientsQuery.rows);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixClientsDefaults();

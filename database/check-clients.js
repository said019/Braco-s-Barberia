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

async function checkClients() {
  try {
    await client.connect();
    console.log('✓ Conectado a PostgreSQL\n');

    // Ver últimos clientes creados
    const lastClients = await client.query(`
      SELECT id, name, phone, client_type_id, created_at
      FROM clients
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('Últimos 5 clientes creados:');
    console.table(lastClients.rows);

    // Intentar el JOIN que está fallando
    const joinQuery = await client.query(`
      SELECT
        c.*,
        ct.name as client_type_name,
        ct.color as client_type_color
      FROM clients c
      JOIN client_types ct ON c.client_type_id = ct.id
      ORDER BY c.created_at DESC
      LIMIT 5
    `);

    console.log('\nClientes con JOIN (como lo hace getById):');
    console.log('Filas retornadas:', joinQuery.rows.length);
    if (joinQuery.rows.length > 0) {
      console.table(joinQuery.rows.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        client_type_id: r.client_type_id,
        client_type_name: r.client_type_name
      })));
    }

    // Verificar si hay clientes con client_type_id NULL o inválido
    const invalidClients = await client.query(`
      SELECT id, name, phone, client_type_id
      FROM clients
      WHERE client_type_id IS NULL OR client_type_id NOT IN (SELECT id FROM client_types)
      ORDER BY created_at DESC
    `);

    console.log('\nClientes con client_type_id inválido:');
    console.log('Filas encontradas:', invalidClients.rows.length);
    if (invalidClients.rows.length > 0) {
      console.table(invalidClients.rows);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkClients();

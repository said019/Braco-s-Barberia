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

async function initClientTypes() {
  try {
    await client.connect();
    console.log('✓ Conectado a PostgreSQL');

    // Verificar si existen datos en client_types
    const checkQuery = 'SELECT COUNT(*) FROM client_types';
    const checkResult = await client.query(checkQuery);
    const count = parseInt(checkResult.rows[0].count);

    console.log(`\nTipos de cliente existentes: ${count}`);

    if (count === 0) {
      console.log('\nInsertando tipos de cliente predeterminados...');

      const insertQuery = `
        INSERT INTO client_types (name, display_name, color, description, priority) VALUES
        ('normal', 'Cliente', '#C4A35A', 'Cliente regular', 0),
        ('premium', 'Premium', '#D4B76A', 'Cliente con membresía Premium', 1),
        ('vip', 'VIP', '#1A1A1A', 'Cliente VIP con beneficios exclusivos', 2)
      `;

      await client.query(insertQuery);
      console.log('✓ Tipos de cliente insertados correctamente');
    } else {
      console.log('✓ Tipos de cliente ya existen');
    }

    // Mostrar tipos de cliente actuales
    const selectQuery = 'SELECT * FROM client_types ORDER BY id';
    const result = await client.query(selectQuery);

    console.log('\nTipos de cliente en la base de datos:');
    console.table(result.rows);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initClientTypes();

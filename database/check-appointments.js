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

async function checkAppointments() {
  try {
    await client.connect();
    console.log('✓ Conectado a PostgreSQL\n');

    // Ver las citas más recientes
    const appointments = await client.query(`
      SELECT
        a.id,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.status,
        c.name as client_name,
        c.phone,
        s.name as service_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN services s ON a.service_id = s.id
      ORDER BY a.created_at DESC
      LIMIT 10
    `);

    console.log('Últimas 10 citas creadas:');
    console.table(appointments.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkAppointments();

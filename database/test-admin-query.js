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

async function testAdminQuery() {
  try {
    await client.connect();
    console.log('✓ Conectado a PostgreSQL\n');

    // Esta es la misma query que usa el endpoint /api/admin/appointments
    const start_date = '2025-12-01';
    const end_date = '2025-12-31';

    const query = `
      SELECT a.*, c.name as client_name, c.phone as client_phone,
             ct.color as client_color, s.name as service_name, s.price as service_price,
             s.duration_minutes as duration
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN client_types ct ON c.client_type_id = ct.id
      JOIN services s ON a.service_id = s.id
      WHERE a.appointment_date >= $1 AND a.appointment_date <= $2
      ORDER BY a.appointment_date DESC, a.start_time
    `;

    const result = await client.query(query, [start_date, end_date]);

    console.log(`Citas encontradas en diciembre 2025: ${result.rows.length}\n`);

    if (result.rows.length > 0) {
      console.log('Datos de las citas:');
      result.rows.forEach(apt => {
        console.log(`\nCita ID ${apt.id}:`);
        console.log(`  Fecha: ${apt.appointment_date.toISOString().split('T')[0]}`);
        console.log(`  Hora: ${apt.start_time} - ${apt.end_time}`);
        console.log(`  Cliente: ${apt.client_name} (${apt.client_phone})`);
        console.log(`  Servicio: ${apt.service_name}`);
        console.log(`  Estado: ${apt.status}`);
        console.log(`  Duración: ${apt.duration} min`);
      });
    } else {
      console.log('No se encontraron citas en el rango especificado');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testAdminQuery();

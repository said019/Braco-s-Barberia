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

async function fixAppointmentsStatus() {
  try {
    await client.connect();
    console.log('✓ Conectado a PostgreSQL\n');

    console.log('Verificando esquema de appointments...');

    // Ver el esquema actual del campo status
    const schemaQuery = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'appointments' AND column_name = 'status'
    `);

    console.log('Esquema actual del campo status:');
    console.table(schemaQuery.rows);

    // Agregar valor DEFAULT si no existe
    console.log('\nAplicando valor DEFAULT al campo status...');
    await client.query(`
      ALTER TABLE appointments
        ALTER COLUMN status SET DEFAULT 'scheduled';
    `);
    console.log('✓ Valor DEFAULT agregado\n');

    // Actualizar registros con status NULL
    console.log('Actualizando citas con status NULL...');
    const updateResult = await client.query(`
      UPDATE appointments
      SET status = 'scheduled'
      WHERE status IS NULL;
    `);

    console.log(`✓ ${updateResult.rowCount} cita(s) actualizada(s)\n`);

    // Verificar las citas actualizadas
    const appointments = await client.query(`
      SELECT
        a.id,
        a.appointment_date,
        a.start_time,
        a.status,
        c.name as client_name,
        s.name as service_name
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN services s ON a.service_id = s.id
      ORDER BY a.created_at DESC
      LIMIT 5
    `);

    console.log('Citas después de la actualización:');
    console.table(appointments.rows);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixAppointmentsStatus();

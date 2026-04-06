import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:XrfamiSPgPmgyUnErogzZwuPNgDdwxyy@hopper.proxy.rlwy.net:21719/railway',
  ssl: { rejectUnauthorized: false }
});

const r = await pool.query(`
  SELECT a.id, a.appointment_date, a.start_time, a.end_time, a.status,
         c.name as client_name, c.client_type_id,
         ct.id as ctype_id, ct.name as client_type, ct.color as client_color,
         s.name as service_name
  FROM appointments a
  JOIN clients c ON a.client_id = c.id
  JOIN client_types ct ON c.client_type_id = ct.id
  JOIN services s ON a.service_id = s.id
  WHERE a.appointment_date >= '2026-03-30' AND a.appointment_date <= '2026-04-02'
  ORDER BY a.appointment_date, a.start_time
`);

console.log('Rows:', r.rows.length);

// Group by date and show key fields in JSON
const byDate = {};
r.rows.forEach(row => {
  const dateStr = JSON.stringify(row.appointment_date).replace(/"/g,'').split('T')[0];
  if (!byDate[dateStr]) byDate[dateStr] = [];
  byDate[dateStr].push({
    id: row.id,
    status: row.status,
    start_time: row.start_time,
    end_time: row.end_time,
    client_name: row.client_name,
    client_color: row.client_color,
    service_name: row.service_name,
    appointment_date_raw: JSON.stringify(row.appointment_date)
  });
});

Object.keys(byDate).sort().forEach(date => {
  console.log(`\n=== ${date} (${byDate[date].length} appointments) ===`);
  byDate[date].forEach(a => {
    console.log(`  ID: ${a.id} | ${a.start_time} | status: ${a.status} | client_color: ${a.client_color} | date_raw: ${a.appointment_date_raw}`);
  });
});

await pool.end();

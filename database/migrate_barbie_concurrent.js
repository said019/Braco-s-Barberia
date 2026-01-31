require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');

async function runMigration() {
    const config = process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
        : {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        };

    const client = new Client(config);

    try {
        await client.connect();
        console.log('🔗 Conectado a la base de datos');
        
        const sql = fs.readFileSync(__dirname + '/add_barbie_concurrent_services.sql', 'utf8');
        await client.query(sql);
        
        // Verificar los cambios
        const result = await client.query(`
            SELECT id, name, allow_concurrent, is_barber_service 
            FROM services 
            WHERE is_active = TRUE
            ORDER BY category_id, display_order
        `);
        
        console.log('\n✅ Migración exitosa - Servicios actualizados:\n');
        console.log('ID | Nombre | Concurrente | Barbero');
        console.log('---|--------|-------------|--------');
        result.rows.forEach(row => {
            console.log(`${row.id} | ${row.name} | ${row.allow_concurrent ? 'SÍ' : 'NO'} | ${row.is_barber_service ? 'SÍ' : 'NO'}`);
        });
        
        console.log('\n📋 Servicios de Barbie (pueden reservarse aunque haya cita de corte):');
        const barbieServices = result.rows.filter(r => r.allow_concurrent);
        barbieServices.forEach(s => console.log(`   - ${s.name}`));
        
        await client.end();
    } catch (error) {
        console.error('❌ Migración fallida:', error.message);
        process.exit(1);
    }
}

runMigration();

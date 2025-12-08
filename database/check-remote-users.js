import pg from 'pg';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (str) => new Promise(resolve => rl.question(str, resolve));

async function checkRemoteUsers() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║     INSPECCIONAR USUARIOS REMOTOS            ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    const connectionString = await question('Pega tu RAILWAY DATABASE_PUBLIC_URL aquí: ');

    if (!connectionString.trim()) {
        console.error('❌ URL requerida');
        process.exit(1);
    }

    const pool = new pg.Pool({
        connectionString: connectionString.trim(),
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();

        console.log('🔍 Buscando usuarios en la tabla admin_users...');
        const result = await client.query(`
            SELECT id, username, name, role, is_active, last_login, created_at 
            FROM admin_users
        `);

        if (result.rows.length === 0) {
            console.log('❌ NO se encontraron usuarios en la tabla admin_users.');
        } else {
            console.log('✅ Usuarios encontrados:');
            console.table(result.rows);
        }

        client.release();
    } catch (err) {
        console.error('❌ Error al conectar o consultar:', err.message);
        if (err.message.includes('relation "admin_users" does not exist')) {
            console.error('   -> ESTO CONFIRMA QUE LA TABLA NO EXISTE. La migración falló o no se hizo en esta BD.');
        }
    } finally {
        await pool.end();
        rl.close();
    }
}

checkRemoteUsers();

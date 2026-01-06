import pg from 'pg';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (str) => new Promise(resolve => rl.question(str, resolve));

async function resetPassword() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║     RESTABLECER CONTRASEÑA REMOTA            ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');

    // 1. Obtener URL
    const connectionString = await question('Pega tu RAILWAY DATABASE_PUBLIC_URL aquí: ');

    if (!connectionString.trim()) {
        console.error('❌ URL requerida');
        process.exit(1);
    }

    const pool = new pg.Pool({
        connectionString: connectionString.trim(),
        ssl: { rejectUnauthorized: false } // Railway requiere SSL
    });

    try {
        const client = await pool.connect();

        // 2. Generar nuevo hash
        console.log('🔒 Generando hash para "admin123"...');
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('admin123', salt);

        // 3. Actualizar
        console.log('💾 Actualizando base de datos...');
        const result = await client.query(`
            UPDATE admin_users 
            SET password_hash = $1, is_active = true 
            WHERE username = 'admin'
            RETURNING id, username;
        `, [hash]);

        if (result.rowCount === 0) {
            console.log('⚠️  No se encontró el usuario "admin". Creándolo...');
            await client.query(`
                INSERT INTO admin_users (username, password_hash, name, role, is_active)
                VALUES ('admin', $1, 'Admin Restaurado', 'admin', true)
            `, [hash]);
            console.log('✅ Usuario "admin" creado con contraseña "admin123"');
        } else {
            console.log('✅ Contraseña actualizada a "admin123" para el usuario "admin"');
        }

        client.release();
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
        rl.close();
    }
}

resetPassword();

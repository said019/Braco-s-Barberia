import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../api/.env' });

const { Pool } = pg;

// Configuración de la base de datos
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'bracos_barberia',
    user: process.env.DB_USER || process.env.USER,
    password: process.env.DB_PASSWORD || undefined,
});

async function createAdminUser() {
    const client = await pool.connect();

    try {
        console.log('🔐 Creando usuario administrador...\n');

        // Datos del admin
        const username = 'admin';
        const password = 'admin123';
        const name = 'Miguel Trujillo';
        const role = 'admin';

        // Verificar si ya existe
        const existingUser = await client.query(
            'SELECT id, username FROM admin_users WHERE username = $1',
            [username]
        );

        if (existingUser.rows.length > 0) {
            console.log('⚠️  El usuario "admin" ya existe en la base de datos.');
            console.log('   Para recrearlo, primero elimínalo con:');
            console.log('   psql -d bracos_barberia -c "DELETE FROM admin_users WHERE username = \'admin\';"');
            console.log('');
            return;
        }

        // Hash de la contraseña
        console.log('🔒 Hasheando contraseña...');
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insertar usuario
        console.log('💾 Insertando usuario en la base de datos...');
        const result = await client.query(`
      INSERT INTO admin_users (username, password_hash, name, role, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, name, role
    `, [username, passwordHash, name, role, true]);

        const newUser = result.rows[0];

        console.log('');
        console.log('✅ Usuario administrador creado exitosamente!');
        console.log('');
        console.log('╔══════════════════════════════════════════════╗');
        console.log('║         CREDENCIALES DE ADMINISTRADOR        ║');
        console.log('╚══════════════════════════════════════════════╝');
        console.log('');
        console.log(`  ID:       ${newUser.id}`);
        console.log(`  Usuario:  ${newUser.username}`);
        console.log(`  Nombre:   ${newUser.name}`);
        console.log(`  Rol:      ${newUser.role}`);
        console.log('');
        console.log('  🔑 Contraseña: admin123');
        console.log('');
        console.log('══════════════════════════════════════════════════');
        console.log('');
        console.log('⚠️  IMPORTANTE: Cambia esta contraseña en producción');
        console.log('');

    } catch (error) {
        console.error('❌ Error al crear usuario administrador:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar
createAdminUser()
    .then(() => {
        console.log('✓ Proceso completado');
        process.exit(0);
    })
    .catch((error) => {
        console.error('✗ Error:', error.message);
        process.exit(1);
    });

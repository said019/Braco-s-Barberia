require('dotenv').config({ path: 'api/.env' });
const { Client } = require('pg');

async function runMigration() {
    console.log('🔄 Starting schema migration...');

    // Explicitly load env vars if needed or rely on dotenv default behavior
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

        // Change description and image_url to TEXT to allow unlimited length
        // We use ALTER COLUMN TYPE TEXT to change from VARCHAR(255)
        const sql = `
            ALTER TABLE services ALTER COLUMN description TYPE TEXT;
            ALTER TABLE services ALTER COLUMN image_url TYPE TEXT;
        `;

        await client.query(sql);
        console.log('✅ Migration successful: services table columns updated to TEXT type.');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();

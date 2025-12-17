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
        const sql = fs.readFileSync(__dirname + '/add_image_url_services.sql', 'utf8');
        await client.query(sql);
        console.log('✅ Migration successful - image_url column added to services table');
        await client.end();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();

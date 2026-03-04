import db from './api/config/database.js';

async function checkClient() {
    try {
        const query = `
            SELECT name, TO_CHAR(birthdate, 'YYYY-MM-DD') as birthdate 
            FROM clients 
            WHERE name ILIKE '%Victor%' OR name ILIKE '%Víctor%'
        `;
        const result = await db.query(query);
        console.table(result.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkClient();

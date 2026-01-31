
import db from './api/config/database.js';

async function checkBlockedDates() {
    try {
        console.log('Checking schema of blocked_dates...');
        const schemaResult = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'blocked_dates'
        `);
        console.log('Schema:', schemaResult.rows);

        console.log('Checking schema of blocked_time_slots...');
        const schemaResult2 = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'blocked_time_slots'
        `);
        console.log('Schema Time Slots:', schemaResult2.rows);

    } catch (err) {
        console.error('Error querying DB:', err);
    } finally {
        //db.end(); // If pool needs closing
        process.exit();
    }
}

checkBlockedDates();

import dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;
const host = process.env.DB_HOST;

console.log('--- DB CONFIG CHECK ---');
if (url) {
    console.log('DATABASE_URL is set.');
    if (url.includes('railway')) {
        console.log('Status: DETECTED RAILWAY URL');
    } else {
        console.log('Status: DETECTED OTHER URL');
    }
} else {
    console.log('DATABASE_URL is NOT set.');
    if (host) {
        console.log(`DB_HOST is set to: ${host}`);
    } else {
        console.log('DB_HOST is NOT set.');
    }
}

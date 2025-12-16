// test_email_simple.js
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MOCK ENV VARS (normally from process.env)
// PLEASE REPLACE WITH REAL KEY IF RUNNING LOCALLY OR ENSURE ENV IS LOADED
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'; // Default testing domain

console.log('Testing Email Sending...');
console.log('API KEY Present:', !!RESEND_API_KEY);
console.log('FROM:', FROM_EMAIL);

if (!RESEND_API_KEY) {
    console.error('ERROR: Missing RESEND_API_KEY');
    process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

async function run() {
    try {
        // 1. Try sending simple text email
        console.log('Sending simple text email...');
        const data = await resend.emails.send({
            from: FROM_EMAIL,
            to: 'saidromero19@gmail.com', // User's email from tests
            subject: 'Test Email from Script',
            html: '<p>This is a test email to verify credentials.</p>'
        });
        console.log('Simple email result:', data);

        // 2. Try loading a template
        console.log('Testing template loading...');
        const templatePath = path.join(__dirname, 'api/templates/emails/checkout-receipt.html');
        console.log('Looking for template at:', templatePath);

        if (fs.existsSync(templatePath)) {
            console.log('✅ Template file found!');
        } else {
            console.error('❌ Template file NOT found at expected path!');
            // Print cwd content to debug
            console.log('CWD:', process.cwd());
            console.log('Root files:', fs.readdirSync(process.cwd()));
        }

    } catch (err) {
        console.error('FATAL ERROR:', err);
    }
}

run();

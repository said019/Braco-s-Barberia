import fetch from 'node-fetch';

const API_URL = 'https://braco-s-barberia-production.up.railway.app/api';
let adminToken = '';
let client = null;

// User: Test Email Debug
const USER = {
    name: 'Email Debugger',
    phone: '4445556666',
    email: 'saidromero19@gmail.com' // Usamos el correo real de Said para ver si llega
};

async function loginAdmin() {
    const res = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const data = await res.json();
    adminToken = data.token;
    return !!adminToken;
}

async function run() {
    console.log('--- START EMAIL CHECKOUT TEST ---');
    if (!await loginAdmin()) return console.log('Login failed');

    // 1. Create client
    const cRes = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(USER)
    });
    const cJson = await cRes.json();
    client = cJson.data || (await (await fetch(`${API_URL}/clients/phone/${USER.phone}`)).json()).data;
    console.log(`Client ID: ${client.id}`);

    // 2. Find Available Slot
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 20); // Look up to 20 days ahead

    const slotsRes = await fetch(`${API_URL}/appointments/available-slots?date=${today.toISOString().split('T')[0]}&service_id=1`);
    // Note: getAvailableSlots might return slots for specific date or need date param. 
    // Usually it returns for the requested date. I'll loop a few days.

    let apptDate = '';
    let apptTime = '';

    for (let i = 1; i < 10; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dayStr = d.toISOString().split('T')[0];

        const r = await fetch(`${API_URL}/appointments/available-slots?date=${dayStr}&service_id=1`);
        const json = await r.json();

        if (json.success && json.data && json.data.length > 0) {
            apptDate = dayStr;
            apptTime = json.data[0]; // First slot
            console.log(`Found slot: ${apptDate} at ${apptTime}`);
            break;
        }
    }

    if (!apptDate) return console.log('No slots found in next 10 days');

    const bRes = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: client.id,
            service_id: 1, // Corte
            appointment_date: apptDate,
            start_time: apptTime
        })
    });
    const booking = await bRes.json();
    if (!booking.success) return console.log('Booking failed', booking);
    const apptId = booking.data.id;
    console.log(`Appointment ID: ${apptId}`);

    // 3. Checkout (Trigger Email)
    console.log('Processing Checkout to trigger email...');
    const payRes = await fetch(`${API_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            appointment_id: apptId,
            client_id: client.id,
            service_cost: 100,
            products_cost: 0,
            total: 100, // Total > 0 just in case
            payment_method: 'cash',
            use_membership: false
        })
    });
    const payJson = await payRes.json();

    console.log('\n>>> CHECKOUT RESPONSE <<<');
    console.log(JSON.stringify(payJson, null, 2));

    if (payJson.email_status) {
        if (payJson.email_status.success) console.log('✅ Email service reporte SUCCESS');
        else console.log('❌ Email service reporte ERROR:', payJson.email_status.error || payJson.email_status.message);
    } else {
        console.log('❓ No email status in response');
    }
}

run();

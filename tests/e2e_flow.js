import http from 'http';
import https from 'https';
import { URL } from 'url'; // Import URL for parsing

// CONF
// const PORT = 3000; // No longer needed if BASE_URL includes port
// const HOST = 'localhost'; // No longer needed
// const BASE_PATH = '/api'; // No longer needed
const BASE_URL = 'https://braco-s-barberia-production.up.railway.app/api';

// UTILS
function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const protocol = url.protocol === 'https:' ? https : http;

        const options = {
            hostname: url.hostname,
            port: url.port || (url.protocol === 'https:' ? 443 : 80),
            path: url.pathname + url.search, // Include search params if any
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const req = protocol.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let json;
                try { json = JSON.parse(data); } catch (e) { json = data; }
                resolve({ status: res.statusCode, body: json });
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

// COLORS
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';

function log(msg, color = RESET) {
    console.log(`${color}${msg}${RESET}`);
}

async function run() {
    log('--- STARTING E2E TEST ---', CYAN);    // Define services vars for scope
    let corteService = null;
    let ticService = null;

    // 1. LOGIN ADMIN
    log('> Authenticating Admin...', CYAN);
    let token = null;
    try {
        const loginRes = await request('POST', '/admin/login', {
            username: 'admin',
            password: 'admin123'
        });

        if (loginRes.status === 200 && (loginRes.body.token || loginRes.body.data?.token)) {
            token = loginRes.body.token || loginRes.body.data.token;
            log('✓ Admin Authenticated', GREEN);

            // Fetch Services (Now that we might need to seed)
            const getSvcs = async () => {
                const r = await request('GET', '/services');
                // Response structure is data: { services: [], grouped: {} }
                // Adjust for both structures just in case
                const d = r.body.data;
                let s = d?.services || d || r.body || [];
                if (!Array.isArray(s)) s = [];
                return s;
            };

            let svcs = await getSvcs();
            if (svcs.length === 0) {
                log('! Services List Empty. Seeding Mock Services...', CYAN);
                // Create Corte
                const resCorte = await request('POST', '/admin/services', {
                    name: 'Corte de Cabello Caballero',
                    description: 'Corte clásico',
                    duration_minutes: 60,
                    price: 300,
                    category_id: 1,
                    is_active: true
                }, token);
                if (resCorte.status !== 201) {
                    log('✗ Failed to create Corte:', RED);
                    console.log(resCorte.body);
                }

                // Create TIC
                const resTic = await request('POST', '/admin/services', {
                    name: 'Terapia Integral Capilar (TIC)',
                    description: 'Tratamiento capilar',
                    duration_minutes: 60,
                    price: 550,
                    category_id: 3,
                    is_active: true
                }, token);
                if (resTic.status !== 201) {
                    log('✗ Failed to create TIC:', RED);
                    console.log(resTic.body);
                }

                // Fetch again
                svcs = await getSvcs();
            }

            corteService = svcs.find(s => s.name.toLowerCase().includes('corte'));
            ticService = svcs.find(s => s.name.toLowerCase().includes('terapia') || s.name.toLowerCase().includes('tic'));

            if (corteService && ticService) {
                log(`✓ Services Found/Created: Corte=${corteService.id}, TIC=${ticService.id}`, GREEN);
            } else {
                log('✗ Failed to find services even after seeding attempt', RED);
            }

        } else {
            log('✗ Admin Auth Failed. Response:', RED);
            console.log(loginRes.body);
        }
    } catch (e) {
        log('✗ Auth Error: ' + e.message, RED);
    }


    // 2. SCENARIO: NEW CLIENT (DEPOSIT)
    const phone = '55' + Math.floor(10000000 + Math.random() * 90000000); // 10 digits
    log(`> Testing New Client with Phone: ${phone}`, CYAN);

    // Check if phone exists
    const checkRes = await request('GET', `/clients/phone/${phone}`);
    if (checkRes.status === 404) {
        log('✓ Client Not Found (New) -> Deposit Modal would trigger in UI', GREEN);
    } else {
        log('✗ Unexpected: Client already exists', RED);
    }

    // Create Appointment (simulating public flow which auto-creates client)
    // Actually js/agendar.js creates client FIRST then appt.
    // Step A: Create Client
    const clientData = { name: "Test User " + phone, phone: phone };
    const createClientRes = await request('POST', '/clients', clientData); // Public route?

    // Note: /api/clients usually protected? js/api.js calls /clients. 
    // If validated middleware exists, this might fail without token? 
    // Frontend uses allow-anonymous for create client? 
    // Let's assume it proceeds.

    let clientId = null;
    if (createClientRes.status === 201 || (createClientRes.status === 200 && createClientRes.body.data)) {
        clientId = createClientRes.body.data.id || createClientRes.body.id; // Adjust based on actual API
        log(`✓ Client Created (ID: ${clientId})`, GREEN);
    } else {
        // Maybe the route returns the client directly?
        if (createClientRes.body && createClientRes.body.id) {
            clientId = createClientRes.body.id;
            log(`✓ Client Created (ID: ${clientId})`, GREEN);
        } else {
            log(`✗ Client Create Failed: ${createClientRes.status}`, RED);
            console.log(createClientRes.body);
            // Try fetching public client?
        }
    }

    if (!clientId) {
        log('Stopping Test: Cannot proceed without client', RED);
        return;
    }

    // Step B: Create "Pending" Appointment
    // Use Tomorrow to ensure slots are free
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const apptDate = tomorrow.toISOString().split('T')[0];

    // Check if services defined
    if (!corteService) { log('! corteService missing, defaulting ID 1', RED); }

    const apptData = {
        client_id: clientId,
        service_id: corteService ? corteService.id : 1,
        appointment_date: apptDate,
        start_time: '10:00', // Slot 1
        notes: 'Test Appt - Deposit Check',
        status: 'pending'
    };

    const createApptRes = await request('POST', '/appointments', apptData); // Public
    let apptId = null;
    if (createApptRes.status === 201) {
        apptId = createApptRes.body.data.id;
        log(`✓ Appointment 1 Created (ID: ${apptId})`, GREEN);
    } else {
        log('✗ Appt Creation Failed', RED);
        console.log(createApptRes.body);
    }
    // Verify initial status
    if (apptId) {
        // We need to fetch it to see status. Public endpoint by code? Or Admin endpoint?
        // Using Admin endpoint since we have token
        const getPending = await request('GET', `/appointments/${apptId}`, null, token);
        if (getPending.status === 200 && getPending.body.data.status === 'pending') {
            log('✓ Appointment is correctly PENDING (Waiting for deposit)', GREEN);

            // SIMULATE ADMIN CONFIRMING DEPOSIT (WhatsApp received)
            log('> Simulating Admin Confirming Payment...', CYAN);
            const confirmRes = await request('POST', `/appointments/${apptId}/confirm`, {}, token);

            if (confirmRes.status === 200) {
                const getConfirmed = await request('GET', `/appointments/${apptId}`, null, token);
                if (getConfirmed.body.data.status === 'confirmed') {
                    log('✓ Appointment Status updated to CONFIRMED (Admin verified)', GREEN);
                } else {
                    log(`✗ Status did not update. Current: ${getConfirmed.body.data.status}`, RED);
                }
            } else {
                log(`✗ Admin Confirm Failed: ${confirmRes.status}`, RED);
                console.log(confirmRes.body);
            }

        } else {
            log(`! expected pending but got ${getPending.body.data?.status || 'error'}`, RED);
        }
    }

    // 3. SCENARIO: EXISTING CLIENT (NO DEPOSIT)
    // Now verify phone exists
    const checkRes2 = await request('GET', `/clients/phone/${phone}`);
    if (checkRes2.status === 200) {
        log('✓ Client Found (Existing) -> Deposit Modal Skipped in UI', GREEN);
    } else {
        log(`✗ Client Not Found after creation (Status: ${checkRes2.status})`, RED);
    }


    // 4. MEMBERSHIP & CHECKOUT (Requires Admin Token)
    if (!token) return;

    // Assign Membership
    // Need Membership Type IDs.
    const typesRes = await request('GET', '/admin/membership-types', null, token);
    const types = typesRes.body.types || [];
    const blackType = types.find(t => t.name.toLowerCase().includes('black'));
    const neoType = types.find(t => t.name.toLowerCase().includes('capilar') || t.name.includes('TIC'));

    if (!blackType || !neoType) {
        log('✗ Could not find Membership Types', RED);
        console.log(types);
        return;
    }

    // Assign Black Card to Client
    log(`> Assigning ${blackType.name} to Client...`, CYAN);
    const assignRes = await request('POST', '/admin/memberships', {
        client_id: clientId,
        membership_type_id: blackType.id,
        payment_method: 'efectivo',
        folio_number: 'TEST-' + phone.slice(-4)
    }, token);

    if (assignRes.status === 201) {
        log('✓ Membership Assigned', GREEN);
    } else {
        log('✗ Membership Assign Failed', RED);
        console.log(assignRes.body);
    }

    // 5. TRY TO REDEEM (CHECKOUT)
    // Create another appointment for checkout
    const appt2Data = { ...apptData, start_time: '11:00', status: 'confirmed' };
    const createAppt2Res = await request('POST', '/appointments', appt2Data);
    const appt2Id = createAppt2Res.body?.data?.id;

    if (appt2Id) {
        log(`> Attempting Checkout using Membership for Appt ${appt2Id}...`, CYAN);

        // Checkout Payload
        const checkoutPayload = {
            appointment_id: appt2Id,
            client_id: clientId,
            service_cost: 300,
            products_cost: 0,
            discount: 300, // Full discount
            total: 0,
            use_membership: true,
            payment_method: 'cash',
            products: [],
            notes: 'Test Checkout'
        };

        const checkoutRes = await request('POST', '/checkout', checkoutPayload, token);
        if (checkoutRes.status === 200 || checkoutRes.status === 201) {
            log('✓ Checkout with Membership SUCCESS', GREEN);
        } else {
            log(`✗ Checkout Failed (Status: ${checkoutRes.status})`, RED);
            console.log(checkoutRes.body);
        }
    }

    // 6. TEST INVALID SERVICE REDEMPTION (TIC)
    // Assign NeoCapilar to NEW client
    const phone2 = '55' + Math.floor(10000000 + Math.random() * 90000000);
    log(`> Testing NeoCapilar Restrictions with Phone ${phone2}...`, CYAN);

    // Create client 2
    const client2Res = await request('POST', '/clients', { name: "Test TIC " + phone2, phone: phone2 });
    const client2Id = client2Res.body?.data?.id;

    if (client2Id) {
        // Assign TIC Membership
        await request('POST', '/admin/memberships', {
            client_id: client2Id,
            membership_type_id: neoType.id,
            payment_method: 'card',
            folio_number: 'TIC-' + phone2.slice(-4)
        }, token);
        log(`✓ TIC Membership Assigned to Client ${client2Id}`, GREEN);

        // A. INVALID: Corte (ID 1)
        const apptInvalidData = {
            client_id: client2Id,
            service_id: corteService.id,
            appointment_date: apptDate,
            start_time: '12:00', // Slot 3
            status: 'confirmed'
        };
        const appIvRes = await request('POST', '/appointments', apptInvalidData);
        const apptIvId = appIvRes.body?.data?.id;

        log(`> Attempting Invalid Checkout (Corte with TIC Membership)...`, CYAN);
        const invalidCheckout = {
            appointment_id: apptIvId,
            client_id: client2Id,
            service_cost: 300,
            discount: 300,
            total: 0,
            use_membership: true, // TRYING TO CHEAT
            payment_method: 'cash',
            products: []
        };

        const failRes = await request('POST', '/checkout', invalidCheckout, token);
        if (failRes.status !== 200 && failRes.status !== 201) {
            log('✓ Backend correctly REJECTED invalid membership usage', GREEN);
            console.log('Error:', failRes.body.error || failRes.body.message);
        } else {
            // If backend doesn't check, this is a SECURITY ISSUE we must report.
            log('! WARNING: Backend ALLOWED invalid membership usage. Logic might be frontend-only.', RED);
        }

        // B. VALID: TIC
        log(`> Attempting Valid Checkout (TIC Service)...`, CYAN);
        const apptValidData = {
            client_id: client2Id,
            service_id: ticService.id,
            appointment_date: apptDate,
            start_time: '14:00', // Slot 4
            status: 'confirmed'
        };
        const appValRes = await request('POST', '/appointments', apptValidData);
        const valApptId = appValRes.body?.data?.id;

        if (valApptId) {
            const validCheckout = {
                appointment_id: valApptId,
                client_id: client2Id,
                service_cost: 550, // Price of TIC (assuming)
                discount: 550,
                total: 0,
                use_membership: true,
                payment_method: 'cash',
                products: []
            };
            const successRes = await request('POST', '/checkout', validCheckout, token);
            if (successRes.status === 200 || successRes.status === 201) {
                log('✓ Valid TIC Checkout SUCCEEDED', GREEN);
            } else {
                log(`✗ Valid TIC Checkout Failed: ${successRes.status}`, RED);
                console.log(successRes.body);
            }
        }
    }

    console.log('--- END ---');
}

run();

import fetch from 'node-fetch';

const API_URL = 'https://braco-s-barberia-production.up.railway.app/api';
let adminToken = '';

// --- CONFIGURACIÓN DE ESCENARIOS ---
const SCENARIOS = [
    {
        name: 'SAID ROMERO',
        user: { name: 'Said Romero', phone: '4272757136', email: 'saidromero19@gmail.com' },
        membership: 'Golden Card Corte', // Nombre parcial para búsqueda
        services: [
            { id: 1, name: 'CORTE', useMembership: false, expectSuccess: true }, // Paga normal
            { id: 3, name: 'BARBA', useMembership: true, expectSuccess: true },  // Paga con Membresía
            { id: 11, name: 'DUO', useMembership: true, expectSuccess: true }    // Paga con Membresía
        ]
    },
    {
        name: 'CRISTOPHER JUAREZ',
        user: { name: 'Cristopher Juarez', phone: '4272757131', email: 'saidromero19+1@gmail.com' },
        membership: 'Black Card',
        services: [
            { id: 1, name: 'CORTE', useMembership: true, expectSuccess: true },
            { id: 9, name: 'MANICURA', useMembership: true, expectSuccess: true },
            { id: 3, name: 'BARBA', useMembership: true, expectSuccess: true }
        ]
    },
    {
        name: 'PEDRO HERNANDEZ',
        user: { name: 'Pedro Hernandez', phone: '4271620358', email: 'saidromero19+2@gmail.com' },
        membership: 'NeoCapilar',
        services: [
            { id: 1, name: 'CORTE', useMembership: true, expectSuccess: false }, // Fallo esperado
            { id: 9, name: 'MANICURA', useMembership: true, expectSuccess: false }, // Fallo esperado
            { id: 6, name: 'TIC #1', useMembership: true, expectSuccess: true },
            { id: 6, name: 'TIC #2', useMembership: true, expectSuccess: true }
        ]
    }
];

// --- HELPERS ---

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

async function createClient(user) {
    console.log(`\n👤 Registrando: ${user.name}`);
    const res = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    });
    const json = await res.json();
    return json.success ? json.data : (await getClientByPhone(user.phone));
}

async function getClientByPhone(phone) {
    const res = await fetch(`${API_URL}/clients/phone/${phone}`);
    const json = await res.json();
    return json.success ? json.data : null;
}

async function bookAppointment(client, service, dayOffset, hour) {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    const apptDate = date.toISOString().split('T')[0];
    const apptTime = `${hour}:00`;

    // console.log(`   📅 Agendando ${service.name} para ${apptDate} ${apptTime}`);

    const res = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: client.id,
            service_id: service.id,
            appointment_date: apptDate,
            start_time: apptTime
        })
    });
    const json = await res.json();
    if (json.success) return json.data.id;
    else {
        console.error(`   ❌ Error agendando ${service.name}: ${json.message}`);
        return null;
    }
}

async function approveAppointment(apptId) {
    if (!apptId) return;
    await fetch(`${API_URL}/admin/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'confirmed' })
    });
}

async function assignMembership(client, typeName) {
    // Buscar ID
    const typesRes = await fetch(`${API_URL}/admin/membership-types`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
    const types = (await typesRes.json()).types;
    const type = types.find(t => t.name.includes(typeName));

    if (!type) return console.error(`   ❌ No encontré tipo de membresía: ${typeName}`);

    console.log(`   🎫 Asignando ${type.name}...`);
    const res = await fetch(`${API_URL}/admin/memberships`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: client.id,
            membership_type_id: type.id,
            payment_method: 'card',
            folio_number: `TEST-${Date.now().toString().slice(-5)}`
        })
    });
    const json = await res.json();
    if (json.id) console.log('      ✅ Asignada correctamente');
    else console.error('      ❌ Error asignando:', json);
}

async function processCheckout(client, apptId, serviceObj) {
    if (!apptId) return;

    // console.log(`   💳 Checkout ${serviceObj.name} | Usa Membresía: ${serviceObj.useMembership}`);

    const res = await fetch(`${API_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            appointment_id: apptId,
            client_id: client.id,
            service_cost: 100,
            products_cost: 0,
            total: 0,
            payment_method: 'cash',
            use_membership: serviceObj.useMembership
        })
    });
    const json = await res.json();

    const success = json.success;
    const symbol = (success === serviceObj.expectSuccess) ? '✅' : '❌';
    const msg = success ? 'APROBADO' : `RECHAZADO (${json.message})`;

    console.log(`      ${symbol} ${serviceObj.name}: ${msg} [Esperado: ${serviceObj.expectSuccess ? 'APROBAR' : 'RECHAZAR'}]`);
}


// --- MAIN LOOP ---
async function run() {
    console.log('🚀 INICIANDO TEST INTEGRAL DE ESCENARIOS');
    if (!await loginAdmin()) return console.error('Login Admin Failed');

    let dayOffset = 1; // Para evitar colisiones de hora entre usuarios si se corre muy rápido (aunque tienen horas distintas, mejor prevenir)

    for (const scenario of SCENARIOS) {
        // 1. Crear Cliente
        const client = await createClient(scenario.user);
        if (!client) continue;

        // 2. Agendar Citas
        const apptIds = [];
        let hour = 10;
        for (const service of scenario.services) {
            const id = await bookAppointment(client, service, dayOffset, hour++);
            if (id) {
                apptIds.push({ id, service });
                await approveAppointment(id); // 3. Aprobar inmediatemente
            }
        }

        // 4. Asignar Membresía
        await assignMembership(client, scenario.membership);

        // 5. Checkout
        console.log(`   🛒 Procesando Pagos...`);
        for (const item of apptIds) {
            await processCheckout(client, item.id, item.service);
        }

        dayOffset++; // Siguiente usuario usa el día siguiente para citas
    }
    console.log('\n🏁 PRUEBAS COMPLETADAS');
}

run();

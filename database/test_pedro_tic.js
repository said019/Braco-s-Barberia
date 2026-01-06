import fetch from 'node-fetch';

const API_URL = 'https://braco-s-barberia-production.up.railway.app/api';
let adminToken = '';

// Datos Pedro
const PEDRO = {
    name: 'Pedro Hernandez',
    phone: '4271620358',
    email: 'saidromero19+2@gmail.com'
};

// Servicios IDs
const SERVICES = {
    CORTE: 1,
    MANICURA: 9,
    TIC: 6
};

// Membresía
const MEM_TYPE_TIC = 'NeoCapilar'; // Buscaré ID dinámicamente

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

async function getClientByPhone(phone) {
    const res = await fetch(`${API_URL}/clients/phone/${phone}`);
    const json = await res.json();
    return json.success ? json.data : null;
}

async function createClient() {
    console.log(`Registrando cliente ${PEDRO.name}...`);
    const res = await fetch(`${API_URL}/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(PEDRO)
    });
    const json = await res.json();
    if (json.success) console.log('✅ Cliente registrado');
    else console.log('⚠️ Cliente ya existe o error:', json.message);
    return await getClientByPhone(PEDRO.phone);
}

async function bookAppointment(client, serviceId, dateOffsetHour) {
    const date = new Date();
    date.setDate(date.getDate() + 2); // Pasado mañana para evitar conflictos
    date.setHours(10 + dateOffsetHour, 0, 0, 0);

    // Ajuste timezone simple (asumiendo server en UTC o local... railway suele ser UTC)
    // Enviaremos string ISO
    const apptDate = date.toISOString().split('T')[0];
    const apptTime = `${10 + dateOffsetHour}:00`;

    console.log(`Agendando Servicio ID ${serviceId} para ${apptDate} ${apptTime}...`);

    const res = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: client.id,
            service_id: serviceId,
            appointment_date: apptDate,
            start_time: apptTime
        })
    });
    const json = await res.json();
    if (json.success) {
        console.log(`✅ Cita agendada (ID: ${json.data.id})`);
        return json.data.id;
    } else {
        console.log(`❌ Error agendando: ${json.message}`);
        return null;
    }
}

async function approveAppointment(apptId) {
    if (!apptId) return;
    const res = await fetch(`${API_URL}/admin/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'confirmed' })
    });
    const json = await res.json();
    if (json.success) console.log(`✅ Cita ${apptId} APROBADA por admin`);
}

async function assignMembership(client) {
    // Buscar ID de NeoCapilar
    const typeRes = await fetch(`${API_URL}/admin/membership-types`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const typeJson = await typeRes.json();
    const ticType = typeJson.types.find(t => t.name.includes('NeoCapilar'));

    if (!ticType) {
        console.error('❌ No encontré membresía NeoCapilar');
        return;
    }

    console.log(`Asignando membresía ${ticType.name} a Pedro...`);
    const res = await fetch(`${API_URL}/admin/memberships`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_id: client.id,
            membership_type_id: ticType.id,
            payment_method: 'card',
            folio_number: `TIC-${Date.now().toString().slice(-6)}`
        })
    });
    const json = await res.json();
    if (json.id) console.log('✅ Membresía TIC asignada');
    else console.error('❌ Error asignando membresía:', json);
}

async function testCheckout(apptId, serviceName, shouldSucceed) {
    if (!apptId) return;

    // Obtener info de la cita para el costo
    const apptRes = await fetch(`${API_URL}/admin/appointments?id=${apptId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    // Este endpoint suele devolver lista, asi que no es eficiente buscar por ID especifico si no filtra
    // Mejor intento checkout directo asumiendo valores por defecto

    console.log(`\n💳 Probando Checkout para ${serviceName} (ID Cita: ${apptId}) con Membresía...`);
    const checkoutPayload = {
        appointment_id: apptId,
        client_id: (await getClientByPhone(PEDRO.phone)).id,
        service_cost: 100, // Dummy
        products_cost: 0,
        total: 0,
        payment_method: 'cash',
        use_membership: true // KEY PARAM
    };

    const res = await fetch(`${API_URL}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload)
    });
    const json = await res.json();

    if (shouldSucceed) {
        if (json.success) console.log(`✅ ÉXITO ESPERADO: Pago con membresía aceptado para ${serviceName}.`);
        else console.log(`❌ FALLO INESPERADO: Debería haber aceptado. Error: ${json.message}`);
    } else {
        if (!json.success) console.log(`✅ RECHAZO ESPERADO: Membresía no válida para ${serviceName}. Mensaje: "${json.message}"`);
        else console.log(`❌ FALLO: Aceptó membresía indebidamente para ${serviceName}.`);
    }
}

async function run() {
    console.log('--- INICIANDO TEST PEDRO HERNANDEZ (TIC) ---');

    // 1. Login Admin
    if (!await loginAdmin()) return console.log('Login admin fallido');

    // 2. Crear Cliente
    let client = await createClient();
    if (!client) return;

    // 3. Agendar Citas
    // 1 Corte
    const idCorte = await bookAppointment(client, SERVICES.CORTE, 0);
    // 1 Manicura
    const idManicura = await bookAppointment(client, SERVICES.MANICURA, 1);
    // 2 TIC
    const idTic1 = await bookAppointment(client, SERVICES.TIC, 2);
    const idTic2 = await bookAppointment(client, SERVICES.TIC, 3);

    // 4. Aprobar Citas
    await approveAppointment(idCorte);
    await approveAppointment(idManicura);
    await approveAppointment(idTic1);
    await approveAppointment(idTic2);

    // 5. Asignar Membresía TIC
    await assignMembership(client);

    // 6. Test Checkout
    // Corte -> Fail
    await testCheckout(idCorte, 'CORTE', false);
    // Manicura -> Fail
    await testCheckout(idManicura, 'MANICURA', false);
    // TIC 1 -> Success
    await testCheckout(idTic1, 'TIC #1', true);
    // TIC 2 -> Success
    await testCheckout(idTic2, 'TIC #2', true);

    console.log('\n--- FIN TEST ---');
}

run();

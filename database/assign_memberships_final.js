import fetch from 'node-fetch';

const API_URL = 'https://braco-s-barberia-production.up.railway.app/api';
let adminToken = '';

async function loginAdmin() {
    const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const data = await response.json();
    if (data.token) {
        adminToken = data.token;
        return true;
    }
    return false;
}

async function getMembershipTypeId(name) {
    const res = await fetch(`${API_URL}/admin/membership-types`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const json = await res.json();
    const type = json.types.find(t => t.name.includes(name));
    return type ? type.id : null;
}

async function assign(phone, memName) {
    const cleanPhone = phone.replace(/\D/g, '');
    let res = await fetch(`${API_URL}/clients/phone/${cleanPhone}`);
    let json = await res.json();

    if (!json.data) {
        console.log(`Cliente ${phone} no encontrado`);
        return;
    }
    const clientId = json.data.id;
    const typeId = await getMembershipTypeId(memName);

    console.log(`Asignando ${memName} a ${json.data.name}...`);
    // Folio corto corregido
    const folio = `F-${Date.now().toString().slice(-8)}-${clientId}`;

    res = await fetch(`${API_URL}/admin/memberships`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
            client_id: clientId,
            membership_type_id: typeId,
            payment_method: 'cash',
            folio_number: folio
        })
    });
    json = await res.json();
    if (json.id) console.log('✅ ÉXITO asignando membresía');
    else console.log('❌ ERROR: ' + JSON.stringify(json));
}

async function run() {
    if (!await loginAdmin()) {
        console.log('Login failed');
        return;
    }
    await assign('4272757136', 'Golden');
    await assign('4272757131', 'Black');
}

run();

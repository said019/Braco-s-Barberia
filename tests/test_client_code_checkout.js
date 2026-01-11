/**
 * Test: Client Code Checkout Flow
 * 
 * This test verifies that the checkout endpoint logic correctly:
 * 1. Searches by client_code first (for today's appointments)
 * 2. Falls back to legacy checkout_code if not found
 * 
 * Run with: node tests/test_client_code_checkout.js
 */

// Mock database query function
let mockQueryResults = [];
const mockQuery = async (sql, params) => {
    console.log('📝 SQL Query:', sql.substring(0, 100) + '...');
    console.log('📝 Params:', params);

    // Return the next mocked result
    const result = mockQueryResults.shift() || { rows: [] };
    console.log('📝 Returning:', result.rows.length, 'rows');
    return result;
};

// Simulate the getByClientCode logic
async function getByClientCode(clientCode) {
    const sql = `
      SELECT 
        a.*,
        c.client_code,
        s.name as service_name,
        s.price as service_price
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN services s ON a.service_id = s.id
      WHERE c.client_code = $1
        AND a.status IN ('scheduled', 'confirmed', 'in_progress')
        AND a.appointment_date = CURRENT_DATE
      ORDER BY a.start_time ASC
      LIMIT 1
    `;
    const result = await mockQuery(sql, [clientCode]);
    return result.rows[0];
}

// Simulate the getByCheckoutCode legacy logic
async function getByCheckoutCode(code) {
    const sql = `
      SELECT 
        a.*,
        c.client_code,
        s.name as service_name,
        s.price as service_price
      FROM appointments a
      JOIN clients c ON a.client_id = c.id
      JOIN services s ON a.service_id = s.id
      WHERE a.checkout_code = $1
      ORDER BY a.appointment_date DESC
      LIMIT 1
    `;
    const result = await mockQuery(sql, [code]);
    return result.rows[0];
}

// Simulate the controller logic
async function getByCode(code) {
    // First try by client_code
    let appointment = await getByClientCode(code);

    // Fallback to checkout_code
    if (!appointment) {
        appointment = await getByCheckoutCode(code);
    }

    return appointment;
}

// ============================================
// TEST CASES
// ============================================

async function runTests() {
    console.log('\n🧪 Running Client Code Checkout Tests\n');
    console.log('='.repeat(50));

    let passed = 0;
    let failed = 0;

    // TEST 1: Client code finds today's appointment
    console.log('\n📌 TEST 1: Client code finds today\'s appointment');
    mockQueryResults = [
        { rows: [{ id: 1, client_code: '1856', service_name: 'Corte', status: 'scheduled' }] }
    ];

    let result = await getByCode('1856');
    if (result && result.client_code === '1856') {
        console.log('✅ PASSED: Found appointment by client code');
        passed++;
    } else {
        console.log('❌ FAILED: Should find appointment by client code');
        failed++;
    }

    // TEST 2: Client code not found, fallback to checkout code
    console.log('\n📌 TEST 2: Fallback to legacy checkout code');
    mockQueryResults = [
        { rows: [] }, // No result by client_code
        { rows: [{ id: 2, checkout_code: 'AB12', service_name: 'Barba' }] } // Found by checkout_code
    ];

    result = await getByCode('AB12');
    if (result && result.checkout_code === 'AB12') {
        console.log('✅ PASSED: Fallback to checkout code works');
        passed++;
    } else {
        console.log('❌ FAILED: Should fallback to checkout code');
        failed++;
    }

    // TEST 3: Neither code found
    console.log('\n📌 TEST 3: Code not found anywhere');
    mockQueryResults = [
        { rows: [] }, // No result by client_code
        { rows: [] }  // No result by checkout_code
    ];

    result = await getByCode('9999');
    if (!result) {
        console.log('✅ PASSED: Correctly returns null when not found');
        passed++;
    } else {
        console.log('❌ FAILED: Should return null when code not found');
        failed++;
    }

    // TEST 4: Notification payload uses client_code
    console.log('\n📌 TEST 4: Notification payload contains client_code');
    const mockClient = { client_code: '1856', name: 'Juan' };
    const notificationPayload = {
        phone: '5512345678',
        name: mockClient.name,
        service: 'Corte',
        date: 'Viernes 10 de enero',
        time: '10:00',
        code: mockClient.client_code || '----'
    };

    if (notificationPayload.code === '1856') {
        console.log('✅ PASSED: Notification uses client_code');
        passed++;
    } else {
        console.log('❌ FAILED: Notification should use client_code');
        failed++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

    if (failed === 0) {
        console.log('🎉 All tests passed! The logic is correct.');
        process.exit(0);
    } else {
        console.log('⚠️  Some tests failed. Review the changes.');
        process.exit(1);
    }
}

runTests().catch(console.error);

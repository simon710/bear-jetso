const API_URL = 'https://api.bigfootws.com';
const userId = 'UskslVzzSmMQVikSyanbLHKrZ0m1';

async function testOne(label, url, options = {}) {
    console.log(`--- ${label} ---`);
    try {
        const res = await fetch(url, options);
        console.log('Status:', res.status);
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function runTests() {
    await testOne('GET /merchants?userId=', `${API_URL}/merchants?userId=${userId}`);
    await testOne('GET /community?userId=', `${API_URL}/community?userId=${userId}`);
    await testOne('POST /profile', `${API_URL}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId })
    });

    // Case: Unauthenticated community
    await testOne('GET /community (No User)', `${API_URL}/community?limit=10`);
}

runTests();

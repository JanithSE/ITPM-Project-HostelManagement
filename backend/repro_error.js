

async function testLogin() {
  const url = 'http://localhost:5001/api/auth/student-login';
  const body = JSON.stringify({ email: 'akasq78@gmail.com', password: 'password123' });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
    const status = res.status;
    const data = await res.json();
    console.log(`Status: ${status}`);
    console.log('Body:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testLogin();

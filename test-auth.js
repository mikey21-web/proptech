const fetch = require('node-fetch');

async function testAuth() {
  try {
    console.log('Testing NextAuth login...');

    const response = await fetch('http://localhost:3001/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@clickprops.in',
        password: 'ClickProps@2026',
      }),
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers));

    const text = await response.text();
    console.log('Response:', text.substring(0, 200));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAuth();

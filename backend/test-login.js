const http = require('http');

const data = JSON.stringify({ identifier: 'admin', password: 'admin123' });

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/v2/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', JSON.stringify(res.headers, null, 2));
    console.log('Body:', body.substring(0, 500));
  });
});

req.on('error', (e) => {
  console.error('Request failed:', e.message);
});

req.write(data);
req.end();

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
    console.log('STATUS:', res.statusCode);
    try {
      const json = JSON.parse(body);
      console.log('SUCCESS:', json.success);
      console.log('USER:', json.data?.user?.email);
      console.log('ROLE:', json.data?.user?.role);
    } catch (e) {
      console.log('NOT JSON:', body.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error('FAILED:', e.message);
});

req.write(data);
req.end();

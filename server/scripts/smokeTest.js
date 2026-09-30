// Quick smoke test for Stage 1: boots the Express app on a throwaway port
// and checks the routes that do NOT need a database.
//   node scripts/smokeTest.js
//
// Uses Node's built-in http client (not global fetch) so it runs anywhere.
const http = require('http');
const app = require('../src/app');

const PORT = 4123;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      { host: '127.0.0.1', port: PORT, path, method,
        headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {} },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let json = null;
          try { json = JSON.parse(raw); } catch { /* non-JSON is fine */ }
          resolve({ status: res.statusCode, json });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const server = app.listen(PORT);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  let failures = 0;
  const check = (name, cond) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
    if (!cond) failures += 1;
  };

  try {
    let r = await request('GET', '/health');
    check('GET /health -> 200', r.status === 200 && r.json.service === 'anemiscan-api');

    r = await request('GET', '/api/nope');
    check('unknown route -> 404 JSON', r.status === 404 && r.json.success === false);

    r = await request('POST', '/api/auth/login', { role: 'wizard', identifier: 'x', password: 'y' });
    check('login bad role -> 422', r.status === 422 && r.json.error.details.length > 0);

    r = await request('GET', '/api/auth/me');
    check('GET /auth/me no token -> 401', r.status === 401 && r.json.success === false);

    r = await request('GET', '/api/admin/dashboard');
    check('GET /admin/dashboard no token -> 401', r.status === 401);

    r = await request('POST', '/api/auth/register/hospital',
      { name: 'X', district: 'Chennai', phone: '123', email: 'bad', password: 'weak' });
    check('hospital register invalid -> 422', r.status === 422);
  } catch (err) {
    console.error('smoke test crashed:', err.message);
    failures += 1;
  } finally {
    server.close();
  }

  console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main();

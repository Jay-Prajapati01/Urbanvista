import http from 'http';
import { test, strict as assert } from 'node:test';

// Simple smoke test: hit /api/health
test('health endpoint responds', async () => {
  const res = await new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 5000, path: '/api/health', method: 'GET' }, resolve);
    req.on('error', reject);
    req.end();
  });
  assert.equal(res.statusCode, 200);
});

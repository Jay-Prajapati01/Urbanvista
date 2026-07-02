const http = require('http');
const API_BASE = `http://localhost:${process.env.PORT || 5000}/api`;

function httpFetch(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(API_BASE + endpoint);
      const reqOptions = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      };

      const req = http.request(reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        });
      });

      req.on('error', (err) => reject(err));
      if (options.body) req.write(JSON.stringify(options.body));
      req.end();
    } catch (err) { reject(err); }
  });
}

(async () => {
  try {
    console.log('Logging in as default admin...');
    const login = await httpFetch('/auth/login', {
      method: 'POST',
      body: { email: 'admin@urbanvista.com', password: 'admin123' },
    });

    console.log('Login status:', login.status);
    console.log('Login body:', login.body);
    console.log('Set-Cookie header:', login.headers['set-cookie']);

    const cookies = login.headers['set-cookie'];
    if (!cookies) {
      console.error('No cookies returned; cannot call dashboard as staff.');
      process.exit(2);
    }

    const cookieHeader = Array.isArray(cookies) ? cookies.map(c => c.split(';')[0]).join('; ') : cookies.split(';')[0];

    console.log('Requesting /api/dashboard with staff cookie...');
    const dash = await httpFetch('/dashboard', { headers: { Cookie: cookieHeader } });
    console.log('Dashboard status:', dash.status);
    console.log('Dashboard body:', dash.body);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();

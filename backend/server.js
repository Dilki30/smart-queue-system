// Smart Queue & Appointment System — backend server
// Zero external dependencies: run with `node server.js`

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { sendJson } = require('./src/http-utils');
const authHandlers = require('./src/handlers/authHandlers');
const hospitalHandlers = require('./src/handlers/hospitalHandlers');
const bankHandlers = require('./src/handlers/bankHandlers');
const ticketHandlers = require('./src/handlers/ticketHandlers');

const PORT = process.env.PORT || 3000;
const FRONTEND_ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// ---- Simple router with :param support ----
const routes = [];
function route(method, pattern, handler) {
  const paramNames = [];
  const regexStr = pattern.replace(/:([A-Za-z0-9_]+)/g, (_, name) => {
    paramNames.push(name);
    return '([^/]+)';
  });
  routes.push({ method, regex: new RegExp(`^${regexStr}$`), paramNames, handler });
}

function matchRoute(method, pathname) {
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = r.regex.exec(pathname);
    if (m) {
      const params = {};
      r.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(m[i + 1]); });
      return { handler: r.handler, params };
    }
  }
  return null;
}

// 👑 ADMIN HANDLER: Fetch all tickets from the master db.json
const getAdminTickets = (req, res) => {
  try {
    // Look inside the master database file mentioned in the README
    const dbPath = path.join(__dirname, 'data', 'db.json');
    let allTickets = [];

    if (fs.existsSync(dbPath)) {
      const rawData = fs.readFileSync(dbPath, 'utf8');
      const db = JSON.parse(rawData);
      
      // Extract just the tickets array from the master database object
      allTickets = db.tickets || [];
      
      // Sort tickets so the newest ones appear at the top
      if (Array.isArray(allTickets)) {
          allTickets.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }
    }

    sendJson(res, 200, { tickets: allTickets });
  } catch (error) {
    console.error("Admin Ticket Fetch Error:", error);
    sendJson(res, 500, { error: "Could not retrieve tickets for admin." });
  }
};

// ---- API routes ----
route('POST', '/api/auth/register', authHandlers.register);
route('POST', '/api/auth/login', authHandlers.login);
route('POST', '/api/auth/logout', authHandlers.logout);
route('GET', '/api/auth/me', authHandlers.me);
route('PUT', '/api/auth/profile', authHandlers.updateProfile);

route('GET', '/api/hospitals', hospitalHandlers.listHospitals);
route('GET', '/api/hospitals/:id/doctors', hospitalHandlers.listDoctors);
route('GET', '/api/doctors/:id/availability', hospitalHandlers.doctorAvailability);
route('POST', '/api/bookings/hospital', hospitalHandlers.bookHospital);

route('GET', '/api/banks', bankHandlers.listBanks);
route('GET', '/api/banks/:id/services', bankHandlers.listServices);
route('POST', '/api/bookings/bank', bankHandlers.bookBank);

route('GET', '/api/tickets/mine', ticketHandlers.myTickets);
route('GET', '/api/tickets/:id', ticketHandlers.getTicket);
route('POST', '/api/tickets/:id/cancel', ticketHandlers.cancelTicket);

// 👑 ADMIN ROUTE
route('GET', '/api/admin/tickets', getAdminTickets);


// ---- Static file serving for the frontend ----
function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/login.html' : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(FRONTEND_ROOT, filePath);

  // Prevent path traversal outside the frontend root
  if (!fullPath.startsWith(FRONTEND_ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  // Never serve the backend source itself
  if (fullPath.startsWith(path.join(FRONTEND_ROOT, 'backend'))) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end('<h1>404 Not Found</h1><p>' + pathname + '</p>');
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (pathname.startsWith('/api/')) {
    const matched = matchRoute(req.method, pathname);
    if (!matched) return sendJson(res, 404, { error: 'API route not found: ' + req.method + ' ' + pathname });
    Promise.resolve(matched.handler(req, res, matched.params, parsed.query))
      .catch(err => {
        console.error(err);
        sendJson(res, 500, { error: 'Internal server error.' });
      });
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Smart Queue & Appointment System running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/login.html to get started`);
});
const { readDb, writeDb, newId } = require('../store');
const { sendJson, readJsonBody, getBearerToken } = require('../http-utils');
const { getUserFromToken } = require('../auth');
const { buildQueueKey, nextTokenNumber, todayStr } = require('../queue');

const BANK_OPEN_HOUR = 9;

function listBanks(req, res) {
  const db = readDb();
  sendJson(res, 200, { banks: db.banks });
}

// GET /api/banks/:id/services?search=withdraw
function listServices(req, res, params, query) {
  const db = readDb();
  const bank = db.banks.find(b => b.id === params.id);
  if (!bank) return sendJson(res, 404, { error: 'Bank not found.' });

  let services = db.bankServices.filter(s => s.bankId === bank.id);
  const search = (query.search || '').trim().toLowerCase();
  if (search) {
    services = services.filter(s => {
      const haystack = [s.name, ...(s.keywords || [])].join(' ').toLowerCase();
      return haystack.includes(search) || search.split(/\s+/).some(word => haystack.includes(word));
    });
  }

  sendJson(res, 200, { bank, services });
}

// POST /api/bookings/bank  { bankId, serviceId }
async function bookBank(req, res) {
  const token = getBearerToken(req);
  const user = getUserFromToken(token);
  if (!user) return sendJson(res, 401, { error: 'Please log in to get a queue number.' });

  let body;
  try { body = await readJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
  const { bankId, serviceId } = body;
  if (!bankId || !serviceId) {
    return sendJson(res, 400, { error: 'bankId and serviceId are required.' });
  }

  const db = readDb();
  const bank = db.banks.find(b => b.id === bankId);
  if (!bank) return sendJson(res, 404, { error: 'Bank not found.' });
  const service = db.bankServices.find(s => s.id === serviceId && s.bankId === bankId);
  if (!service) return sendJson(res, 404, { error: 'Service not found.' });

  const date = todayStr();
  const queueKey = buildQueueKey('bank', serviceId, date);
  const tokenNumber = nextTokenNumber(db, queueKey);
  const displayCode = `${(service.counter.match(/[A-Za-z0-9]+/g) || ['C']).join('').slice(-2).toUpperCase()}-${String(tokenNumber).padStart(3, '0')}`;

  const ticket = {
    id: newId('t'),
    userId: user.id,
    type: 'bank',
    bankId: bank.id,
    bankName: bank.name,
    serviceId: service.id,
    serviceName: service.name,
    counter: service.counter,
    date,
    time: null,
    queueKey,
    tokenNumber,
    displayCode,
    startHour: BANK_OPEN_HOUR,
    avgServiceMinutes: service.avgServiceMinutes,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  db.tickets.push(ticket);
  writeDb(db);

  sendJson(res, 201, { ticket });
}

module.exports = { listBanks, listServices, bookBank };

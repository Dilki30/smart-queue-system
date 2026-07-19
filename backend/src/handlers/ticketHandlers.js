const { readDb, writeDb } = require('../store');
const { sendJson, getBearerToken } = require('../http-utils');
const { getUserFromToken } = require('../auth');
const { computeNowServing, ticketStatus } = require('../queue');

function withLiveStatus(ticket, db) {
  const issuedForQueue = db.tickets.filter(t => t.queueKey === ticket.queueKey && t.status !== 'cancelled').length;
  const nowServing = computeNowServing(ticket.queueKey, ticket.date, ticket.startHour, ticket.avgServiceMinutes, issuedForQueue);
  const position = Math.max(0, ticket.tokenNumber - nowServing);
  const status = ticket.status === 'cancelled' ? 'cancelled' : ticketStatus(nowServing, ticket.tokenNumber);
  return {
    ...ticket,
    nowServing,
    position,
    estimatedWaitMinutes: position * ticket.avgServiceMinutes,
    liveStatus: status
  };
}

function requireAuth(req) {
  const token = getBearerToken(req);
  return getUserFromToken(token);
}

function getTicket(req, res, params) {
  const user = requireAuth(req);
  if (!user) return sendJson(res, 401, { error: 'Please log in.' });

  const db = readDb();
  const ticket = db.tickets.find(t => t.id === params.id);
  if (!ticket) return sendJson(res, 404, { error: 'Ticket not found.' });
  if (ticket.userId !== user.id) return sendJson(res, 403, { error: 'Not your ticket.' });

  sendJson(res, 200, { ticket: withLiveStatus(ticket, db) });
}

function myTickets(req, res) {
  const user = requireAuth(req);
  if (!user) return sendJson(res, 401, { error: 'Please log in.' });

  const db = readDb();
  const tickets = db.tickets
    .filter(t => t.userId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(t => withLiveStatus(t, db));

  sendJson(res, 200, { tickets });
}

function cancelTicket(req, res, params) {
  const user = requireAuth(req);
  if (!user) return sendJson(res, 401, { error: 'Please log in.' });

  const db = readDb();
  const ticket = db.tickets.find(t => t.id === params.id);
  if (!ticket) return sendJson(res, 404, { error: 'Ticket not found.' });
  if (ticket.userId !== user.id) return sendJson(res, 403, { error: 'Not your ticket.' });

  ticket.status = 'cancelled';
  writeDb(db);
  sendJson(res, 200, { ticket });
}

module.exports = { getTicket, myTickets, cancelTicket };

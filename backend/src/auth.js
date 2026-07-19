// Password hashing + session tokens using only Node's built-in crypto module.

const crypto = require('crypto');
const { readDb, writeDb, newId } = require('./store');

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(check), Buffer.from(hash));
}

function createSession(userId) {
  const db = readDb();
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = { userId, expiresAt: Date.now() + SESSION_TTL_MS };
  writeDb(db);
  return token;
}

function getUserFromToken(token) {
  if (!token) return null;
  const db = readDb();
  const session = db.sessions[token];
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    delete db.sessions[token];
    writeDb(db);
    return null;
  }
  const user = db.users.find(u => u.id === session.userId);
  return user || null;
}

function destroySession(token) {
  const db = readDb();
  if (db.sessions[token]) {
    delete db.sessions[token];
    writeDb(db);
  }
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, salt, ...rest } = user;
  return rest;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  getUserFromToken,
  destroySession,
  publicUser,
  newId
};

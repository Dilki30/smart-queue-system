const { readDb, writeDb, newId } = require('../store');
const { hashPassword, verifyPassword, createSession, destroySession, publicUser, getUserFromToken } = require('../auth');
const { sendJson, readJsonBody, getBearerToken } = require('../http-utils');

async function register(req, res) {
  let body;
  try { body = await readJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
  const { name, email, password, phone } = body;

  if (!name || !email || !password) {
    return sendJson(res, 400, { error: 'name, email and password are required.' });
  }
  if (password.length < 8) {
    return sendJson(res, 400, { error: 'Password must be at least 8 characters.' });
  }

  const db = readDb();
  const normalizedEmail = String(email).trim().toLowerCase();
  if (db.users.some(u => u.email === normalizedEmail)) {
    return sendJson(res, 409, { error: 'An account with this email already exists.' });
  }

  const { salt, hash } = hashPassword(password);
  const user = {
    id: newId('u'),
    name,
    email: normalizedEmail,
    phone: phone || '',
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  writeDb(db);

  const token = createSession(user.id);
  sendJson(res, 201, { token, user: publicUser(user) });
}

async function login(req, res) {
  let body;
  try { body = await readJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
  const { email, password } = body;
  if (!email || !password) {
    return sendJson(res, 400, { error: 'email and password are required.' });
  }

  const db = readDb();
  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db.users.find(u => u.email === normalizedEmail);
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    return sendJson(res, 401, { error: 'Invalid email or password.' });
  }

  const token = createSession(user.id);
  sendJson(res, 200, { token, user: publicUser(user) });
}

async function logout(req, res) {
  const token = getBearerToken(req);
  if (token) destroySession(token);
  sendJson(res, 200, { ok: true });
}

async function me(req, res) {
  const token = getBearerToken(req);
  const user = getUserFromToken(token);
  if (!user) return sendJson(res, 401, { error: 'Not authenticated.' });
  sendJson(res, 200, { user: publicUser(user) });
}

async function updateProfile(req, res) {
  const token = getBearerToken(req);
  const user = getUserFromToken(token);
  if (!user) return sendJson(res, 401, { error: 'Not authenticated.' });

  let body;
  try { body = await readJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
  const { name, phone, currentPassword, newPassword } = body;

  const db = readDb();
  const dbUser = db.users.find(u => u.id === user.id);
  if (!dbUser) return sendJson(res, 404, { error: 'User not found.' });

  if (name) dbUser.name = name;
  if (phone !== undefined) dbUser.phone = phone;

  if (newPassword) {
    if (!currentPassword || !verifyPassword(currentPassword, dbUser.salt, dbUser.passwordHash)) {
      return sendJson(res, 401, { error: 'Current password is incorrect.' });
    }
    if (newPassword.length < 8) {
      return sendJson(res, 400, { error: 'New password must be at least 8 characters.' });
    }
    const { salt, hash } = hashPassword(newPassword);
    dbUser.salt = salt;
    dbUser.passwordHash = hash;
  }

  writeDb(db);
  sendJson(res, 200, { user: publicUser(dbUser) });
}

module.exports = { register, login, logout, me, updateProfile };

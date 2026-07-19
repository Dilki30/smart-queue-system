const { readDb, writeDb, newId } = require('../store');
const { sendJson, readJsonBody, getBearerToken } = require('../http-utils');
const { getUserFromToken } = require('../auth');
const { buildQueueKey, nextTokenNumber, todayStr } = require('../queue');

const SLOT_INTERVAL_MINUTES = 30;
const SLOT_CAPACITY = 3;
const DAYS_AHEAD = 7;

function listHospitals(req, res) {
  const db = readDb();
  sendJson(res, 200, { hospitals: db.hospitals });
}

// GET /api/hospitals/:id/doctors?disease=search+term
function listDoctors(req, res, params, query) {
  const db = readDb();
  const hospital = db.hospitals.find(h => h.id === params.id);
  if (!hospital) return sendJson(res, 404, { error: 'Hospital not found.' });

  let doctors = db.doctors.filter(d => d.hospitalId === hospital.id);

  const search = (query.disease || '').trim().toLowerCase();
  if (search) {
    doctors = doctors.filter(d => {
      const haystack = [d.name, d.specialization, ...(d.diseases || [])].join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }

  sendJson(res, 200, {
    hospital,
    doctors: doctors.map(d => ({ id: d.id, name: d.name, specialization: d.specialization, diseases: d.diseases }))
  });
}

function generateDates(offDays) {
  const dates = [];
  const d = new Date();
  let count = 0;
  let i = 0;
  while (count < DAYS_AHEAD && i < 30) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    i++;
    if (!offDays.includes(day.getDay())) {
      dates.push(day.toISOString().split('T')[0]);
      count++;
    }
  }
  return dates;
}

function generateTimesForDay(startHour, endHour, date) {
  const times = [];
  const isToday = date === todayStr();
  const now = new Date();
  for (let mins = startHour * 60; mins < endHour * 60; mins += SLOT_INTERVAL_MINUTES) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (isToday) {
      const slotTime = new Date();
      slotTime.setHours(h, m, 0, 0);
      if (slotTime < now) continue; // skip past slots for today
    }
    times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return times;
}

// GET /api/doctors/:id/availability
function doctorAvailability(req, res, params) {
  const db = readDb();
  const doctor = db.doctors.find(d => d.id === params.id);
  if (!doctor) return sendJson(res, 404, { error: 'Doctor not found.' });

  const dates = generateDates(doctor.offDays || []);
  const days = dates.map(date => {
    const times = generateTimesForDay(doctor.startHour, doctor.endHour, date);
    const slots = times.map(time => {
      const booked = db.tickets.filter(t =>
        t.type === 'hospital' && t.doctorId === doctor.id && t.date === date && t.time === time && t.status !== 'cancelled'
      ).length;
      return { time, capacity: SLOT_CAPACITY, booked, remaining: Math.max(0, SLOT_CAPACITY - booked) };
    });
    return { date, slots };
  });

  sendJson(res, 200, { doctor, hospitalId: doctor.hospitalId, days });
}

// POST /api/bookings/hospital  { doctorId, date, time }
async function bookHospital(req, res) {
  const token = getBearerToken(req);
  const user = getUserFromToken(token);
  if (!user) return sendJson(res, 401, { error: 'Please log in to book an appointment.' });

  let body;
  try { body = await readJsonBody(req); } catch (e) { return sendJson(res, 400, { error: e.message }); }
  const { doctorId, date, time } = body;
  if (!doctorId || !date || !time) {
    return sendJson(res, 400, { error: 'doctorId, date and time are required.' });
  }

  const db = readDb();
  const doctor = db.doctors.find(d => d.id === doctorId);
  if (!doctor) return sendJson(res, 404, { error: 'Doctor not found.' });

  const hospital = db.hospitals.find(h => h.id === doctor.hospitalId);

  const bookedCount = db.tickets.filter(t =>
    t.type === 'hospital' && t.doctorId === doctorId && t.date === date && t.time === time && t.status !== 'cancelled'
  ).length;
  if (bookedCount >= SLOT_CAPACITY) {
    return sendJson(res, 409, { error: 'That time slot is fully booked. Please choose another slot.' });
  }

  const queueKey = buildQueueKey('hosp', doctorId, date);
  const tokenNumber = nextTokenNumber(db, queueKey);
  const displayCode = `${doctorId.toUpperCase()}-${String(tokenNumber).padStart(3, '0')}`;

  const ticket = {
    id: newId('t'),
    userId: user.id,
    type: 'hospital',
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    doctorId: doctor.id,
    doctorName: doctor.name,
    specialization: doctor.specialization,
    date,
    time,
    queueKey,
    tokenNumber,
    displayCode,
    startHour: doctor.startHour,
    avgServiceMinutes: doctor.avgServiceMinutes,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  db.tickets.push(ticket);
  writeDb(db);

  sendJson(res, 201, { ticket });
}

module.exports = { listHospitals, listDoctors, doctorAvailability, bookHospital };

// All queue/ticket-number logic lives here so booking + status endpoints
// stay in sync.

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function buildQueueKey(kind, refId, date) {
  return `${kind}:${refId}:${date}`;
}

// Next sequential ticket number for a given queue (per resource, per day).
function nextTokenNumber(db, queueKey) {
  const existing = db.tickets.filter(t => t.queueKey === queueKey && t.status !== 'cancelled');
  return existing.length + 1;
}

// Compute how many people the counter has served so far "right now",
// based on when the counter opens and how long each person takes.
function computeNowServing(queueKey, date, startHour, avgServiceMinutes, maxIssued) {
  if (maxIssued === 0) return 0;
  const today = todayStr();
  if (date > today) return 0; // future day, counter hasn't opened yet
  if (date < today) return maxIssued; // past day, assume queue fully cleared

  const openTime = new Date();
  openTime.setHours(startHour, 0, 0, 0);
  const now = new Date();
  if (now < openTime) return 0;

  const elapsedMinutes = (now - openTime) / 60000;
  const served = Math.floor(elapsedMinutes / avgServiceMinutes) + 1;
  return Math.min(served, maxIssued);
}

function ticketStatus(nowServing, tokenNumber) {
  if (nowServing >= tokenNumber) return 'completed';
  if (tokenNumber - nowServing <= 1) return 'almost';
  return 'waiting';
}

module.exports = { todayStr, buildQueueKey, nextTokenNumber, computeNowServing, ticketStatus };

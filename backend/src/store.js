// Simple file-based JSON "database". No external dependencies.
// Data is persisted to backend/data/db.json and re-read on every write
// so multiple requests always see the latest state.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function seedData() {
  return {
    users: [],
    sessions: {},
    hospitals: [
      {
        id: 'h1',
        name: 'City General Hospital',
        location: 'Colombo 07',
        image: 'https://images.unsplash.com/photo-1587351021355-a479a299d2f9?w=400'
      },
      {
        id: 'h2',
        name: 'Lakeside Medical Center',
        location: 'Colombo 03',
        image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400'
      },
      {
        id: 'h3',
        name: 'Green Valley Clinic',
        location: 'Nugegoda',
        image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400'
      }
    ],
    doctors: [
      { id: 'd1', hospitalId: 'h1', name: 'Dr. Nadeesha Perera', specialization: 'Cardiologist', diseases: ['heart', 'chest pain', 'high blood pressure', 'hypertension', 'cardiac'], startHour: 9, endHour: 12, avgServiceMinutes: 15, offDays: [0] },
      { id: 'd2', hospitalId: 'h1', name: 'Dr. Kasun Silva', specialization: 'Dermatologist', diseases: ['skin', 'acne', 'rash', 'eczema', 'allergy'], startHour: 13, endHour: 16, avgServiceMinutes: 10, offDays: [0, 6] },
      { id: 'd3', hospitalId: 'h1', name: 'Dr. Amaya Fernando', specialization: 'Pediatrician', diseases: ['child', 'children', 'fever', 'flu', 'vaccination', 'baby'], startHour: 9, endHour: 12, avgServiceMinutes: 12, offDays: [0] },
      { id: 'd4', hospitalId: 'h2', name: 'Dr. Ruwan Jayasuriya', specialization: 'Orthopedic Surgeon', diseases: ['bone', 'joint', 'fracture', 'back pain', 'knee', 'arthritis'], startHour: 9, endHour: 13, avgServiceMinutes: 20, offDays: [0] },
      { id: 'd5', hospitalId: 'h2', name: 'Dr. Ishara Wickramasinghe', specialization: 'General Physician', diseases: ['fever', 'cold', 'cough', 'general checkup', 'diabetes'], startHour: 8, endHour: 12, avgServiceMinutes: 10, offDays: [] },
      { id: 'd6', hospitalId: 'h2', name: 'Dr. Chathura Bandara', specialization: 'ENT Specialist', diseases: ['ear', 'nose', 'throat', 'sinus', 'hearing'], startHour: 14, endHour: 17, avgServiceMinutes: 15, offDays: [0, 6] },
      { id: 'd7', hospitalId: 'h3', name: 'Dr. Sanduni Rathnayake', specialization: 'Gynecologist', diseases: ['pregnancy', 'women health', 'gynecology', 'prenatal'], startHour: 9, endHour: 12, avgServiceMinutes: 20, offDays: [0] },
      { id: 'd8', hospitalId: 'h3', name: 'Dr. Malith Gunasekara', specialization: 'Dentist', diseases: ['tooth', 'teeth', 'dental', 'gum', 'toothache'], startHour: 9, endHour: 16, avgServiceMinutes: 25, offDays: [0] },
      { id: 'd9', hospitalId: 'h3', name: 'Dr. Hasini Karunaratne', specialization: 'Psychiatrist', diseases: ['mental health', 'anxiety', 'depression', 'stress', 'sleep'], startHour: 10, endHour: 13, avgServiceMinutes: 30, offDays: [0, 6] }
    ],
    banks: [
      { id: 'b1', name: 'National Trust Bank', location: 'Colombo 01' },
      { id: 'b2', name: 'Ceylon Commercial Bank', location: 'Colombo 04' },
      { id: 'b3', name: 'Island Savings Bank', location: 'Kandy Road, Kaduwela' }
    ],
    bankServices: [
      { id: 's1', bankId: 'b1', name: 'Cash Withdrawal', keywords: ['withdraw', 'withdrawal', 'cash out', 'take money'], avgServiceMinutes: 4, counter: 'Counter A' },
      { id: 's2', bankId: 'b1', name: 'Cash Deposit', keywords: ['deposit', 'put money', 'save money'], avgServiceMinutes: 4, counter: 'Counter A' },
      { id: 's3', bankId: 'b1', name: 'Card Renewal / Replacement', keywords: ['renew card', 'renewal', 'lost card', 'replace card', 'debit card', 'credit card'], avgServiceMinutes: 8, counter: 'Counter B' },
      { id: 's4', bankId: 'b1', name: 'Open New Account', keywords: ['open account', 'new account', 'account opening'], avgServiceMinutes: 15, counter: 'Counter C' },
      { id: 's5', bankId: 'b1', name: 'Loan Inquiry', keywords: ['loan', 'borrow', 'mortgage', 'credit'], avgServiceMinutes: 20, counter: 'Counter D' },
      { id: 's6', bankId: 'b2', name: 'Cash Withdrawal', keywords: ['withdraw', 'withdrawal', 'cash out'], avgServiceMinutes: 4, counter: 'Counter 1' },
      { id: 's7', bankId: 'b2', name: 'Cash Deposit', keywords: ['deposit', 'put money'], avgServiceMinutes: 4, counter: 'Counter 1' },
      { id: 's8', bankId: 'b2', name: 'Cheque Deposit / Clearance', keywords: ['cheque', 'check', 'clearance'], avgServiceMinutes: 6, counter: 'Counter 2' },
      { id: 's9', bankId: 'b2', name: 'Card Renewal / Replacement', keywords: ['renew card', 'renewal', 'lost card', 'card'], avgServiceMinutes: 8, counter: 'Counter 3' },
      { id: 's10', bankId: 'b2', name: 'Foreign Currency Exchange', keywords: ['currency', 'exchange', 'forex', 'dollar'], avgServiceMinutes: 10, counter: 'Counter 3' },
      { id: 's11', bankId: 'b3', name: 'Cash Withdrawal', keywords: ['withdraw', 'withdrawal', 'cash'], avgServiceMinutes: 5, counter: 'Counter A' },
      { id: 's12', bankId: 'b3', name: 'Cash Deposit', keywords: ['deposit'], avgServiceMinutes: 5, counter: 'Counter A' },
      { id: 's13', bankId: 'b3', name: 'Fixed Deposit Inquiry', keywords: ['fixed deposit', 'fd', 'savings plan'], avgServiceMinutes: 15, counter: 'Counter B' },
      { id: 's14', bankId: 'b3', name: 'Update Passbook', keywords: ['passbook', 'update book', 'print book'], avgServiceMinutes: 3, counter: 'Counter B' }
    ],
    tickets: [],
    queues: {}
  };
}

function ensureDb() {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(seedData(), null, 2));
  }
}

function readDb() {
  ensureDb();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDb(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function newId(prefix) {
  return prefix + '_' + crypto.randomBytes(6).toString('hex');
}

module.exports = { readDb, writeDb, newId, DB_PATH };

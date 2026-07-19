# Smart Queue & Appointment System

A queue and appointment booking system for hospitals and banks.

- **Hospitals:** pick a hospital, search for a doctor by disease/symptom, choose a date and time slot, and book.
- **Banks:** pick a bank, type what you need (withdraw, deposit, renew card, loan, ...), and instantly get a queue number.
- Every booking produces a **downloadable PDF ticket** with a queue number, and a **live queue tracker** page that shows your position and estimated wait, updating automatically.

## Quick start

```bash
cd backend
node server.js
```

Then open **http://localhost:3000/login.html**.

The backend has **zero external dependencies** (pure Node.js `http`,
`fs`, `crypto`) — no `npm install` needed, and it serves the frontend
too, so this single command runs the whole app.

See [`backend/README.md`](backend/README.md) for the full API reference
and project structure.

## Tech stack

- Frontend: HTML, Bootstrap 5, vanilla JS (fetch API), jsPDF for ticket downloads
- Backend: Node.js core modules only, JSON file storage

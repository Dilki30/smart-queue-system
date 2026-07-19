# Smart Queue & Appointment System — Backend

A small, dependency-free Node.js backend (uses only Node core modules —
`http`, `fs`, `crypto`). No `npm install` is required.

It also serves the frontend (the HTML/CSS/JS files in the project root),
so running this one server gives you the whole working app on a single
port — no CORS setup needed.

## Run it

```bash
cd backend
node server.js
```

Then open **http://localhost:3000/login.html** in your browser.

Optionally set a custom port: `PORT=8080 node server.js`

## Data storage

All data (users, hospitals, doctors, banks, services, tickets) lives in
`backend/data/db.json`. It is auto-created with seed data (3 hospitals,
9 doctors, 3 banks, 14 bank services) the first time the server starts.

Delete `backend/data/db.json` and restart the server to reset all data
back to the seed state.

## Authentication

Simple bearer-token sessions (not JWT) — `crypto.scrypt` for password
hashing, random tokens for sessions, stored server-side in `db.json`.
The frontend stores the token in `localStorage` and sends it as
`Authorization: Bearer <token>`.

## API Reference

### Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | `{ name, email, password, phone? }` | Returns `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` | Returns `{ token, user }` |
| POST | `/api/auth/logout` | — | Requires `Authorization` header |
| GET  | `/api/auth/me` | — | Requires auth |
| PUT  | `/api/auth/profile` | `{ name?, phone?, currentPassword?, newPassword? }` | Requires auth |

### Hospitals
| Method | Path | Notes |
|---|---|---|
| GET | `/api/hospitals` | List all hospitals |
| GET | `/api/hospitals/:id/doctors?disease=heart` | Doctors at a hospital, optionally filtered by disease/symptom/specialization keyword |
| GET | `/api/doctors/:id/availability` | Next 7 working days with 30-min time slots + remaining capacity |
| POST | `/api/bookings/hospital` | `{ doctorId, date, time }` — requires auth. Returns a `ticket` with a queue token |

### Banks
| Method | Path | Notes |
|---|---|---|
| GET | `/api/banks` | List all banks |
| GET | `/api/banks/:id/services?search=withdraw` | Search bank services by free-text need |
| POST | `/api/bookings/bank` | `{ bankId, serviceId }` — requires auth. Returns an instant `ticket` for today |

### Tickets / Queue
| Method | Path | Notes |
|---|---|---|
| GET | `/api/tickets/mine` | All of the current user's tickets, with live queue position |
| GET | `/api/tickets/:id` | Single ticket with live queue position |
| POST | `/api/tickets/:id/cancel` | Cancel a ticket |

Live queue position is computed on read (not stored) from how long a
counter has been "open" and its average service time per person — no
background jobs needed.

## Project structure

```
backend/
  server.js                 entry point: static file server + API router
  src/
    store.js                JSON file read/write + seed data
    auth.js                 password hashing + session tokens
    queue.js                ticket numbering + live "now serving" math
    http-utils.js            small helpers (JSON body/response)
    handlers/
      authHandlers.js
      hospitalHandlers.js
      bankHandlers.js
      ticketHandlers.js
  data/db.json               auto-created data file
```

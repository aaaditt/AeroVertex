# AeroVertex Implementation Plan — Part 1 (Sessions 1–3)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a database-driven airport simulation with an interactive SVG map, powered by MySQL with pre-computed playback.

**Architecture:** React+Vite+Tailwind on Vercel → Node.js serverless API → MySQL 8.0 on Railway. Pre-computed 1800-second timeline played back via polling.

**Tech Stack:** React, Vite, Tailwind CSS, Node.js, mysql2, Vercel serverless functions, MySQL 8.0 (InnoDB) on Railway.

---

## SESSION 1 STATUS — COMPLETE ✅

Everything in Session 1 has been built and committed. Do not re-run or re-create any of these.

### What was done

**Task 1 — Scaffold** ✅
- `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/index.css`
- Vite + React + Tailwind installed and working
- Commit: `feat: scaffold Vite + React + Tailwind`

**Task 2 — Railway MySQL connection** ✅
- `.env.local` with DB credentials
- `db/connection.js` — mysql2/promise pool
- `db/test-connection.js` — verified connected

**Task 3 — Schema (17 tables)** ✅
- `db/schema.sql` — all 17 tables in dependency order, InnoDB, correct FKs
- `db/run-schema.js` — runner script
- Commit: `feat: add 17-table schema, indexes, and DB runner scripts`

**Task 4 — Indexes** ✅
- `db/indexes.sql` — all performance indexes from blueprint Section 11
- `db/run-indexes.js` — runner

**Task 5 — Triggers** ✅
- `db/triggers.sql` — all 4 triggers (gate_buffer_check, gate_size_check, log_flight_status, release_equipment)

**Task 6 — Functions** ✅
- `db/functions.sql` — all 3 functions (fn_turnaround_sec, fn_free_gates, fn_runway_utilization)

**Task 7 — Stored Procedures** ✅
- `db/procedures.sql` — all 4 procedures (sp_propagate_delay, sp_assign_equipment, sp_generate_turnaround_summary, sp_refresh_live_map)

**Task 8 — Views** ✅
- `db/views.sql` — v_arrivals_board, v_departures_board

**Task 9 — Master Setup Script** ✅
- `db/setup-all.js` — runs schema → indexes → views → triggers → functions → procedures in order

**Task 10 — Seed Script** ✅
- `db/seed.js` — fully implemented with faker, inserts all reference data and 50-70 flights

---

## SESSION 2 STATUS — PARTIAL ✅ (hero map built, needs integration later)

Session 2 built a standalone animated hero map as a proof-of-concept. It is **not** the final database-driven map — that is built in Session 4. Do not delete what was built; it will be replaced/refactored in Session 4.

### What was built

- `src/AirportHero.jsx` — self-contained SVG airport map with:
  - 2 full-width runways (y=120 and y=580 on a 1000×700 viewBox)
  - Taxiway grid, 2 terminal buildings, 10 gates with jetbridges
  - 3 cargo bays, control tower, wind sock, construction zones
  - 4 hardcoded looping animated planes (no API, no DB)
  - Legend showing callsign / AT GATE / TAXIING status
- `src/App.jsx` — replaced Vite scaffold with header + `<AirportHero />` + footer
- `src/App.css` — dark navy airport control-room theme

### What this is NOT yet
- Not connected to the database or API
- Not reading from `live_map_cache`
- Not using the seed data's actual `map_x/map_y` coordinates
- Not using the `useSimulation` hook or `currentSimSecond` clock

**The dark theme from Session 2 is kept.** The design doc's "light grey" preference is overridden — the dark navy control-room aesthetic is a better fit for an airport operations system and is already built.

---

## SESSION 3 — API Layer

> **Prerequisite:** Session 1 complete (DB built and seeded). Session 2 is irrelevant to this session — it is frontend-only.

### Coordinate reference — frozen from seed script

These are the exact `map_x/map_y` values inserted by `db/seed.js`. The API and front-end must use these. Do not invent new coordinates.

**Runways (map_x1, map_y1 → map_x2, map_y2 on 1000×700 canvas):**
- `09L/27R`: x1=50, y1=140, x2=950, y2=140
- `09R/27L`: x1=50, y1=560, x2=950, y2=560

**Terminals (map_x, map_y — centre point):**
- Passenger Terminal A: x=500, y=200
- Cargo Terminal B: x=500, y=480

**Gates (A-wing at map_y=235, B-wing at map_y=170):**
- A1(185,235), A2(255,235), A3(325,235), A4(395,235), A5(465,235), A6(535,235), A7(605,235)
- B1(205,170), B2(295,170), B3(385,170), B4(475,170), B5(565,170), B6(655,170), B7(745,170)

**Cargo Bays (map_y=495):**
- C1(310,495), C2(390,495), C3(470,495), C4(550,495), C5(630,495), C6(710,495)

---

### Task 11 — API Layer (9 Endpoints)

**Files to create:**
- `api/_db.js` — shared mysql2 pool (reads from env vars, reused by all endpoints)
- `api/map.js`
- `api/flight/[id].js`
- `api/atc.js`
- `api/cargo.js`
- `api/airport.js`
- `api/boards.js`
- `api/assign-equipment.js`
- `api/generate-summary.js`
- `api/delay-flight.js`
- `vercel.json` — rewrites so `/api/*` routes to the functions

**Endpoint specs:**

| File | Method | SQL / Call | Returns |
|------|--------|-----------|---------|
| `map.js` | GET `?sec=N` | `SELECT * FROM live_map_cache WHERE sim_arrival_sec <= ? AND sim_departure_sec >= ?` | Array of active flights with gate_x, gate_y, bay_x, bay_y |
| `flight/[id].js` | GET | JOIN: Flight + Airline + AircraftFleet + AircraftType + Gate + ServiceLog | Full flight detail object |
| `atc.js` | GET | Flights grouped by status (Inbound/Taxiing/At_Gate/Pushback) + 20 most recent EventLog rows | ATC console data |
| `cargo.js` | GET | CargoBay LEFT JOIN Flight + CargoShipment | All bays and shipments |
| `airport.js` | GET | Terminal + Runway + `fn_free_gates(?,?)` + flight counts | Airport summary |
| `boards.js` | GET | `SELECT * FROM v_arrivals_board` + `SELECT * FROM v_departures_board` | Both boards |
| `assign-equipment.js` | POST `{flight_id, equipment_id}` | `CALL sp_assign_equipment(?, ?)` | `{ok: true}` or error |
| `generate-summary.js` | POST `{flight_id}` | `CALL sp_generate_turnaround_summary(?)` + SELECT from TurnaroundCharge | Charge breakdown |
| `delay-flight.js` | POST `{flight_id, delay_sec}` | `CALL sp_propagate_delay(?, ?)` | `{ok: true}` or error |

**`api/_db.js` pattern:**
```js
import mysql from 'mysql2/promise';
const pool = mysql.createPool({
  host:     process.env.MYSQL_HOST,
  port:     process.env.MYSQL_PORT,
  user:     process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 5,
});
export default pool;
```

**`vercel.json`:**
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ]
}
```

**Testing:** Run `npx vercel dev` and manually hit each endpoint with curl or a browser. Verify:
- `GET /api/map?sec=500` returns flights active at sim-second 500
- `GET /api/flight/1` returns the full detail join
- `GET /api/boards` returns two arrays

**Error handling on every endpoint:**
```js
try {
  // ... query
} catch (err) {
  res.status(500).json({ error: err.message });
}
```

**Commit:** `git add api/ vercel.json && git commit -m "feat: add all 9 API endpoints"`

---

*Continued in Part 2: Front-End (Sessions 4–9)*

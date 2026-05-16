# AeroVertex Implementation Plan — Part 1 (Phases 1–5)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a database-driven airport simulation with an interactive SVG map, powered by MySQL with pre-computed playback.

**Architecture:** React+Vite+Tailwind on Vercel → Node.js serverless API → MySQL 8.0 on Railway. Pre-computed 1800-second timeline played back via polling.

**Tech Stack:** React, Vite, Tailwind CSS, Node.js, mysql2, Vercel serverless functions, MySQL 8.0 (InnoDB) on Railway.

---

## Task 1: Initialize Vite + React Project

**Files:** `package.json`, `vite.config.js`, `index.html`, `src/main.jsx`, `src/App.jsx`, `src/index.css`

**Step 1:** Scaffold with `npx -y create-vite@latest ./ --template react`

**Step 2:** Install deps: `npm install && npm install -D tailwindcss @tailwindcss/vite && npm install mysql2 @faker-js/faker dotenv`

**Step 3:** Configure Tailwind in `vite.config.js` (add `tailwindcss()` plugin). Set `src/index.css` to `@import "tailwindcss";`

**Step 4:** Verify: `npm run dev` → loads at localhost:5173

**Step 5:** `git init && git add -A && git commit -m "feat: scaffold Vite + React + Tailwind"`

---

## Task 2: Set Up Railway MySQL

**Step 1:** Create Railway project at railway.app, add MySQL service, copy credentials.

**Step 2:** Create `.env.local` with `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`.

**Step 3:** Create `db/connection.js` with `mysql2/promise` pool.

**Step 4:** Create `db/test-connection.js`, run `node db/test-connection.js` → expect "Connected!"

**Step 5:** Commit: `git add db/ && git commit -m "feat: add Railway MySQL connection"`

---

## Task 3: Database Schema (17 Tables)

**File:** `db/schema.sql`

Create all tables in dependency order (drops first for re-runnability):

1. Terminal, 2. Airline, 3. AircraftType, 4. AircraftFleet, 5. Runway, 6. RunwaySlot, 7. Gate, 8. CargoBay, 9. GroundEquipment, 10. Flight (central), 11. GroundServiceAssignment, 12. ServiceLog, 13. PassengerFlowLog, 14. EventLog, 15. CargoShipment, 16. TurnaroundCharge, 17. live_map_cache

All with exact columns from blueprint Section 11. All ENGINE=InnoDB with proper FKs.

Create `db/run-schema.js` to execute. Run → expect 17 tables. Commit.

---

## Task 4: Indexes

**File:** `db/indexes.sql`

Key indexes: `Flight(gate_id)`, `Flight(status)`, `Flight(sim_arrival_sec)`, `Flight(aircraft_id)`, `RunwaySlot(runway_id, sim_slot_start_sec)`, `ServiceLog(flight_id)`, `EventLog(flight_id)`, `CargoShipment(flight_id)`, `GroundServiceAssignment(flight_id)`, `Flight(bay_id)`.

---

## Task 5: Triggers

**File:** `db/triggers.sql`

4 triggers from blueprint Section 13.1:
1. `gate_buffer_check` — BEFORE INSERT on Flight, 15-min (900 sim-sec) turnaround buffer
2. `gate_size_check` — BEFORE INSERT on Flight, aircraft size ≤ gate max
3. `log_flight_status` — AFTER UPDATE on Flight, writes to EventLog
4. `release_equipment` — AFTER UPDATE on GroundServiceAssignment, marks equipment Available

Use `DELIMITER //` syntax. Runner script strips delimiters and executes individually via mysql2.

---

## Task 6: Functions

**File:** `db/functions.sql`

3 functions from blueprint Section 13.3:
1. `fn_turnaround_sec(p_flight_id)` → INT (gate_out - gate_in)
2. `fn_free_gates(p_from, p_to)` → INT (gates not occupied in window)
3. `fn_runway_utilization(p_runway_id)` → DECIMAL (% slots used)

---

## Task 7: Stored Procedures

**File:** `db/procedures.sql`

4 procedures from blueprint Sections 13.2 + 13.4:
1. `sp_propagate_delay(p_flight_id, p_delay_sec)` — recursive delay cascade
2. `sp_assign_equipment(p_flight_id, p_equipment_id)` — row-locking with FOR UPDATE
3. `sp_generate_turnaround_summary(p_flight_id)` — billing calculation
4. `sp_refresh_live_map()` — rebuild live_map_cache

Include `SET @@max_sp_recursion_depth = 50;`

---

## Task 8: Views

**File:** `db/views.sql`

```sql
CREATE OR REPLACE VIEW v_arrivals_board AS
  SELECT flight_number, origin_airport, sim_arrival_sec, status, gate_id
  FROM Flight WHERE flight_kind = 'Arrival';

CREATE OR REPLACE VIEW v_departures_board AS
  SELECT flight_number, destination_airport, sim_departure_sec, status, gate_id
  FROM Flight WHERE flight_kind = 'Departure';
```

---

## Task 9: Master DB Setup Script

**File:** `db/setup-all.js`

Runs in order: schema.sql → indexes.sql → views.sql, then triggers/functions/procedures (splitting on `//` delimiter). Single command: `node db/setup-all.js` → all objects created.

---

## Task 10: Seed Script

**File:** `db/seed.js`

Node.js script using `@faker-js/faker` and `mysql2`:

**Static data:** 2 terminals, 6 airlines, 10 aircraft types, 30 aircraft, 2 runways with slots, 14 gates (sized 1-5), 6 cargo bays, 8 equipment pieces.

**Flights (50-70):** ~40 passenger + ~15 cargo. Ensures:
- `sim_arrival < sim_gate_in < sim_gate_out < sim_departure`
- Same aircraft's flights in forward time order, no overlap
- Gate assignments respect size categories
- Runway slots assigned

**Related data:** ServiceLogs, PassengerFlowLogs, CargoShipments, initial EventLogs.

**Conflict tests:** 2-3 deliberate gate-buffer violations (caught by trigger), 1 size violation.

**Final step:** `CALL sp_refresh_live_map()`.

Map coordinates use 0-1000 × 0-700 viewBox.

Run: `node db/seed.js` → expect populated tables, rejected conflicts logged.

---

## Task 11: API Layer (9 Endpoints)

**Files:** `api/_db.js` (shared pool), then one file per endpoint.

| Endpoint | Method | SQL |
|----------|--------|-----|
| `/api/map?sec=N` | GET | `SELECT * FROM live_map_cache WHERE sim_arrival_sec <= ? AND sim_departure_sec >= ?` |
| `/api/flight/[id]` | GET | Multi-JOIN: Flight+Airline+AircraftFleet+AircraftType+Gate+ServiceLog |
| `/api/atc` | GET | Flights by status groups + recent EventLog |
| `/api/cargo` | GET | CargoBay + Flight + CargoShipment JOINs |
| `/api/airport` | GET | Terminal+Runway+capacity summary |
| `/api/boards` | GET | `v_arrivals_board` + `v_departures_board` views |
| `/api/assign-equipment` | POST | `CALL sp_assign_equipment(?, ?)` |
| `/api/generate-summary` | POST | `CALL sp_generate_turnaround_summary(?)` |
| `/api/delay-flight` | POST | `CALL sp_propagate_delay(?, ?)` |

Create `vercel.json` with rewrites. Test with `npx vercel dev`.

Commit: `git add api/ vercel.json && git commit -m "feat: add all 9 API endpoints"`

---

*Continued in Part 2: Front-End (Phases 6-11)*

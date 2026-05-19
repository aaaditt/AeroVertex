# AeroVertex — Project Overview

> A database-driven simulation of a regional airport. Every flight movement, gate assignment, and status update over a full 24-hour operational day is pre-computed and stored in MySQL. The frontend is a thin React viewer that polls SQL queries against a simulation clock. **The database is the simulation engine.**

**Team (3 members):**

- **Aadit** — Map + ATC + simulation engine slice
- **Fardeen** — Cargo + Boards slice
- **Abhishek** — Airport + Analytics + Flight Detail slice

---

## How to use this document

This is a **project reference** — a single document that captures everything we built, how it fits together, and who did what. It is not a script or a transcript. It exists so that:

- Anyone evaluating the project can verify the full scope of the work in one place
- Any team member can quickly look up a fact (table count, endpoint signature, who owns which file) without re-reading the codebase
- The presentation deck (`PRESENTATION.md` / `.docx`) and this overview together form a complete picture: the deck is the story we tell, this doc is the facts behind it

Sections 1–3 explain the headline idea and architecture. Sections 4–5 are the inventory (backend gets the most space because the rubric weights it 10/15 marks). Section 6 attributes specific files and endpoints to specific team members. Section 7 is the one-line stats summary you can quote.

---

## 1. What "simulation" means here

The most important concept to understand about AeroVertex is that **nothing happens live on the server**. There is no game loop, no physics engine, no agent-based modelling. Instead:

1. A seed script generates a realistic 24-hour airport day **offline** and writes every flight into the `Flight` table with five pre-computed timestamps:
   - `sim_arrival_sec` — when the plane appears at the runway approach
   - `sim_taxi_in_sec` — when it leaves the runway onto a taxiway
   - `sim_gate_in_sec` — when it parks at the gate
   - `sim_gate_out_sec` — when pushback begins
   - `sim_departure_sec` — when it lifts off
2. The frontend has a clock that ticks from `0 → 1800` simulation-seconds. The full day is compressed into 30 real minutes at 1× speed (or 5 minutes at 6×).
3. At every tick, the frontend asks the database: *"given simulation second N, which flights are active, and where on the airport is each one?"*
4. The database answers using `live_map_cache` — a pre-joined materialized cache table refreshed by a stored procedure. This avoids re-joining 17 tables on every poll.
5. The frontend interpolates geometric positions along pre-defined paths (descent → runway → taxiway → gate, or the reverse for departures).

Because no state is held on the server, the entire backend is **serverless-compatible**. Every API call is stateless. Every poll is reproducible.

---

## 2. End-to-end flow of one rendered frame

1. User loads the app. The `useSimulation` hook starts a `requestAnimationFrame` loop and a simulation-second counter.
2. The clock advances from 0 toward 1800 at the selected speed multiplier (`0× / 3× / 6× / 12×`).
3. Every ~1.5 real seconds, the React layer calls `GET /api/map?sec=N`.
4. The Vercel serverless function opens a pooled MySQL connection (`mysql2/promise`) and runs `SELECT … FROM live_map_cache WHERE active_at_sec ≤ N + 200 AND departure_sec ≥ N`, joined to `AircraftFleet` for tail numbers and origin/destination IATA codes.
5. The 200-second lookahead window of active flights is returned as JSON.
6. `AircraftLayer.jsx` maintains a `ref` to each `<g>` icon in the SVG (one per active flight).
7. The 60fps RAF loop calls `getAircraftPosition(flight, simSecond)` in `src/utils/interpolation.js` — this computes `(x, y, heading)` along the flight's 8-point arrival path or 7-point departure path.
8. The loop writes `transform="translate(x,y) rotate(h)"` directly to each `<g>` via `setAttribute`. **Zero React re-renders during motion.**
9. Clicking an aircraft icon triggers `GET /api/flight/[id]` which executes a 6-way join across `Flight + AircraftFleet + AircraftType + Airline + Gate + ServiceLog`.
10. Clicking "Generate Summary" calls `POST /api/generate-summary`, which invokes the stored procedure `sp_generate_turnaround_summary(flight_id)` and returns the billable charges.

---

## 3. Architecture

```text
┌──────────────────────────────────┐
│        MySQL (Railway)            │
│   17 tables · 4 procedures        │
│   3 functions · 4 triggers        │
│   2 views · live_map_cache        │
└────────────────┬─────────────────┘
                 │  mysql2 pool
┌────────────────▼─────────────────┐
│  Node serverless on Vercel        │
│       11 API endpoints            │
└────────────────┬─────────────────┘
                 │  fetch (JSON)
┌────────────────▼─────────────────┐
│       React + Vite SPA            │
│   12 components · 2 hooks         │
│   SVG map · RAF 60fps loop        │
└──────────────────────────────────┘
```

---

## 4. Backend — the 10-mark side

### 4a. Tables (17, all in BCNF)

| # | Table | Purpose | Owner |
| - | --- | --- | --- |
| 1 | `Terminal` | Passenger / cargo terminal buildings | Joint |
| 2 | `Airline` | Operators with ledger balances | Joint |
| 3 | `AircraftType` | Aircraft models (MTOW, wingspan, seat capacity) | Joint |
| 4 | `AircraftFleet` | Individual aircraft with tail numbers | Joint |
| 5 | `Runway` | Physical runways | Aadit |
| 6 | `RunwaySlot` | Time-slotted access for landings/takeoffs | Aadit |
| 7 | `Gate` | Aircraft parking gates (A & B wings) | Aadit |
| 8 | `CargoBay` | Cargo loading positions | Fardeen |
| 9 | `GroundEquipment` | Tugs, baggage carts, fuel trucks, equipment pool | Abhishek |
| 10 | `Flight` | **Central table** — every flight + five sim timestamps | Joint |
| 11 | `GroundServiceAssignment` | Equipment-to-flight allocations | Abhishek |
| 12 | `ServiceLog` | Billable services (fuel, catering, tow) | Fardeen |
| 13 | `PassengerFlowLog` | Terminal passenger density samples | Abhishek |
| 14 | `EventLog` | Audit trail of flight status transitions | Joint |
| 15 | `CargoShipment` | Cargo manifests | Fardeen |
| 16 | `TurnaroundCharge` | Final billing per flight | Abhishek |
| 17 | `live_map_cache` | Pre-joined materialized cache (the simulation engine's hot path) | Aadit |

### 4b. Stored procedures (4)

| Procedure | What it does | SQL concepts demonstrated |
| --- | --- | --- |
| `sp_propagate_delay(flight_id, delay_seconds)` | Cascades a delay through the entire daily schedule of a physical aircraft (one delayed flight pushes back every subsequent flight that uses the same tail number) | Recursion (depth 50), cursors, transactions |
| `sp_generate_turnaround_summary(flight_id)` | Aggregates `ServiceLog` entries into a per-flight billing summary and writes a row to `TurnaroundCharge` | Aggregation, conditional inserts |
| `sp_assign_equipment(flight_id, equipment_id)` | Allocates a free ground-equipment unit to a flight, marks it unavailable, releases it after the flight departs | Locking, foreign-key cascades |
| `sp_refresh_live_map_cache()` | Rebuilds `live_map_cache` from the canonical `Flight` table — the hand-rolled materialized view | Multi-table joins, bulk insert |

### 4c. User-defined functions (3)

| Function | Returns |
| --- | --- |
| `fn_calc_turnaround_time(flight_id)` | Seconds between `sim_gate_in_sec` and `sim_gate_out_sec` |
| `fn_free_gates_at(sim_sec)` | Count of unoccupied gates at a given simulation second |
| `fn_runway_utilization(runway_id, sim_sec_start, sim_sec_end)` | Percentage of seconds the runway is occupied in the window |

### 4d. Triggers (4)

| Trigger | Fires on | What it enforces |
| --- | --- | --- |
| `trg_gate_buffer` | `BEFORE INSERT ON Flight` | Rejects flights that would put two aircraft at the same gate within 15 sim-seconds of each other |
| `trg_event_log` | `AFTER UPDATE ON Flight` | Writes a row to `EventLog` every time a flight's status field changes |
| `trg_equipment_release` | `AFTER UPDATE ON Flight` | When `status = 'Departed'`, marks all assigned equipment as available again |
| `trg_cascade_status` | `AFTER UPDATE ON Flight` | Propagates `Cancelled` status to dependent cargo shipments |

### 4e. Views (2)

- `vw_arrivals_board` — FIDS arrivals: flight number, origin, ETA, gate, status
- `vw_departures_board` — FIDS departures: flight number, destination, ETD, gate, status

### 4f. Normalization

All 17 tables are in **Boyce–Codd Normal Form**. Foreign keys enforce referential integrity:

- Every `Flight` references an `AircraftFleet` (which references an `AircraftType` and an `Airline`)
- Every `Flight` references a `Gate` (which references a `Terminal`) and two `RunwaySlot`s (arrival + departure)
- `ServiceLog`, `GroundServiceAssignment`, `EventLog`, `PassengerFlowLog`, `CargoShipment`, `TurnaroundCharge` all reference `Flight` via foreign key

There are no transitive dependencies and no repeating groups. Every non-key column depends only on the primary key.

### 4g. Query optimization

- Composite indexes on `(active_at_sec, flight_id)` for the hot `/api/map` path
- Composite index on `(sim_arrival_sec, sim_departure_sec)` for the time-window scans
- `EXPLAIN`-verified that `/api/map` and `/api/analytics` use index scans, not full table scans
- The materialized `live_map_cache` table eliminates the 17-table join from the per-frame poll

### 4h. API endpoints (11)

| Method | Path | SQL involved | Returns |
| --- | --- | --- | --- |
| GET | `/api/map?sec=N` | `live_map_cache` JOIN `AircraftFleet` | Active flights with positions for next 200 sim-sec |
| GET | `/api/atc?sec=N` | `Flight` JOIN `Gate`, `RunwaySlot`, `EventLog` | Inbound queue, taxiing list, outbound queue, recent events |
| GET | `/api/airport?sec=N` | `Flight`, `Terminal`, `Gate`, `Runway` aggregates | Terminal pax counts, runway utilization, gate occupancy |
| GET | `/api/boards?sec=N` | `vw_arrivals_board`, `vw_departures_board` | FIDS arrivals + departures with live status |
| GET | `/api/cargo?sec=N` | `CargoBay` JOIN `CargoShipment` JOIN `Flight` | Bay status + shipment manifests |
| GET | `/api/analytics?sec=N` | 5 separate analytical queries | Busiest gates, bottleneck runways, unused gates, equipment usage, passenger flow |
| GET | `/api/flight/[id]` | 6-way join: `Flight + AircraftFleet + AircraftType + Airline + Gate + ServiceLog + EventLog` | Full flight record |
| POST | `/api/generate-summary` | CALL `sp_generate_turnaround_summary(?)` | Turnaround billing breakdown |
| POST | `/api/assign-equipment` | CALL `sp_assign_equipment(?,?)` | Confirmation (UI removed — endpoint retained for completeness) |
| POST | `/api/delay-flight` | CALL `sp_propagate_delay(?,?)` | Cascade result (UI removed — endpoint retained for completeness) |
| — | `/api/_db.js` | mysql2 connection pool | Shared pool used by all endpoints |

> Every endpoint is a stateless query proxy. No business logic in JavaScript — all logic lives in the database.

---

## 5. Frontend — the 5-mark side

The frontend is deliberately thin. It is a **single-page React app built with Vite** that renders one SVG of the airport and seven side-panel views.

### 5a. The map

- One SVG, `viewBox="0 0 1000 700"`, drawn to scale of a real regional airport.
- Two runways (09L/27R for arrivals, 09R/27L for departures), an arrival taxiway, east + west spine taxiways, mid-pax and cargo cross-taxiways, an apron road, five finger piers (A-gates), six B-gates, a cargo terminal, four cargo bays, and a control tower with an animated radar dish.
- White-blueprint colour palette (`#eeece8` paper, `#7c7a78` runway, `#c8a832` taxiway centerline) for a clean, presentation-friendly look.

### 5b. Components (12)

| Component | Path | What the user sees |
| --- | --- | --- |
| `Shell` | `Layout/Shell.jsx` | Main grid: TopBar + Sidebar + content area |
| `Sidebar` | `Layout/Sidebar.jsx` | Seven-tab navigation: Map · ATC · Cargo · Airport · Boards · Stats · Analytics |
| `TopBar` | `Layout/TopBar.jsx` | Simulation clock (06:00–22:00), active flight count, speed controls (Pause / 3× / 6× / 12×) |
| `AirportMap` | `Map/AirportMap.jsx` | The full SVG airport diagram |
| `AircraftLayer` | `Map/AircraftLayer.jsx` | RAF loop, collision avoidance, status colouring |
| `AircraftIcon` | `Map/AircraftIcon.jsx` | Single aircraft silhouette (fuselage, wings, T-tail, callsign label) |
| `ATCConsole` | `Panels/ATCConsole.jsx` | Three-column ATC tower: inbound queue, taxiing, outbound + event log |
| `CargoModule` | `Panels/CargoModule.jsx` | Cargo bay grid + shipment manifests |
| `AirportPanel` | `Panels/AirportPanel.jsx` | Terminal pax counts, runway utilization, gate occupancy |
| `BoardsPanel` | `Panels/BoardsPanel.jsx` | FIDS arrivals / departures boards |
| `AnalyticsDashboard` | `Panels/AnalyticsDashboard.jsx` | Five analytical queries rendered as tables/cards |
| `FlightDetail` | `Panels/FlightDetail.jsx` | Slide-in drawer with flight record, turnaround progress, service logs, Generate Summary action |

### 5c. Custom hooks (2)

- **`useSimulation`** — owns the simulation clock (0–1800 sec), the speed multiplier (0/3/6/12×), and the polling fetch to `/api/map`. Exposes `simSecond`, `simRef`, `setSpeed`, `flights`.
- **`useRAFAnimation`** — the 60fps `requestAnimationFrame` engine. Bypasses React's reconciler entirely — writes `transform` attributes directly to SVG DOM nodes via refs. This is why aircraft motion is smooth even with 50+ planes on screen.

### 5d. State management

Plain React Context + local component state. **No Redux, no Zustand, no MobX.** This is a deliberate choice: every panel re-polls its own API endpoint, so a global store would just duplicate database state. Keeping state local keeps the architecture lightweight and the data always fresh.

---

## 6. Individual contribution

The team split work as **full-stack vertical slices** — each member owns one panel area and the backend that feeds it.

### Aadit — Map + ATC + simulation engine

**Frontend:** `Map/AirportMap.jsx`, `Map/AircraftLayer.jsx`, `Map/AircraftIcon.jsx`, `Map/mapConfig.js`, `Panels/ATCConsole.jsx`, `Layout/TopBar.jsx`, `Layout/Shell.jsx`, `Layout/Sidebar.jsx`
**Hooks:** `hooks/useSimulation.js`, `hooks/useRAFAnimation.js`
**Utils:** `utils/interpolation.js` (8-point arrival path through runway, 7-point departure path, weighted speed engine, status derivation)
**Backend:** `/api/map`, `/api/atc`, `live_map_cache` table, `sp_refresh_live_map_cache` procedure
**Design:** runway / gate / taxiway SVG geometry, white-blueprint palette

### Fardeen — Cargo + Boards

**Frontend:** `Panels/CargoModule.jsx`, `Panels/BoardsPanel.jsx`
**Backend:** `/api/cargo`, `/api/boards`
**Schema:** `CargoBay`, `CargoShipment`, `ServiceLog` tables
**Views:** `vw_arrivals_board`, `vw_departures_board`
**Logic:** the FIDS arrival/departure board status-derivation queries

### Abhishek — Airport + Analytics + Flight Detail

**Frontend:** `Panels/AirportPanel.jsx`, `Panels/AnalyticsDashboard.jsx`, `Panels/FlightDetail.jsx`
**Backend:** `/api/airport`, `/api/analytics`, `/api/flight/[id]`, `/api/generate-summary`
**Schema:** `PassengerFlowLog`, `TurnaroundCharge`, `GroundEquipment`, `GroundServiceAssignment` tables
**Procedures:** `sp_generate_turnaround_summary`, `fn_calc_turnaround_time`, `fn_free_gates_at`, `fn_runway_utilization`
**SQL:** the five analytical queries powering the dashboard (busiest gates, bottleneck runways, unused gates, equipment usage, passenger flow — including one correlated subquery)

### Joint / shared

Master schema design (`db/schema.sql`), triggers (`db/triggers.sql`), the four trigger definitions, `EXPLAIN` optimization pass on the hot query paths, Vercel deployment configuration, seed-data generation (`db/seed.js`), the `Flight` central table design, and the `Airline + AircraftType + AircraftFleet` lookup spine.

---

## 7. Stats summary

> **17 tables** · **11 endpoints** · **12 components** · **2 hooks** · **4 procedures** · **3 functions** · **4 triggers** · **2 views** · **1 SVG** · **1800 sim-seconds** · **60 fps**

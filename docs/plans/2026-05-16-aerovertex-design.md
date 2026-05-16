# AeroVertex — Design Document

> **Status:** Awaiting approval section-by-section

## 1. Architecture Overview

**Three layers, all on managed hosting:**

| Layer | Tech | Host | Role |
|-------|------|------|------|
| **Front-end** | React + Vite + Tailwind CSS | Vercel | SVG map, simulation clock, UI panels |
| **API** | Node.js serverless functions | Vercel (`/api/*`) | Stateless SQL bridge — one query per request, returns JSON |
| **Database** | MySQL 8.0 (InnoDB) | Railway | All data, triggers, procedures, functions, views |

**Data flow:** The front-end never touches MySQL directly. Every piece of data on screen comes from an API call → SQL query → JSON response. The simulation is pre-computed and stored in the database; the front-end plays it back by polling the API with the current simulation second.

---

## 2. Design Theme

**Light, minimal, monochrome — not the blueprint's dark theme.**

- **Palette:** Greys (#F8F9FA → #1F2937), white backgrounds, with accent colors only for flight status indicators (green = on-time, amber = delayed, red = conflict)
- **Typography:** Inter or similar clean sans-serif via Google Fonts
- **Map:** Semi-realistic top-down SVG. Buildings in medium grey (#9CA3AF), taxiways in light grey (#E5E7EB), runways as clean white/light strips with markings, aircraft as small colored icons
- **Panels:** Clean white cards with subtle borders, no glassmorphism — minimal aesthetic
- **Tailwind CSS** for all styling

---

## 3. Core Scope (No Optional Modules)

**Included (core):**
- 15 database tables (Terminal through live_map_cache)
- 4 triggers (gate buffer, gate size, event log, equipment release)
- 3 functions (turnaround time, free gates, runway utilization)
- 4 procedures (delay cascade, assign equipment, turnaround summary, refresh map cache)
- 2 views (arrivals board, departures board)
- Nested & correlated queries for analytics
- ~6-8 API endpoints
- Interactive SVG map with simulation playback
- Click panels: Flight detail, ATC console, Cargo module, Airport overview
- Arrivals/Departures boards
- Seed script generating 40-80 flights across 1800 simulation seconds

**Excluded:**
- Retail module (Tenant, RetailUnit, Lease tables)
- TurnaroundCharge billing table
- Weather/NOTAM logic
- Staff scheduling

> **Note:** Even though we're skipping the TurnaroundCharge *table*, we keep the `sp_generate_turnaround_summary` procedure since the blueprint uses it as a demo action button. We can have it return the calculation as JSON without persisting it, or add the table back — it's one table and trivial. I'll include it in the plan as a "procedure that computes and returns" rather than a full billing module.

**Actually — correction:** The turnaround summary procedure is one of the 3 required stored procedures in the blueprint, and it's part of the demo script (step 8). Let's keep the `TurnaroundCharge` table — it's a single table with one procedure, not a "module." This way we have all 4 procedures working end-to-end.

---

## 4. Database Design (Frozen from Blueprint)

**16 tables** in dependency order:

```
1.  Terminal
2.  Airline
3.  AircraftType
4.  AircraftFleet        → Airline, AircraftType
5.  Runway
6.  RunwaySlot           → Runway
7.  Gate                 → Terminal
8.  CargoBay             → Terminal
9.  GroundEquipment
10. Flight               → Airline, AircraftFleet, Gate, CargoBay, RunwaySlot
11. GroundServiceAssignment → Flight, GroundEquipment
12. ServiceLog           → Flight
13. PassengerFlowLog     → Terminal
14. EventLog             → Flight
15. CargoShipment        → Flight, CargoBay
16. TurnaroundCharge     → Flight
+   live_map_cache       (hand-rolled materialized view, no FKs)
```

**Schema, triggers, functions, procedures, views** — all exactly as written in the blueprint (Sections 11-13). No changes needed.

**Indexes:** `Flight(gate_id)`, `Flight(status)`, `Flight(sim_arrival_sec)`, `Flight(aircraft_id)`, `RunwaySlot(runway_id, sim_slot_start_sec)`, `ServiceLog(flight_id)`.

---

## 5. API Endpoints

| Method | Path | SQL | Purpose |
|--------|------|-----|---------|
| `GET` | `/api/map?sec=N` | `SELECT * FROM live_map_cache` | Active flights + positions for simulation second N |
| `GET` | `/api/flight/:id` | Multi-table JOIN | Full flight detail for click panel |
| `GET` | `/api/atc` | Flight queries by status | ATC console: inbound queue, on-ground, departure queue |
| `GET` | `/api/cargo` | CargoBay + CargoShipment JOINs | Cargo terminal overview |
| `GET` | `/api/airport` | Terminal + Runway + capacity queries | Airport summary panel |
| `GET` | `/api/boards` | `v_arrivals_board`, `v_departures_board` | Arrivals/departures boards |
| `POST` | `/api/assign-equipment` | `CALL sp_assign_equipment(?, ?)` | Assign ground equipment to flight |
| `POST` | `/api/generate-summary` | `CALL sp_generate_turnaround_summary(?)` | Generate turnaround charge |
| `POST` | `/api/delay-flight` | `CALL sp_propagate_delay(?, ?)` | Trigger delay cascade |

All endpoints use `mysql2` with connection pooling. Each is a single serverless function.

---

## 6. Front-End Modules

### 6.1 Layout Shell
- **Top bar:** Simulation clock (sim second + mapped "time of day"), flight count, speed controls (1×, 2×, pause)
- **Left sidebar:** Navigation to all modules (Map, ATC, Cargo, Airport, Boards, Analytics)
- **Main area:** The active module

### 6.2 Live Map (hero screen)
- Full SVG airport: 2 runways, passenger terminal with ~14 gates, cargo terminal with ~6 bays, control tower, taxiway paths
- Aircraft icons positioned by interpolating between `sim_*_sec` values along predefined paths (runway → taxiway → gate)
- Icons colored by status (green/amber/red)
- Click any aircraft → opens Flight Detail drawer
- Click terminal/tower/cargo building → opens respective panel
- Speed controls affect `currentSimSecond` advancement rate

### 6.3 Flight Detail Drawer (side panel)
- Opens on aircraft click
- Shows: flight number, airline, aircraft type, origin/dest, status, gate, passenger count, service logs
- Action buttons: "Assign Equipment", "Generate Summary", "Delay Flight"
- Cargo variant: shows shipments instead of passenger count

### 6.4 ATC Tower Console
- Inbound queue (flights with status Inbound/Landing)
- On-ground flights (Taxiing/At_Gate/Boarding)
- Departure queue (Pushback/Departed)
- Live event log feed (from EventLog table)

### 6.5 Cargo Module
- Cargo bay grid showing each bay and what's parked there
- Shipment list with handling status

### 6.6 Airport Panel
- Terminal info, runway list with utilization %, free gates/bays count, total flights

### 6.7 Arrivals/Departures Boards
- Classic airport board layout reading from the two SQL views

### 6.8 Analytics Dashboard
- Renders the correlated/nested queries: bottleneck flights, under-used gates, busiest gates, equipment usage

---

## 7. Simulation Engine

**Pre-computed playback, not live simulation.**

- `currentSimSecond` counter: 0 → 1800, advances in real-time
- Polls `/api/map?sec=N` on a timer (2-3 times per second)
- For each flight returned, computes icon position by linear interpolation:
  - Between `sim_arrival_sec` and `sim_gate_in_sec`: aircraft moves along runway → taxiway → gate path
  - Between `sim_gate_in_sec` and `sim_gate_out_sec`: aircraft sits at gate
  - Between `sim_gate_out_sec` and `sim_departure_sec`: aircraft moves gate → taxiway → runway
- Flight status derived from clock position relative to the 4 `sim_*_sec` values
- Speed control: multiplier on the tick rate (1×, 2×, 0× for pause)

---

## 8. Seed Data Strategy

**Node.js script using `@faker-js/faker` and `mysql2`:**

- ~6 airlines with realistic names
- ~10 aircraft types (real models: A320, B737, ATR-72, etc.)
- ~30 aircraft in the fleet
- 2 runways with time-slotted windows
- 14 gates (varying size categories) + 6 cargo bays
- 8 ground equipment pieces
- **50-70 flights** spread across 0-1800 sim seconds
- Ensures: `sim_arrival < sim_gate_in < sim_gate_out < sim_departure` per flight
- Ensures: no aircraft overlap (same aircraft's flights in forward time order)
- Seeds a few deliberate gate conflicts to demonstrate trigger rejection
- Generates service logs, passenger flow logs, cargo shipments
- Calls `sp_refresh_live_map()` at the end

---

## 9. Build Phases (Solo, Sequential)

| Phase | What | Depends On |
|-------|------|------------|
| **1. Project Setup** | Vite + React + Tailwind, Railway MySQL, Vercel project | Nothing |
| **2. Database Schema** | All 17 tables in dependency order, indexes | Phase 1 |
| **3. SQL Logic** | 4 triggers, 3 functions, 4 procedures, 2 views | Phase 2 |
| **4. Seed Script** | Node.js data generator, populate all tables | Phase 3 |
| **5. API Layer** | All 9 endpoints as Vercel serverless functions | Phase 4 |
| **6. Front-End Shell** | Layout, sidebar, top bar, simulation clock | Phase 1 |
| **7. SVG Map** | Airport drawing, aircraft icons, click targets | Phase 6 |
| **8. Simulation Engine** | Clock, polling, interpolation, animation | Phases 5 + 7 |
| **9. Click Panels** | Flight detail, ATC, Cargo, Airport, Boards | Phase 8 |
| **10. Analytics** | Dashboard with correlated/nested queries | Phase 5 |
| **11. Polish & Demo** | Speed controls, error handling, EXPLAIN optimization | All |

---

## 10. Key Design Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Theme | Light, minimal, grey/white | User preference, faster to build |
| CSS | Tailwind CSS | Rapid solo development |
| MySQL host | Railway | Full MySQL compatibility (triggers, FKs, procedures) |
| Front-end | React + Vite | Blueprint default, component-based for modular panels |
| Simulation | Pre-computed playback | Serverless-compatible, unbreakable demo |
| Seed data | Node.js script | Same language as project, uses mysql2 |
| Optional modules | Skipped (retail). Kept TurnaroundCharge. | Lean core, billing procedure needed for demo |
| Map style | Semi-realistic top-down, grey monochrome | Realistic enough for impact, buildable solo |

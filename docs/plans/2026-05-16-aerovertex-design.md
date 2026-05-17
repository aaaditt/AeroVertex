# AeroVertex — Design Document

> **Status:** Sessions 1 & 2 complete. Sessions 3–9 planned.

---

## 1. Architecture Overview

| Layer | Tech | Host | Role |
|-------|------|------|------|
| **Front-end** | React + Vite + Tailwind CSS | Vercel | SVG map, simulation clock, UI panels |
| **API** | Node.js serverless functions | Vercel (`/api/*`) | Stateless SQL bridge — one query per request, returns JSON |
| **Database** | MySQL 8.0 (InnoDB) | Railway | All data, triggers, procedures, functions, views |

**Data flow:** The front-end never touches MySQL directly. Every piece of data on screen comes from an API call → SQL query → JSON response. The simulation is pre-computed and stored in the database; the front-end plays it back by polling the API with the current simulation second.

---

## 2. Design Theme — LOCKED

**Dark navy control-room theme.** This was built in Session 2 and is kept for all future sessions.

- **Background:** `#060e1a` body, `#0a1628` panels/cards, `#0d1f3c` header/footer
- **Borders:** `#1e3a5f`
- **Accents:** `#60a5fa` (blue), `#4ade80` (green status), `#f59e0b` (amber warning), `#ef4444` (red conflict)
- **Text:** white primary, `#93c5fd` secondary, `#9ca3af` muted
- **Map:** `#0f2d1a` grass, `#2d3d2d` tarmac, `#1c2d1c` taxiways, `#e5e540` centre-line dashes
- **Font:** system monospace for labels and status readouts; system sans-serif for body text
- **No glassmorphism, no gradients** — flat dark surfaces with solid borders only

The original design doc's "light grey" preference is superseded by what was actually built. The dark theme is a better fit for an airport operations system.

---

## 3. Core Scope

**Included (core):**

- 17 database tables (Terminal through live_map_cache including TurnaroundCharge)
- 4 triggers (gate buffer, gate size, event log, equipment release)
- 3 functions (turnaround time, free gates, runway utilization)
- 4 procedures (delay cascade, assign equipment, turnaround summary, refresh map cache)
- 2 views (arrivals board, departures board)
- Nested and correlated queries for analytics dashboard
- 9 API endpoints
- Interactive SVG map with real simulation playback driven by DB data
- Click panels: Flight detail, ATC console, Cargo module, Airport overview, Analytics
- Arrivals/Departures boards
- Seed script generating 50–70 flights across 1800 simulation seconds

**Excluded:**

- Retail module (Tenant, RetailUnit, Lease tables)
- Weather/NOTAM logic
- Staff scheduling

---

## 4. Database Design — Built and Frozen

All 17 tables exist in `db/schema.sql` and were run against Railway MySQL in Session 1.

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
    live_map_cache       (hand-rolled materialized view, no FKs)
```

Indexes, triggers, functions, procedures, and views are all built and tested.

---

## 5. Canonical Map Coordinates — Source of Truth

The seed script (`db/seed.js`) inserted these exact values into the DB. All front-end geometry must match them. These are frozen.

**Canvas:** `viewBox="0 0 1000 700"`

**Runways:**

| Name | x1 | y1 | x2 | y2 |
|------|----|----|----|----|
| 09L/27R | 50 | 140 | 950 | 140 |
| 09R/27L | 50 | 560 | 950 | 560 |

**Terminals (centre points):**

| Name | map_x | map_y |
|------|-------|-------|
| Passenger Terminal A | 500 | 200 |
| Cargo Terminal B | 500 | 480 |

**Gates:**

| Label | map_x | map_y | max_size |
|-------|-------|-------|----------|
| A1 | 185 | 235 | 1 |
| A2 | 255 | 235 | 2 |
| A3 | 325 | 235 | 2 |
| A4 | 395 | 235 | 3 |
| A5 | 465 | 235 | 3 |
| A6 | 535 | 235 | 3 |
| A7 | 605 | 235 | 4 |
| B1 | 205 | 170 | 2 |
| B2 | 295 | 170 | 3 |
| B3 | 385 | 170 | 3 |
| B4 | 475 | 170 | 4 |
| B5 | 565 | 170 | 4 |
| B6 | 655 | 170 | 5 |
| B7 | 745 | 170 | 5 |

**Cargo Bays:**

| Label | map_x | map_y | max_size |
|-------|-------|-------|----------|
| C1 | 310 | 495 | 4 |
| C2 | 390 | 495 | 4 |
| C3 | 470 | 495 | 4 |
| C4 | 550 | 495 | 4 |
| C5 | 630 | 495 | 5 |
| C6 | 710 | 495 | 5 |

---

## 6. API Endpoints — Session 3

| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/map?sec=N` | Active flights from `live_map_cache` for sim-second N |
| GET | `/api/flight/:id` | Full flight detail (multi-join) |
| GET | `/api/atc` | Flights by status group + recent EventLog |
| GET | `/api/cargo` | All cargo bays and shipments |
| GET | `/api/airport` | Terminal, runway, capacity summary |
| GET | `/api/boards` | v_arrivals_board + v_departures_board |
| POST | `/api/assign-equipment` | Calls sp_assign_equipment |
| POST | `/api/generate-summary` | Calls sp_generate_turnaround_summary |
| POST | `/api/delay-flight` | Calls sp_propagate_delay |

---

## 7. Front-End Component Architecture — Sessions 4–8

```
src/
  App.jsx                          ← holds activeModule state, calls useSimulation
  App.css                          ← dark navy theme (built in Session 2, frozen)
  components/
    Layout/
      Shell.jsx                    ← top-level layout wrapper
      Sidebar.jsx                  ← nav links, sets activeModule
      TopBar.jsx                   ← sim clock, speed controls, flight count
    Map/
      mapConfig.js                 ← static geometry (all coords from Section 5 above)
      AirportMap.jsx               ← static SVG layers: runways, terminals, gates, bays
      AircraftLayer.jsx            ← animated plane icons, reads from useSimulation
      AircraftIcon.jsx             ← single plane SVG element
    Panels/
      FlightDetail.jsx             ← slide-in drawer, flight data + action buttons
      ATCConsole.jsx               ← inbound/ground/departure queues + event log
      CargoModule.jsx              ← cargo bay grid + shipment table
      AirportPanel.jsx             ← terminal/runway/capacity stats
      BoardsPanel.jsx              ← FIDS arrivals/departures boards
      AnalyticsDashboard.jsx       ← correlated/nested query results
  hooks/
    useSimulation.js               ← sim clock, polling /api/map, flight list
  utils/
    interpolation.js               ← getAircraftPosition, getFlightStatus, path builders
```

**What exists now vs what gets built:**

- `src/App.jsx` and `src/App.css` — exist (Session 2), will be updated in Session 4
- `src/AirportHero.jsx` — exists (Session 2), will be **deleted** in Session 4 and replaced by `AirportMap.jsx` + `AircraftLayer.jsx`
- Everything else — built in Sessions 4–8

---

## 8. Simulation Engine — Session 5

Pre-computed playback, not live simulation.

- `currentSimSecond` counter: 0 → 1800, advances 1 per real second at 1× speed
- Polls `/api/map?sec=N` every 2 seconds
- For each flight, `getAircraftPosition(flight, simSecond)` returns `{x, y, heading}` by linear interpolation along the taxiway waypoint path
- `getFlightStatus(flight, simSecond)` derives status from the four `sim_*_sec` values
- Speed control: 0× (pause), 1×, 2× — multiplier on the tick interval

**Taxi path waypoints:**

Arrival (runway 1 → gate): `(950,140) → (800,140) → (800,350) → (gate_x,350) → (gate_x,gate_y)`

Arrival (runway 1 → cargo bay): `(950,140) → (800,140) → (800,420) → (bay_x,420) → (bay_x,495)`

Departure (gate → runway 2): `(gate_x,gate_y) → (gate_x,350) → (200,350) → (200,560) → (50,560)`

Departure (cargo bay → runway 2): `(bay_x,495) → (bay_x,420) → (200,420) → (200,560) → (50,560)`

---

## 9. Session Progress Tracker

| Session | Scope | Status |
|---------|-------|--------|
| 1 | Scaffold, DB schema, all SQL objects, seed script | ✅ Complete |
| 2 | Proof-of-concept hero map (hardcoded, dark theme) | ✅ Complete |
| 3 | 9 API endpoints | Pending |
| 4 | Layout shell + real static SVG map | Pending |
| 5 | Simulation engine + aircraft animation from DB | Pending |
| 6 | Flight detail drawer | Pending |
| 7 | ATC console + cargo module | Pending |
| 8 | Airport panel + boards + analytics | Pending |
| 9 | Deployment + polish + EXPLAIN optimization | Pending |

---

## 10. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Theme | Dark navy control-room | Built in Session 2, looks better than light grey for ops |
| CSS | Tailwind CSS + custom CSS vars | Rapid development |
| MySQL host | Railway | Full MySQL compatibility (triggers, FKs, procedures) |
| Front-end | React + Vite | Component-based for modular panels |
| Simulation | Pre-computed playback | Serverless-compatible, unbreakable demo |
| Seed data | Node.js + faker | Same language as project, uses mysql2 |
| Map coordinates | Frozen from seed script | DB is source of truth, front-end matches it |
| Optional modules | Retail skipped, TurnaroundCharge included | Lean core, billing procedure needed for demo |
| Hero map (Session 2) | Deleted and replaced in Session 4 | Was proof-of-concept only, wrong coordinates |

# AeroVertex — Presentation Structure

**Format:** 8–10 minute demo + slide deck. Rubric: **10 marks backend · 5 marks frontend · individual contribution.**

**Backend-weighted by design** — the database is the engineering centerpiece, and the rubric weights it 2× more than the frontend. The deck spends ~5 min on backend (slides 4–7), ~3.5 min on frontend demos (slides 8–11), and ~1.5 min on intro/close.

**Team & speakers:**

- **Aadit** — Map + ATC + simulation engine slice
- **Fardeen** — Cargo + Boards slice
- **Abhishek** — Airport + Analytics + Flight Detail slice

---

## 30-second elevator pitch (memorise this)

> *"AeroVertex is a database-driven simulation of a regional airport. We compress a full 24-hour operational day into 30 minutes of playback. The entire day — every flight, gate, runway slot, and ground service — is pre-computed and stored in MySQL across seventeen normalised tables. The frontend is a thin React viewer that polls SQL queries against a simulation clock and renders the airport as a live SVG map at sixty frames per second. The interesting design choice is that the database itself is the simulation engine: there's no game loop, no server-side state — just timestamps and queries."*

**When to use it:**

- If a marker walks in mid-demo and asks "what is this?"
- If a team member is asked "describe your project in one minute" during individual evaluation
- As the opening line of slide 2 if you want a smoother handoff

Every team member should be able to recite this verbatim or in their own words within 30 seconds.

---

## Slide 1 — Title (20 sec · Aadit)

- **AeroVertex** — title in large type
- Subtitle: *A database-driven simulation of a regional airport*
- Names: Aadit · Fardeen · Abhishek
- Date · Course code · Section
- [PROJECT LOGO or screenshot of the SVG map]

**What to say:**
> "Hi, we're going to walk you through AeroVertex — a project where we built an entire airport's daily operations as a database simulation, with a real-time React interface on top of it."

---

## Slide 2 — Problem framing (40 sec · Aadit)

- Why this project?
  - Real airport operational data is huge, proprietary, and hard to model
  - Most "airport simulators" run a game loop on the server — heavy and not reproducible
  - We wanted to demonstrate that the *database itself* can hold and play back a full day of operations
- What we built: a 30-minute compressed playback of a 24-hour airport day, all driven by SQL queries

**What to say:**
> "The interesting question we asked was: *can the database be the simulation engine?* No physics, no game loop on the server — just timestamps and queries. That turned out to be a really clean way to solve it."

---

## Slide 3 — The big idea (50 sec · Aadit) — KEY CONCEPT SLIDE

Show this phrase **prominently** in the centre of the slide:

> **"The database is the simulation engine."**

Three bullets below:

- Every flight is a pre-computed row with five timestamps (`sim_arrival_sec`, `sim_taxi_in_sec`, `sim_gate_in_sec`, `sim_gate_out_sec`, `sim_departure_sec`)
- The frontend has a clock that ticks `0 → 1800` and asks SQL: *"what's happening at second N?"*
- No server-side state. Every poll is reproducible. Fully serverless-compatible.

**What to say:**
> "This is the headline idea: we compress 24 hours of airport operations into 30 minutes of simulation time. The database holds the entire day. The frontend just polls it."

---

## ─── BACKEND BLOCK ─── (≈5 min · 10-mark weighting)

## Slide 4 — Database schema (75 sec · Abhishek) [SCHEMA]

- **17 tables, all in Boyce–Codd Normal Form**
- ER diagram on the slide — colour-code by owner (Aadit's tables in orange, Fardeen's in green, Abhishek's in blue, joint tables in grey)
- Walk through the spine: `Airline → AircraftFleet → Flight → Gate → ServiceLog`
- Highlight `Flight` as the central table (16 incoming foreign keys)
- Mention `live_map_cache` — the hand-rolled materialized view

**What to say:**
> "Seventeen tables, all in BCNF. Every flight references an aircraft, an airline, a gate, and two runway slots. No transitive dependencies, no repeating groups. The central `Flight` table holds the five simulation timestamps that drive everything else."

---

## Slide 5 — Stored procedures & triggers (75 sec · Abhishek) [DEMO Workbench]

Show one procedure on screen — preferably `sp_propagate_delay`:

- **4 stored procedures**
  - `sp_propagate_delay` — recursive cascade (depth 50) that propagates a delay through every subsequent flight using the same aircraft tail
  - `sp_generate_turnaround_summary` — aggregates ServiceLog into a billable summary
  - `sp_assign_equipment` — allocates a ground equipment unit and releases it after departure
  - `sp_refresh_live_map_cache` — rebuilds the materialized cache
- **3 user-defined functions**: `fn_calc_turnaround_time`, `fn_free_gates_at`, `fn_runway_utilization`
- **4 triggers** that enforce real-world constraints:
  - `trg_gate_buffer` — rejects flights that would overlap at the same gate within 15 seconds
  - `trg_event_log` — audit trail of every status change
  - `trg_equipment_release` — auto-releases ground equipment after departure
  - `trg_cascade_status` — propagates cancellations to dependent cargo shipments

**What to say:**
> "The interesting one here is `sp_propagate_delay` — it recursively walks the schedule of the delayed aircraft and pushes every subsequent flight back. That's the kind of cascade you'd actually see in real airline operations."

---

## Slide 6 — The simulation engine (75 sec · Aadit) — MOST DENSE SLIDE

Walk through the **10-step "one frame" flow** from `PROJECT_OVERVIEW.md`:

1. App loads → `useSimulation` starts the clock
2. Clock ticks `0 → 1800` at speed multiplier
3. Every 1.5 s, frontend calls `/api/map?sec=N`
4. Vercel function opens pooled MySQL connection
5. SQL: `SELECT … FROM live_map_cache WHERE active_at_sec ≤ N+200 AND departure_sec ≥ N`
6. JSON returned to React
7. `AircraftLayer` holds refs to each `<g>` icon
8. RAF loop interpolates `(x, y, heading)` along the flight path
9. `setAttribute('transform', ...)` directly on the DOM — **no React re-render**
10. Click an icon → `/api/flight/[id]` → 6-way join returned

[SCREENSHOT or short animation showing this flow]

**What to say:**
> "This is the loop. The clock ticks, the API gets called, MySQL answers, the RAF engine paints the next frame. Sixty frames per second, with zero React re-renders during motion, because we write transforms straight to the DOM."

---

## Slide 7 — API layer (60 sec · Fardeen)

- **11 stateless API endpoints** running on Vercel serverless functions
- Tech: Node.js · `mysql2/promise` · connection pooling · dotenv
- Show one endpoint source on screen — pick `/api/cargo.js` or `/api/boards.js` (Fardeen's own)
- Make the point: **under 30 lines, mostly SQL**, no business logic in JavaScript
- Mention `EXPLAIN`-verified composite indexes on the hot paths

**What to say:**
> "Every endpoint is basically a thin wrapper over a SQL query. The business logic lives in the database — in views, procedures, and triggers. That's deliberate: it means we can swap the frontend or scale serverless functions without changing any of the operational rules."

---

## ─── FRONTEND BLOCK ─── (≈3.5 min · 5-mark weighting)

## Slide 8 — Frontend architecture (45 sec · Aadit)

- React + Vite + plain SVG (no canvas, no WebGL)
- 12 components, 2 custom hooks, plain Context (no Redux)
- **Key insight:** the 60fps RAF loop bypasses React entirely — writes `transform` straight to DOM via refs
- White-blueprint colour palette for presentation-clean look

**What to say:**
> "We deliberately kept the frontend thin. The clever part is that animation runs at 60fps without ever triggering a React re-render — we use refs and `setAttribute` to update the SVG directly."

---

## Slide 9 — Map + ATC demo (90 sec · Aadit) [DEMO]

Switch to the running app:

1. Open at simulation second 0 (06:00)
2. Click **6×** speed
3. Watch the first wave of aircraft approach the runway, touch down, taxi, and park at gates
4. Switch to **ATC tab** — show the three-column queue view: inbound, taxiing, outbound
5. Switch back to **Map**, click an aircraft → **FlightDetail drawer** slides in
6. Click **Generate Summary** → turnaround charges return from `sp_generate_turnaround_summary`

**Demo cues:**
- If app is slow, fall back to Boards tab (pre-loaded)
- Pre-pick a known flight ID with a longer turnaround so service logs are visible

**What to say:**
> "Watch how the planes approach the runway, touch down at runway 09L, roll out, and taxi to the gates. Each one is following a pre-computed timeline from the database — I'm just clicking play."

---

## Slide 10 — Cargo + Boards demo (60 sec · Fardeen) [DEMO]

Switch to:

1. **Cargo tab** — show the cargo bay grid, point out an occupied bay with active shipments
2. Click into a cargo flight → FlightDetail shows the cargo manifest
3. Switch to **Boards tab** — FIDS arrivals/departures driven by `vw_arrivals_board` and `vw_departures_board` views
4. Point out a delayed flight in red

**What to say:**
> "The cargo module and the boards both run off SQL views I built. The boards in particular look exactly like the real flight information displays you'd see at an airport — and they're just a `SELECT` away."

---

## Slide 11 — Analytics demo (60 sec · Abhishek) [DEMO]

Switch to **Analytics tab**:

1. Scroll through the five analytical queries:
   - **Busiest gates** — `GROUP BY gate_id`, ordered by flight count
   - **Bottleneck runways** — utilization % by hour
   - **Unused gates** — `LEFT JOIN` returning gates with zero flights
   - **Equipment usage** — `GroundServiceAssignment` aggregates
   - **Passenger flow** — `PassengerFlowLog` density samples
2. Specifically point out the **correlated subquery** in one of them (busiest gates uses a correlated count to rank by utilization within terminal)
3. Click **Generate Daily Summary** if implemented

**What to say:**
> "These five queries demonstrate the range of SQL we used — aggregations, left joins for absent data, correlated subqueries, and time-window analysis. They turn raw simulation data into operational insights, the kind a real airport operations team would want."

---

## ─── CLOSE ─── (≈1.5 min)

## Slide 12 — Individual contribution (45 sec · all three)

Three-column layout, one per member. Each member reads their own column for ~10 sec.

| Aadit | Fardeen | Abhishek |
| --- | --- | --- |
| **Map + ATC + sim engine** | **Cargo + Boards** | **Airport + Analytics + Flight Detail** |
| `AirportMap.jsx`, `AircraftLayer.jsx`, `AircraftIcon.jsx`, `ATCConsole.jsx`, `Shell.jsx`, `TopBar.jsx`, `Sidebar.jsx` | `CargoModule.jsx`, `BoardsPanel.jsx` | `AirportPanel.jsx`, `AnalyticsDashboard.jsx`, `FlightDetail.jsx` |
| `useSimulation`, `useRAFAnimation`, `interpolation.js` | `/api/cargo`, `/api/boards` | `/api/airport`, `/api/analytics`, `/api/flight/[id]`, `/api/generate-summary` |
| `/api/map`, `/api/atc`, `live_map_cache`, `sp_refresh_live_map_cache` | `CargoBay`, `CargoShipment`, `ServiceLog`, `vw_arrivals_board`, `vw_departures_board` | `PassengerFlowLog`, `TurnaroundCharge`, `GroundEquipment`, `sp_generate_turnaround_summary`, 5 analytics queries |

> Each member should be able to name **at least 3 files they personally wrote** when called on individually.

---

## Slide 13 — Stats + tech stack (25 sec · Aadit)

Large headline numbers:

> **17 tables · 11 endpoints · 12 components · 4 procedures · 3 functions · 4 triggers · 2 views · 60 fps**

Tech stack logos in a row: **React · Vite · Node.js · Vercel · MySQL · mysql2**

**What to say:**
> "Final numbers. Seventeen tables in BCNF, eleven API endpoints, twelve React components, sixty frames per second of animation. Built on React, Vite, Node serverless, and MySQL."

---

## Slide 14 — Closing & repo (15 sec · Aadit)

- "Thanks for watching."
- Repo link (or QR code)
- Team names

---

## Demo Hygiene Checklist

Before the projector goes on:

- [ ] **Set simulation speed to 6×** — at 1× it looks like nothing is happening; at 12× it's chaos
- [ ] **Pick a known flight ID with delays** for the FlightDetail demo so service logs and turnaround steps are visible
- [ ] **Pre-load the Boards tab** as a fallback if the Map renders slowly
- [ ] **Have screenshots ready** of the Analytics dashboard and ER diagram in case `/api/analytics` is slow or the DB connection drops
- [ ] **Open MySQL Workbench** in a second window with `sp_propagate_delay` already on screen for slide 5
- [ ] **Rehearse slide 6** (the 10-step simulation flow) — it's the most technically dense slide and the biggest backend-mark earner
- [ ] **Confirm the bug fixes from earlier today:**
  - Aircraft now land on the actual runway (y=82), not on the taxiway
  - No compass rose in the corner of the map
  - No "AX" badge on the right side of the map
  - FlightDetail drawer shows only the **Generate Summary** action (no Assign Equipment, no Delay Flight)
- [ ] **Each member knows their own slide 12 column** by heart — when the marker asks who did what, the answer should be instant
- [ ] **Refresh the browser** at least once before starting so the first `/api/map` call isn't a cold start

## Time totals

| Block | Slides | Time |
| --- | --- | --- |
| Intro | 1–3 | ~1:50 |
| Backend (10 marks) | 4–7 | ~4:45 |
| Frontend demos (5 marks) | 8–11 | ~3:35 |
| Close | 12–14 | ~1:25 |
| **Total** | **14 slides** | **~11:35 (with buffer)** |

Trim 20–30 seconds from the demo slides if you need to land closer to 10 minutes flat. The backend block (slides 4–7) is non-negotiable — that's where two-thirds of the marks live.

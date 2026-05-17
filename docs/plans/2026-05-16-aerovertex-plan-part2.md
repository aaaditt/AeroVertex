# AeroVertex Implementation Plan — Part 2 (Sessions 4–9)

> Continues from Part 1. **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

---

## SESSION 4 — Front-End Shell + Real Airport Map

> **Prerequisite:** Session 3 complete (all 9 API endpoints working via `npx vercel dev`).

### Context — what already exists

`src/AirportHero.jsx`, `src/App.jsx`, and `src/App.css` were built in Session 2 as a standalone proof-of-concept. The hero map is hardcoded with fake flights and coordinates that do NOT match the database. Session 4 replaces this with the real component architecture while keeping the dark navy theme.

**Theme decision (locked):** Dark navy control-room. Keep `App.css` as-is. All new components use the same palette: `#060e1a` body, `#0a1628` panels, `#1e3a5f` borders, `#60a5fa` accents, `#4ade80` status green.

### Coordinate reference (from seed script — authoritative)

All SVG geometry uses a `0 0 1000 700` viewBox. These are the exact values in the database:

**Runways:**

- `09L/27R`: x1=50, y1=140 → x2=950, y2=140 (top runway, arrivals)
- `09R/27L`: x1=50, y1=560 → x2=950, y2=560 (bottom runway, departures)

**Terminals:**

- Passenger Terminal A: centre x=500, y=200 — render as rect `x=150, y=175, w=600, h=80`
- Cargo Terminal B: centre x=500, y=480 — render as rect `x=280, y=460, w=460, h=60`

**Gates (A-wing y=235, B-wing y=170):**

- A1(185,235), A2(255,235), A3(325,235), A4(395,235), A5(465,235), A6(535,235), A7(605,235)
- B1(205,170), B2(295,170), B3(385,170), B4(475,170), B5(565,170), B6(655,170), B7(745,170)

**Cargo Bays (y=495):**

- C1(310,495), C2(390,495), C3(470,495), C4(550,495), C5(630,495), C6(710,495)

**Taxiway waypoints (for path interpolation):**

The arrival path from runway 1 to a gate follows: touchdown at (950, 140) → slow-roll west to (800, 140) → south on spine taxiway to (800, 350) → west along mid-taxiway to (gate_x, 350) → north to (gate_x, gate_y).

The departure path from a gate to runway 2 follows: (gate_x, gate_y) → (gate_x, 350) → west to (200, 350) → south on spine to (200, 560) → west to (50, 560).

Cargo arrivals follow the same runway 1 path but terminate at (bay_x, 495). Cargo departures use runway 2 via (bay_x, 495) → (bay_x, 420) → (200, 420) → (200, 560) → (50, 560).

### Task 12 — Layout Shell

**Files to create:**

- `src/components/Layout/Shell.jsx`
- `src/components/Layout/Sidebar.jsx`
- `src/components/Layout/TopBar.jsx`

**Delete** `src/AirportHero.jsx` — it is replaced by `AirportMap.jsx` in Task 13.

**Update** `src/App.jsx` to render the Shell.

Shell structure:

```
┌─────────────────────────────────────────────────────┐
│ TopBar: sim clock | flight count | speed controls    │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │  Main content area                        │
│  Map     │  (active module component)                │
│  ATC     │                                           │
│  Cargo   │                                           │
│  Airport │                                           │
│  Boards  │                                           │
│  Stats   │                                           │
└──────────┴──────────────────────────────────────────┘
```

**TopBar:** Shows `currentSimSecond` mapped to a time-of-day string (0 → "06:00", 1800 → "22:00"), total active flight count, speed buttons (⏸ Pause / 1× / 2×). Uses the simulation context (Task 14).

**Sidebar:** Seven nav items with icons (use plain Unicode or inline SVG — no icon library needed). Active item has a left `#60a5fa` accent border. Sets `activeModule` in App state.

**App.jsx:** Holds `activeModule` state (default `'map'`), wraps everything in `<Shell>`, renders the active module component in the main area.

Commit: `git commit -m "feat: add layout shell with sidebar and topbar"`

---

### Task 13 — SVG Airport Map

**Files to create:**

- `src/components/Map/mapConfig.js`
- `src/components/Map/AirportMap.jsx`

**Delete** the now-replaced `src/AirportHero.jsx`.

#### mapConfig.js

Export `MAP_CONFIG` — a plain object with all static geometry. Use the exact coordinates from the Coordinate Reference above. No logic here, just data:

```js
export const MAP_CONFIG = {
  viewBox: '0 0 1000 700',
  runways: [
    { id: 1, name: '09L/27R', x1: 50, y1: 140, x2: 950, y2: 140 },
    { id: 2, name: '09R/27L', x1: 50, y1: 560, x2: 950, y2: 560 },
  ],
  passengerTerminal: { x: 150, y: 175, w: 600, h: 80, label: 'Passenger Terminal A' },
  cargoTerminal:     { x: 280, y: 460, w: 460, h: 60, label: 'Cargo Terminal B' },
  controlTower:      { x: 90,  y: 320 },
  gates: [
    { id: 1,  label: 'A1', x: 185, y: 235 },
    { id: 2,  label: 'A2', x: 255, y: 235 },
    { id: 3,  label: 'A3', x: 325, y: 235 },
    { id: 4,  label: 'A4', x: 395, y: 235 },
    { id: 5,  label: 'A5', x: 465, y: 235 },
    { id: 6,  label: 'A6', x: 535, y: 235 },
    { id: 7,  label: 'A7', x: 605, y: 235 },
    { id: 8,  label: 'B1', x: 205, y: 170 },
    { id: 9,  label: 'B2', x: 295, y: 170 },
    { id: 10, label: 'B3', x: 385, y: 170 },
    { id: 11, label: 'B4', x: 475, y: 170 },
    { id: 12, label: 'B5', x: 565, y: 170 },
    { id: 13, label: 'B6', x: 655, y: 170 },
    { id: 14, label: 'B7', x: 745, y: 170 },
  ],
  cargoBays: [
    { id: 1, label: 'C1', x: 310, y: 495 },
    { id: 2, label: 'C2', x: 390, y: 495 },
    { id: 3, label: 'C3', x: 470, y: 495 },
    { id: 4, label: 'C4', x: 550, y: 495 },
    { id: 5, label: 'C5', x: 630, y: 495 },
    { id: 6, label: 'C6', x: 710, y: 495 },
  ],
  // Spine taxiways — rendered as thin yellow-dashed lines
  taxiways: [
    { x1: 800, y1: 140, x2: 800, y2: 560 }, // east spine
    { x1: 200, y1: 140, x2: 200, y2: 560 }, // west spine
    { x1: 200, y1: 350, x2: 800, y2: 350 }, // mid horizontal
    { x1: 200, y1: 420, x2: 800, y2: 420 }, // cargo horizontal
  ],
};
```

#### AirportMap.jsx

Renders the full static SVG. Props: `onSelectFlight(flightId)`, `onSelectGate(gateId)`, `onSelectCargo()`, `onSelectTower()`, `onSelectAirport()`. Aircraft icons are NOT rendered here — that is the AircraftLayer component (Task 14).

SVG layers, bottom to top:

1. **Background** — `#0f2d1a` grass fill rect
2. **Runway strips** — dark tarmac rects behind each runway
3. **Runways** — dark grey `strokeWidth=28` lines with white centre-line dashes, threshold marks, blue edge-light dots, runway name labels
4. **Taxiways** — `strokeWidth=14` dark lines with yellow `strokeDasharray` centre lines
5. **Apron pads** — subtle dark green rects behind each terminal
6. **Cargo Terminal** — `#1f3830` rect with green `#4ade80` border, label, bay markers
7. **Passenger Terminal** — `#1a3a5c` rect with blue border, label, window row, gate arm stubs
8. **Gate markers** — small `#3b82f6` circles with label text; `onClick` → `onSelectGate(gateId)`
9. **Cargo bay markers** — small `#4ade80` squares with label; `onClick` → `onSelectCargo()`
10. **Control tower** — distinctive shape (rect + overhang + radar circle); `onClick` → `onSelectTower()`
11. **Terminal building** — `onClick` → `onSelectAirport()`
12. **Construction zone** — amber dashed rect at x=820,y=270 labelled "Terminal C — Under Construction"

This component is purely static. It receives no flight data and renders no aircraft. Styling carries over the dark navy palette from `AirportHero.jsx`.

Commit: `git commit -m "feat: add SVG airport map with static geometry from seed coordinates"`

---

## SESSION 5 — Simulation Engine + Aircraft Animation

> **Prerequisite:** Session 4 complete (shell and static map rendering).

### Task 14 — Simulation Engine

**Files to create:**

- `src/hooks/useSimulation.js`
- `src/utils/interpolation.js`
- `src/components/Map/AircraftLayer.jsx`
- `src/components/Map/AircraftIcon.jsx`

#### useSimulation.js

The core hook. Manages the sim clock, speed, and DB-driven flight list.

```js
export function useSimulation() {
  const [simSecond, setSimSecond] = useState(0);
  const [speed, setSpeed] = useState(1);   // 0=paused, 1=normal, 2=fast
  const [flights, setFlights] = useState([]);

  // Advance clock
  useEffect(() => {
    if (speed === 0) return;
    const id = setInterval(() => {
      setSimSecond(s => Math.min(s + speed, 1800));
    }, 1000);
    return () => clearInterval(id);
  }, [speed]);

  // Poll /api/map every 2 s
  useEffect(() => {
    let cancelled = false;
    async function fetchFlights() {
      try {
        const res = await fetch(`/api/map?sec=${simSecond}`);
        const data = await res.json();
        if (!cancelled) setFlights(data);
      } catch { /* ignore */ }
    }
    fetchFlights();
    const id = setInterval(fetchFlights, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [simSecond]);

  return { simSecond, speed, setSpeed, flights, setSimSecond };
}
```

#### interpolation.js

Compute an aircraft's `{x, y}` position and heading from the sim clock and the flight's stored timestamps. Uses the taxiway waypoints defined in `MAP_CONFIG`.

```js
import { MAP_CONFIG } from '../components/Map/mapConfig';

export function getAircraftPosition(flight, simSecond) {
  const { sim_arrival_sec, sim_gate_in_sec, sim_gate_out_sec, sim_departure_sec } = flight;
  const destX = flight.gate_x ?? flight.bay_x;
  const destY = flight.gate_y ?? flight.bay_y;
  const isCargo = flight.bay_x != null;

  if (simSecond < sim_arrival_sec || simSecond > sim_departure_sec) return null;

  if (simSecond <= sim_gate_in_sec) {
    const path = buildArrivalPath(destX, destY, isCargo);
    const t = (simSecond - sim_arrival_sec) / (sim_gate_in_sec - sim_arrival_sec);
    return interpolatePath(path, t);
  }
  if (simSecond <= sim_gate_out_sec) {
    return { x: destX, y: destY, heading: 0 };
  }
  const path = buildDeparturePath(destX, destY, isCargo);
  const t = (simSecond - sim_gate_out_sec) / (sim_departure_sec - sim_gate_out_sec);
  return interpolatePath(path, t);
}

function buildArrivalPath(gx, gy, isCargo) {
  const midY = isCargo ? 420 : 350;
  return [
    { x: 950, y: 140 },
    { x: 800, y: 140 },
    { x: 800, y: midY },
    { x: gx,  y: midY },
    { x: gx,  y: gy },
  ];
}

function buildDeparturePath(gx, gy, isCargo) {
  const midY = isCargo ? 420 : 350;
  return [
    { x: gx,  y: gy },
    { x: gx,  y: midY },
    { x: 200, y: midY },
    { x: 200, y: 560 },
    { x: 50,  y: 560 },
  ];
}

function lerp(a, b, t) { return a + (b - a) * t; }

function interpolatePath(pts, t) {
  const clamped = Math.max(0, Math.min(1, t));
  const segs = pts.length - 1;
  const scaled = clamped * segs;
  const i = Math.min(Math.floor(scaled), segs - 1);
  const segT = scaled - i;
  const x = lerp(pts[i].x, pts[i + 1].x, segT);
  const y = lerp(pts[i].y, pts[i + 1].y, segT);
  const nx = lerp(pts[i].x, pts[i + 1].x, Math.min(segT + 0.02, 1));
  const ny = lerp(pts[i].y, pts[i + 1].y, Math.min(segT + 0.02, 1));
  const heading = Math.atan2(ny - y, nx - x) * 180 / Math.PI + 90;
  return { x, y, heading };
}
```

#### getFlightStatus(flight, simSecond)

```js
export function getFlightStatus(flight, simSecond) {
  if (flight.status === 'Cancelled') return 'Cancelled';
  if (flight.delay_seconds > 0) return 'Delayed';
  if (simSecond < flight.sim_arrival_sec) return 'Scheduled';
  if (simSecond < flight.sim_gate_in_sec) return 'Taxiing';
  if (simSecond < flight.sim_gate_out_sec) return 'At_Gate';
  if (simSecond < flight.sim_departure_sec) return 'Pushback';
  return 'Departed';
}
```

Status → colour: `At_Gate / Taxiing / Pushback` → `#3b82f6` (blue), `Delayed` → `#f59e0b` (amber), `Cancelled` → `#ef4444` (red).

#### AircraftIcon.jsx

Small SVG `<g>` element. Props: `x, y, heading, color, callsign, onClick`. Renders a fuselage ellipse, wing polygon, tail, and callsign label above it. `transform={translate(x,y) rotate(heading)}`.

#### AircraftLayer.jsx

Sits inside `AirportMap.jsx` as a child (or as an SVG overlay). Receives `flights` and `simSecond` from the simulation hook. For each flight, calls `getAircraftPosition` and `getFlightStatus`, then renders `<AircraftIcon>`. Skips flights where position is null (not yet arrived or already departed).

#### Wire it together in App.jsx

Call `useSimulation()` at the top level. Pass `simSecond` and `speed/setSpeed` to `<TopBar>`. Pass `flights` and `simSecond` to `<AircraftLayer>` inside the map.

Commit: `git commit -m "feat: add simulation engine with DB-driven aircraft animation"`

---

## SESSION 6 — Flight Detail Drawer

> **Prerequisite:** Session 5 complete (planes moving on map).

### Task 15 — Flight Detail Drawer

**File:** `src/components/Panels/FlightDetail.jsx`

Slide-in drawer from the right. Opens when an aircraft icon is clicked (`onSelectFlight` callback from AircraftLayer → App → FlightDetail).

**Data source:** `GET /api/flight/:id`

Returns: flight + airline + aircraft type + gate/bay + service logs.

**Content:**

- Header: flight number badge + airline name + status pill (colour-coded)
- Detail grid (2-column): Origin → Destination, Aircraft type, Tail number, Gate/Bay label, Sim arrival time, Sim departure time
- Passenger count (or "Cargo Flight" with shipment count for `is_cargo=true`)
- Service logs table: service type | quantity | charge
- Divider
- Action buttons (each calls its API endpoint, shows inline success/error):
  - "Assign Equipment" — dropdown of available `GroundEquipment`, POST `/api/assign-equipment`
  - "Generate Summary" — POST `/api/generate-summary`, shows returned charge breakdown inline
  - "Delay Flight" — number input (seconds, min 60), POST `/api/delay-flight`, refreshes drawer on success
- Close `×` button top-right

**Styling:** Dark navy panel `#0a1628`, slides in with CSS `transform: translateX`, `transition: 0.25s`. Width 360px. Backdrop overlay dims the map when open.

Commit: `git commit -m "feat: add flight detail drawer with action buttons"`

---

## SESSION 7 — ATC Console + Cargo Module

> **Prerequisite:** Session 6 complete.

### Task 16 — ATC Tower Console

**File:** `src/components/Panels/ATCConsole.jsx`

Opens when the control tower is clicked on the map, or via sidebar nav.

**Data source:** `GET /api/atc`

Returns: flights grouped by status + 20 most recent EventLog rows.

**Layout:** Three columns:

1. Inbound Queue — flights with status `Inbound` or `Taxiing`, sorted by sim_arrival_sec ascending
2. On Ground — flights with status `At_Gate` or `Boarding`
3. Departure Queue — flights with status `Pushback`, sorted by sim_departure_sec ascending

Each flight row: flight number, airline IATA code, aircraft model, sim time, status badge.

Below the queues: scrollable Event Log feed — list of EventLog entries showing `old_status → new_status` with sim time. Auto-refreshes every 3 seconds.

Commit: `git commit -m "feat: add ATC tower console"`

### Task 17 — Cargo Module

**File:** `src/components/Panels/CargoModule.jsx`

Opens when the cargo terminal is clicked on the map, or via sidebar nav.

**Data source:** `GET /api/cargo`

Returns: all 6 cargo bays with current occupying flight (if any) + all cargo shipments.

**Layout:**

- Grid of 6 cargo bay cards — label, size category, current flight number (or "Empty"), cargo type
- Below: shipment table — shipment ID, flight number, weight (kg), cargo type, handling status
- Status badge colours: Received=grey, In_Bay=blue, Loaded=green, Cleared=dark green

Commit: `git commit -m "feat: add cargo module"`

---

## SESSION 8 — Airport Panel + Boards + Analytics

> **Prerequisite:** Session 7 complete.

### Task 18 — Airport Panel

**File:** `src/components/Panels/AirportPanel.jsx`

Opens via sidebar or clicking the terminal building.

**Data source:** `GET /api/airport`

**Content:**

- Two terminal cards: name, type, gate/bay count, current occupancy
- Runway cards with utilization % progress bar (from `fn_runway_utilization`)
- Capacity stats row: free gates count (from `fn_free_gates`), free bays, total flights today, delayed count
- Simple stat cards, dark navy

Commit: `git commit -m "feat: add airport overview panel"`

### Task 19 — Arrivals/Departures Boards

**File:** `src/components/Panels/BoardsPanel.jsx`

**Data source:** `GET /api/boards`

Classic FIDS airport board layout. Two tabs: Arrivals / Departures.

- Arrivals: Flight #, Origin, Scheduled (sim second mapped to HH:MM), Status badge, Gate
- Departures: Flight #, Destination, Scheduled, Status badge, Gate
- Sorted by time. Monospace font. Auto-refreshes every 5 seconds with the sim clock.

Commit: `git commit -m "feat: add arrivals and departures boards"`

### Task 20 — Analytics Dashboard

**File:** `src/components/Panels/AnalyticsDashboard.jsx`

**Data source:** extend `/api/airport` with a `?analytics=true` param, or add `/api/analytics` endpoint that runs the blueprint Section 13.5 queries.

Five sections, each a table or stat card:

1. Bottleneck Flights — flights whose turnaround exceeded their airline's average (correlated subquery)
2. Under-used Large Gates — gates `max_size >= 4` that never hosted a size-4+ aircraft (nested query)
3. Busiest Gates — ranked by flight count
4. Equipment Usage — ranked by total assignment duration
5. Passenger Flow Peaks — highest `passenger_count` per terminal zone

Primarily a rubric requirement (nested/correlated queries must be visible and demonstrable).

Commit: `git commit -m "feat: add analytics dashboard"`

---

## SESSION 9 — Deployment + Polish + EXPLAIN Optimization

> **Prerequisite:** Sessions 3–8 complete (all modules built).

### Task 21 — Vercel Deployment

1. `npm install -g vercel` (if not already installed)
2. `vercel --prod`
3. Set all env vars in Vercel dashboard: `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
4. Verify deployed URL: map loads, planes move, click panels return real data
5. Commit any deployment config changes

### Task 22 — Polish + EXPLAIN Optimization

**EXPLAIN comparison (for the report):**

Run against raw tables:

```sql
EXPLAIN SELECT f.*, a.airline_name, g.map_x, g.map_y
FROM Flight f
JOIN Airline a ON a.airline_id = f.airline_id
LEFT JOIN Gate g ON g.gate_id = f.gate_id
WHERE f.sim_arrival_sec <= 500 AND f.sim_departure_sec >= 500;
```

Then against `live_map_cache`:

```sql
EXPLAIN SELECT * FROM live_map_cache
WHERE sim_arrival_sec <= 500 AND sim_departure_sec >= 500;
```

Save both outputs. This is the optimization story for the report.

**Polish checklist:**

- Error states on all API calls (loading spinner, "Failed to load" fallback)
- Keyboard shortcuts: Space=pause, 1=1× speed, 2=2× speed
- Speed controls in TopBar work smoothly at both 1× and 2×
- Sim clock resets to 0 and loops when it hits 1800
- Responsive: sidebar collapses to icon-only on narrow screens, map scales with viewBox
- Run `npm run lint` and fix any errors

Commit: `git commit -m "feat: polish, EXPLAIN optimization, error handling, responsive"`

---

## Full Task Summary

| # | Task | Session | Status |
|---|------|---------|--------|
| 1–10 | Scaffold, DB schema, triggers, functions, procedures, views, seed | 1 | ✅ Done |
| 11 | 9 API endpoints | 3 | — |
| 12 | Layout shell (sidebar + topbar) | 4 | — |
| 13 | SVG airport map (static, real coordinates) | 4 | — |
| 14 | Simulation engine + aircraft animation | 5 | — |
| 15 | Flight detail drawer | 6 | — |
| 16 | ATC tower console | 7 | — |
| 17 | Cargo module | 7 | — |
| 18 | Airport overview panel | 8 | — |
| 19 | Arrivals/departures boards | 8 | — |
| 20 | Analytics dashboard | 8 | — |
| 21 | Vercel deployment | 9 | — |
| 22 | Polish + EXPLAIN optimization | 9 | — |

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

---

## SESSION 10 — 60fps RAF Animation Engine

> **Prerequisite:** Session 9 complete (all modules built, deployed, polished).

### Context

The current simulation advances via `setInterval` + React state, which triggers a full re-render every second. This caps animation at ~1fps on the map. To get true 60fps smooth plane movement, we need a `requestAnimationFrame` loop that writes directly to SVG DOM elements via refs — React renders the static map structure once, and RAF handles all positional updates without triggering re-renders.

### Task 23 — Replace setInterval animation with requestAnimationFrame

**Files to modify:**

- `src/hooks/useSimulation.js`
- `src/components/Map/AircraftLayer.jsx`
- `src/components/Map/AircraftIcon.jsx`

**Files to create:**

- `src/hooks/useRAFAnimation.js`

#### useRAFAnimation.js

New hook that drives the sim clock via `requestAnimationFrame` instead of `setInterval`. The sim clock must advance at the same rate (speed sim-seconds per real second) but update at 60fps instead of 1fps.

```js
import { useRef, useEffect, useCallback } from 'react'

// Returns a ref holding the current simSecond (updated at 60fps) and a setter for speed.
// Also calls onTick(simSecond) every frame so callers can read the latest value.
export function useRAFAnimation({ speed, onTick, maxSec = 1800 }) {
  const simRef = useRef(0)
  const speedRef = useRef(speed)
  const lastTsRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => { speedRef.current = speed }, [speed])

  useEffect(() => {
    function frame(ts) {
      if (speedRef.current === 0) {
        lastTsRef.current = null
        rafRef.current = requestAnimationFrame(frame)
        return
      }
      if (lastTsRef.current !== null) {
        const dtSec = (ts - lastTsRef.current) / 1000
        simRef.current = simRef.current + speedRef.current * dtSec
        if (simRef.current > maxSec) simRef.current = 0
      }
      lastTsRef.current = ts
      onTick(simRef.current)
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
  }, [onTick, maxSec])

  return simRef
}
```

#### useSimulation.js — changes

Replace the `setInterval` clock advance with `useRAFAnimation`. Keep the `setFlights` poll every 1500ms unchanged — flight list still comes from the API. The `simSecond` React state is now only updated every ~250ms (for TopBar display) rather than every frame, to avoid expensive React re-renders from the RAF loop.

```js
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRAFAnimation } from './useRAFAnimation'

const TICK_MS = 1000
const DISPLAY_UPDATE_MS = 250  // how often TopBar clock updates (not animation)

export function useSimulation() {
  const [simSecondDisplay, setSimSecondDisplay] = useState(0)
  const [speed, setSpeed] = useState(6)
  const [flights, setFlights] = useState([])
  const simApiRef = useRef(0)           // for fetch queries (always current)
  const lastDisplayUpdate = useRef(0)   // throttle React state updates

  const onTick = useCallback((s) => {
    simApiRef.current = s
    const now = performance.now()
    if (now - lastDisplayUpdate.current > DISPLAY_UPDATE_MS) {
      setSimSecondDisplay(Math.floor(s))
      lastDisplayUpdate.current = now
    }
  }, [])

  const simRef = useRAFAnimation({ speed, onTick })

  // Poll /api/map every 1.5s using the always-current ref value
  useEffect(() => {
    let cancelled = false
    async function fetchFlights() {
      try {
        const res = await fetch(`/api/map?sec=${Math.floor(simApiRef.current)}`)
        const data = await res.json()
        if (!cancelled && Array.isArray(data)) setFlights(data)
      } catch { /* ignore */ }
    }
    fetchFlights()
    const id = setInterval(fetchFlights, 1500)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return { simSecond: simSecondDisplay, simRef, speed, setSpeed, flights, setSimSecond: (s) => { simRef.current = s } }
}
```

#### AircraftIcon.jsx — add DOM ref for direct mutation

Rewrite `AircraftIcon` to accept a `groupRef` prop (a `React.RefObject<SVGGElement>`). The `<g>` tag gets `ref={groupRef}`. The component no longer reads `x`, `y`, `heading` from props for its transform — those are written directly to `groupRef.current.setAttribute('transform', ...)` by the RAF loop. This avoids React re-rendering the icon on every frame.

```jsx
import { forwardRef } from 'react'

const AircraftIcon = forwardRef(function AircraftIcon({ status, callsign, onClick }, ref) {
  const color = status === 'Delayed' ? '#f59e0b' : status === 'Cancelled' ? '#ef4444' : '#3b82f6'
  return (
    <g ref={ref} onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* fuselage */}
      <ellipse cx={0} cy={0} rx={5} ry={12} fill={color} />
      {/* wings */}
      <polygon points="-14,4 14,4 8,-2 -8,-2" fill={color} opacity={0.85} />
      {/* tail */}
      <polygon points="-5,10 5,10 3,14 -3,14" fill={color} opacity={0.7} />
      {/* callsign */}
      <text x={0} y={-16} textAnchor="middle" fontSize={8} fill="#e2e8f0" fontFamily="monospace">
        {callsign}
      </text>
    </g>
  )
})

export default AircraftIcon
```

#### AircraftLayer.jsx — drive icons via RAF

`AircraftLayer` now maintains a map of `flightId → React.RefObject`. It renders all `<AircraftIcon>` elements once (or when `flights` changes). Then, inside a `useEffect` + `requestAnimationFrame` loop, it reads `simRef.current`, computes each aircraft's position via `getAircraftPosition`, and writes `transform` attributes directly to the DOM refs — no React state, no re-renders.

```jsx
import { useRef, useEffect } from 'react'
import { getAircraftPosition, getFlightStatus } from '../../utils/interpolation'
import AircraftIcon from './AircraftIcon'

export default function AircraftLayer({ flights, simRef, onSelectFlight }) {
  // One ref per flight, keyed by flight id
  const iconRefs = useRef({})

  // Ensure refs exist for current flights
  flights.forEach(f => {
    const id = f.flight_id ?? f.id
    if (!iconRefs.current[id]) iconRefs.current[id] = { ref: { current: null }, flight: f }
    iconRefs.current[id].flight = f
  })

  // RAF loop — writes transform directly to DOM, zero React re-renders
  useEffect(() => {
    let raf
    function frame() {
      const sec = simRef.current
      Object.values(iconRefs.current).forEach(({ ref, flight }) => {
        const el = ref.current
        if (!el) return
        const pos = getAircraftPosition(flight, sec)
        if (pos) {
          el.setAttribute('transform', `translate(${pos.x},${pos.y}) rotate(${pos.heading})`)
          el.style.display = ''
        } else {
          el.style.display = 'none'
        }
      })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [simRef])

  return (
    <>
      {flights.map(flight => {
        const id = flight.flight_id ?? flight.id
        if (!iconRefs.current[id]) iconRefs.current[id] = { ref: { current: null }, flight }
        const entry = iconRefs.current[id]
        const status = getFlightStatus(flight, simRef.current)
        const label = flight.flight_number ?? flight.callsign ?? ''
        return (
          <AircraftIcon
            key={id}
            ref={entry.ref}
            status={status}
            callsign={label}
            onClick={() => onSelectFlight?.(id)}
          />
        )
      })}
    </>
  )
}
```

**Wire up in App.jsx:** Pass `simRef` from `useSimulation()` down to `<AircraftLayer simRef={simRef} ...>`. `simSecond` (the display value) still goes to `<TopBar>`.

Commit: `git commit -m "feat: replace setInterval animation with 60fps requestAnimationFrame engine"`

---

## SESSION 11 — Premium White Blueprint UI

> **Prerequisite:** Session 10 complete (60fps animation running).

### Background

The current UI uses a dark navy control-room palette (`#060e1a` body, `#0a1628` panels). This session completely replaces it with a premium white/blueprint theme matching the reference design: white parchment background, charcoal line-work, grey tonal panels, orange aircraft icons, organic curved concourse terminal shapes. The dark navy theme is fully removed — no remnants.

**New colour palette (replace all dark values):**

| Role | Old | New |
| --- | --- | --- |
| Body background | `#060e1a` | `#f5f5f0` (warm off-white parchment) |
| Panel background | `#0a1628` | `#ffffff` |
| Panel surface | `#0f1f3d` | `#f0f0eb` |
| Border / line-work | `#1e3a5f` | `#c8c8c0` |
| Primary accent | `#60a5fa` (blue) | `#e67e22` (burnt orange) |
| Secondary accent | `#3b82f6` | `#d35400` |
| Status green | `#4ade80` | `#27ae60` |
| Status amber | `#f59e0b` | `#e67e22` |
| Status red | `#ef4444` | `#c0392b` |
| Text primary | `#e2e8f0` | `#1a1a1a` |
| Text secondary | `#4b7fbd` | `#666660` |
| Aircraft colour | `#3b82f6` (blue) | `#e67e22` (orange) |
| Grass / apron | `#0f2d1a` | `#dde8d0` (soft sage green) |
| Tarmac | `#1a2a1a` | `#c8ccc8` (light grey) |
| Runway strip | `#2a2a2a` | `#9aa09a` |
| Taxiway | `#1e2e1e` | `#b0b8b0` |
| Taxiway dashes | `#e2b21a` (yellow) | `#8a7a5a` (warm khaki) |

### Task 24 — Retheme all layout components

**Files to modify:**

- `src/App.css` — replace all CSS variables and body background with new palette
- `src/components/Layout/Shell.jsx` — update inline styles
- `src/components/Layout/Sidebar.jsx` — update inline styles; active accent changes to orange `#e67e22`
- `src/components/Layout/TopBar.jsx` — update all inline colours; brand text `#e67e22`; progress bar gradient `#e67e22 → #d35400`; speed button active colour `#e67e22`

All monospace fonts stay. Only colours change.

Commit: `git commit -m "feat: retheme layout shell to premium white palette"`

---

### Task 25 — Rebuild SVG airport map as white blueprint

**File to rewrite:** `src/components/Map/AirportMap.jsx`

This is the most important visual change. The map becomes a white drafting-table blueprint — thin charcoal lines on a light sage-green ground plane, crisp grey tarmac, warm khaki taxiway dashes. The overall aesthetic is architectural rather than cinematic.

**Map layer spec (replace dark values entirely):**

1. **Background** — `#dde8d0` sage green fill (the "grass" plane)
2. **Runway strips** — `#c8ccc8` light-grey rects, `strokeWidth=28`, with `#9aa09a` edge stroke
3. **Runway centre-line dashes** — `#ffffff` dashes, `strokeWidth=2`
4. **Runway threshold marks** — white `#ffffff` short perpendicular lines
5. **Runway ID labels** — `#1a1a1a` charcoal, monospace, fontSize=10
6. **Taxiways** — `#b0b8b0` fill, `strokeWidth=14`; centre dashes `#8a7a5a` khaki, `strokeDasharray="20 10"`
7. **Apron pads** — `#ccd8c8` pale sage rects behind each terminal
8. **Passenger Terminal A** — `#ffffff` white rect, `stroke="#c8c8c0"` 1.5px, header stripe `#e67e22` 8px tall top edge, window row as small `#e0e8f0` rects, label `#1a1a1a`
9. **Gate arm stubs** — thin `#c8c8c0` 2px lines from terminal edge to gate positions
10. **Gate markers** — `#e67e22` filled circle r=5, `#ffffff` stroke 1px, label `#1a1a1a` fontSize=8
11. **Cargo Terminal B** — `#ffffff` rect, `stroke="#c8c8c0"`, header stripe `#27ae60` (green), label `#1a1a1a`
12. **Cargo bay markers** — `#27ae60` filled square 8×8, label `#1a1a1a`
13. **Control tower** — charcoal `#1a1a1a` rect + overhang, radar circle `stroke="#e67e22"` animated rotation
14. **Construction zone** — amber dashed rect, `stroke="#e67e22"` strokeDasharray, label `#e67e22`
15. **Grid pattern defs** — very light `#d0d8c8` 50px grid (like drafting paper)
16. **Drop shadow filter** — subtle `feDropShadow` stdDeviation=3 opacity=0.1 on terminal buildings

**Concourse shape change (organic finger piers):**

Replace the current rectangular terminal buildings with organic curved concourse shapes using SVG `<path>` elements with arc commands. The passenger terminal concourse should look like a finger pier plan-view — a central spine with curved "fingers" extending north toward the runway.

Passenger Terminal concourse path (approximate):

```svg
M 150,255  Q 150,175 220,175  L 720,175  Q 760,175 760,215
L 760,255  Q 760,275 720,275  L 220,275  Q 150,275 150,255  Z
```

Add concourse "gate finger" extensions — 7 stub paths extending upward (toward y=140 runway) from the spine, each 8px wide, 40px long, with rounded tips:

```svg
M gx-4,175  L gx-4,145  Q gx,135 gx+4,145  L gx+4,175  Z
```

Render one finger for each gate x position in A1–A7.

**AircraftIcon colour change:**

In `AircraftIcon.jsx`, change the default aircraft colour from `#3b82f6` to `#e67e22`. The status-based colour mapping becomes:

- Normal / Taxiing / At_Gate: `#e67e22` (orange)
- Delayed: `#d35400` (dark orange)
- Cancelled: `#c0392b` (red)

Commit: `git commit -m "feat: rebuild airport map SVG as white blueprint with organic concourse shape"`

---

### Task 26 — Retheme all panel components

**Files to modify:**

- `src/components/Panels/FlightDetail.jsx`
- `src/components/Panels/ATCConsole.jsx`
- `src/components/Panels/CargoModule.jsx`
- `src/components/Panels/AirportPanel.jsx`
- `src/components/Panels/BoardsPanel.jsx`
- `src/components/Panels/AnalyticsDashboard.jsx`

For each panel, replace all dark navy colour values with the white palette. Specific changes:

- Panel background: `#0a1628` → `#ffffff`
- Panel border: `#1e3a5f` → `#c8c8c0`
- Header/section backgrounds: `#0f1f3d` → `#f0f0eb`
- Status badges: keep colour-coding but use lighter backgrounds (tint colours at 15% opacity with charcoal text)
- Table rows: alternate `#ffffff` / `#f8f8f4`
- Drawer backdrop overlay: `rgba(0,0,0,0.15)` (lighter scrim on white theme)
- All text: `#e2e8f0` → `#1a1a1a` (primary), `#4b7fbd` → `#666660` (secondary)
- Action buttons: primary `#e67e22` background, `#ffffff` text
- Progress bars: fill `#e67e22`

Boards panel: FIDS display uses `#1a1a1a` text on `#f0f0eb` rows with `#e67e22` for the "On Time" status and `#c0392b` for "Delayed". Classic airport-board aesthetic.

Commit: `git commit -m "feat: retheme all panel components to white blueprint palette"`

---

### Task 27 — Final white-theme polish

- Update `<title>` and any meta tags in `index.html` if present
- Verify no dark navy hex values remain anywhere — run `grep -r "0a1628\|060e1a\|0f1f3d\|1e3a5f" src/` and fix any stragglers
- Run `npm run lint` and fix errors
- Test all panels open/close correctly with new palette
- Test aircraft icons are visible (orange on sage green should have good contrast)
- Verify 60fps animation still runs (Session 10 should be untouched by palette changes)

Commit: `git commit -m "feat: complete white blueprint theme — premium UI overhaul finished"`

---

## Full Task Summary

| # | Task | Session | Status |
|---|------|---------|--------|
| 1–10 | Scaffold, DB schema, triggers, functions, procedures, views, seed | 1 | ✅ Done |
| 11 | 9 API endpoints | 3 | — |
| 12 | Layout shell (sidebar + topbar) | 4 | ✅ Done |
| 13 | SVG airport map (static, real coordinates) | 4 | ✅ Done |
| 14 | Simulation engine + aircraft animation | 5 | ✅ Done |
| 15 | Flight detail drawer | 6 | — |
| 16 | ATC tower console | 7 | — |
| 17 | Cargo module | 7 | — |
| 18 | Airport overview panel | 8 | — |
| 19 | Arrivals/departures boards | 8 | — |
| 20 | Analytics dashboard | 8 | — |
| 21 | Vercel deployment | 9 | — |
| 22 | Polish + EXPLAIN optimization | 9 | — |
| 23 | 60fps RAF animation engine | 10 | — |
| 24 | Retheme layout shell (white palette) | 11 | — |
| 25 | Rebuild SVG map as white blueprint + organic concourse | 11 | — |
| 26 | Retheme all panel components | 11 | — |
| 27 | Final white-theme polish | 11 | — |

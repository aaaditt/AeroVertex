# AeroVertex Implementation Plan — Part 2 (Phases 6–11)

> Continues from Part 1. **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

---

## Task 12: Front-End Shell Layout

**Files:**
- Create: `src/App.jsx`, `src/components/Layout/Shell.jsx`, `src/components/Layout/Sidebar.jsx`, `src/components/Layout/TopBar.jsx`

**Shell structure:**

```
┌──────────────────────────────────────────────┐
│ TopBar: sim clock | flight count | speed ctl  │
├────────┬─────────────────────────────────────┤
│Sidebar │  Main content area                   │
│ Map    │  (map / panels / boards)             │
│ ATC    │                                      │
│ Cargo  │                                      │
│ Airport│                                      │
│ Boards │                                      │
│ Stats  │                                      │
└────────┴─────────────────────────────────────┘
```

**TopBar:** Displays `currentSimSecond` mapped to a "time of day" (0=06:00, 1800=22:00), total flight count (fetched once), speed buttons (1×, 2×, Pause).

**Sidebar:** Navigation links — each sets `activeModule` state in App. Icons + labels, light grey bg, subtle hover. Active item has left accent border.

**App.jsx:** Holds `activeModule` state, renders Shell → conditionally renders the active module component.

**Styling:** Tailwind utility classes. Light theme — white bg, grey-50 sidebar, grey-200 borders. Inter font from Google Fonts (add `<link>` in `index.html`).

Commit: `git commit -m "feat: add layout shell with sidebar and top bar"`

---

## Task 13: SVG Airport Map

**Files:**
- Create: `src/components/Map/AirportMap.jsx`, `src/components/Map/mapConfig.js`

This is the hero component. viewBox: `0 0 1000 700`.

**mapConfig.js** — defines all static geometry:

```js
export const MAP_CONFIG = {
  viewBox: '0 0 1000 700',

  runways: [
    { id: 1, name: '09L/27R', x1: 50, y1: 150, x2: 350, y2: 150 },
    { id: 2, name: '09R/27L', x1: 50, y1: 550, x2: 350, y2: 550 },
  ],

  passengerTerminal: {
    id: 1, x: 500, y: 200, width: 300, height: 120,
    label: 'Passenger Terminal'
  },

  cargoTerminal: {
    id: 2, x: 500, y: 480, width: 200, height: 80,
    label: 'Cargo Terminal'
  },

  controlTower: { x: 420, y: 350, size: 30 },

  gates: [
    // 14 gates along passenger terminal edges
    { id: 1, label: 'A1', x: 510, y: 190, maxSize: 3 },
    { id: 2, label: 'A2', x: 550, y: 190, maxSize: 3 },
    // ... etc, positioned around terminal perimeter
  ],

  cargoBays: [
    // 6 bays along cargo terminal
    { id: 1, label: 'C1', x: 510, y: 470, maxSize: 4 },
    // ... etc
  ],

  taxiways: [
    // Paths from runway endpoints to terminal areas
    // Array of {x, y} waypoints for interpolation
    { from: 'runway1', to: 'passengerTerminal', points: [...] },
    { from: 'runway2', to: 'cargoTerminal', points: [...] },
  ],
};
```

**AirportMap.jsx** — renders the SVG:

- Grey background rect
- Runways as white/light-grey rectangles with dashed center lines
- Terminal buildings as darker grey rounded rectangles
- Gates as small circles along terminal edges
- Cargo bays as small squares
- Control tower as a distinctive shape (circle with dot)
- Taxiway paths as thin grey lines connecting runways to terminals
- Labels for everything

Each element gets `onClick` handlers that set `selectedItem` state (which triggers the right panel to open).

Aircraft icons are rendered separately (Task 14) — they overlay on top.

Commit: `git commit -m "feat: add SVG airport map with all static elements"`

---

## Task 14: Simulation Engine + Aircraft Animation

**Files:**
- Create: `src/hooks/useSimulation.js`, `src/utils/interpolation.js`, `src/components/Map/AircraftIcon.jsx`

**useSimulation.js** — the core simulation hook:

```js
export function useSimulation() {
  const [simSecond, setSimSecond] = useState(0);
  const [speed, setSpeed] = useState(1); // 0=pause, 1=normal, 2=fast
  const [flights, setFlights] = useState([]);

  // Advance sim clock
  useEffect(() => {
    if (speed === 0) return;
    const interval = setInterval(() => {
      setSimSecond(prev => Math.min(prev + speed, 1800));
    }, 1000);
    return () => clearInterval(interval);
  }, [speed]);

  // Poll API for active flights
  useEffect(() => {
    const fetchFlights = async () => {
      const res = await fetch(`/api/map?sec=${simSecond}`);
      const data = await res.json();
      setFlights(data);
    };
    fetchFlights();
    const interval = setInterval(fetchFlights, 2000); // poll every 2s
    return () => clearInterval(interval);
  }, [simSecond]);

  return { simSecond, speed, setSpeed, flights, setSimSecond };
}
```

**interpolation.js** — computes aircraft position from sim clock:

```js
export function getAircraftPosition(flight, simSecond, mapConfig) {
  const { sim_arrival_sec, sim_gate_in_sec, sim_gate_out_sec, sim_departure_sec } = flight;

  if (simSecond < sim_arrival_sec || simSecond > sim_departure_sec) {
    return null; // not visible
  }

  if (simSecond <= sim_gate_in_sec) {
    // Arriving: interpolate runway → taxiway → gate
    const t = (simSecond - sim_arrival_sec) / (sim_gate_in_sec - sim_arrival_sec);
    return interpolateAlongPath(runwayToGatePath(flight, mapConfig), t);
  }

  if (simSecond <= sim_gate_out_sec) {
    // At gate: static position
    return { x: flight.gate_x || flight.bay_x, y: flight.gate_y || flight.bay_y };
  }

  // Departing: interpolate gate → taxiway → runway
  const t = (simSecond - sim_gate_out_sec) / (sim_departure_sec - sim_gate_out_sec);
  return interpolateAlongPath(gateToRunwayPath(flight, mapConfig), t);
}

function interpolateAlongPath(points, t) {
  // Linear interpolation along a polyline path
  const clampedT = Math.max(0, Math.min(1, t));
  // ... compute total path length, find segment, lerp
}
```

**AircraftIcon.jsx** — SVG aircraft icon:

- Small airplane shape (rotated based on heading)
- Colored by status: green=on-time, amber=delayed, red=conflict
- `onClick` opens flight detail panel
- Smooth CSS transitions for position changes
- Tooltip on hover with flight number

**getFlightStatus(flight, simSecond)** — derives status from clock:

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

Commit: `git commit -m "feat: add simulation engine with aircraft animation"`

---

## Task 15: Flight Detail Drawer

**Files:**
- Create: `src/components/Panels/FlightDetail.jsx`

Slide-in drawer from the right when an aircraft or gate is clicked.

**Data:** Fetch from `/api/flight/:id` — returns flight + airline + aircraft type + gate + service logs.

**Content:**
- Header: flight number + airline logo placeholder + status badge
- Details grid: origin → destination, aircraft type, tail number, gate label
- Passenger count (or cargo shipments for cargo flights)
- Service log table: type, quantity, charge
- **Action buttons:**
  - "Assign Equipment" → dropdown of available equipment → POST `/api/assign-equipment`
  - "Generate Summary" → POST `/api/generate-summary` → show returned charges
  - "Delay Flight" → number input (seconds) → POST `/api/delay-flight` → shows cascade result
- Close button

**Styling:** White bg, grey border-left, slide animation with Tailwind `transition-transform`.

Commit: `git commit -m "feat: add flight detail drawer with action buttons"`

---

## Task 16: ATC Tower Console

**Files:**
- Create: `src/components/Panels/ATCConsole.jsx`

Fetches from `/api/atc`.

**Layout:** Three columns (or stacked on narrow screens):
1. **Inbound Queue** — flights with status Inbound/Landing, sorted by sim_arrival_sec
2. **On Ground** — flights Taxiing/At_Gate/Boarding
3. **Departure Queue** — flights in Pushback, sorted by sim_departure_sec

**Event Log Feed:** Below the queues — scrollable list of recent EventLog entries showing status transitions with timestamps. Auto-refreshes.

Each flight row: flight number, airline, aircraft type, sim time, status badge.

Commit: `git commit -m "feat: add ATC tower console"`

---

## Task 17: Cargo Module

**Files:**
- Create: `src/components/Panels/CargoModule.jsx`

Fetches from `/api/cargo`.

**Layout:**
- Grid of 6 cargo bay cards — each shows bay label, size category, current flight (if any)
- Below: shipment table — shipment ID, flight, weight, cargo type, handling status
- Status badges colored: Received (grey), In_Bay (blue), Loaded (green), Cleared (dark)

Commit: `git commit -m "feat: add cargo module"`

---

## Task 18: Airport Panel

**Files:**
- Create: `src/components/Panels/AirportPanel.jsx`

Fetches from `/api/airport`.

**Content:**
- Terminal summary cards (name, type, gate/bay count)
- Runway cards with utilization % bars (from `fn_runway_utilization`)
- Capacity stats: free gates (from `fn_free_gates`), free bays, total flights today
- Simple, clean stat cards with Tailwind

Commit: `git commit -m "feat: add airport overview panel"`

---

## Task 19: Arrivals/Departures Boards

**Files:**
- Create: `src/components/Panels/BoardsPanel.jsx`

Fetches from `/api/boards`.

**Layout:** Classic airport FIDS-style boards — two tabs (Arrivals / Departures).

Table columns:
- Arrivals: Flight #, Origin, Scheduled (sim time mapped to clock), Status, Gate
- Departures: Flight #, Destination, Scheduled, Status, Gate

Status uses colored badges. Sort by time. Auto-refreshes with sim clock.

Commit: `git commit -m "feat: add arrivals/departures boards"`

---

## Task 20: Analytics Dashboard

**Files:**
- Create: `src/components/Panels/AnalyticsDashboard.jsx`

Uses the correlated/nested queries from blueprint Section 13.5. Create a new API endpoint or extend `/api/airport` with query params.

**Cards/tables:**
1. **Bottleneck Flights** — flights whose turnaround exceeded their airline's average (correlated subquery)
2. **Under-used Large Gates** — gates with max_size ≥ 4 that never hosted a large aircraft (nested query)
3. **Busiest Gates** — ranked by flight count
4. **Equipment Usage** — ranked by total assignment time
5. **Passenger Flow Peaks** — highest counts per terminal zone

Simple table display for each. This is mainly a rubric requirement (nested/correlated queries).

Commit: `git commit -m "feat: add analytics dashboard"`

---

## Task 21: Vercel Deployment

**Step 1:** Install Vercel CLI: `npm install -g vercel`

**Step 2:** Deploy: `vercel --prod`

**Step 3:** Set environment variables in Vercel dashboard (MYSQL_HOST, etc.)

**Step 4:** Verify: open deployed URL, check map loads, click panels work, simulation runs.

**Step 5:** Commit any deployment config changes.

---

## Task 22: Polish and EXPLAIN Optimization

**Step 1: EXPLAIN comparison**

Run `EXPLAIN` on the map query against raw joined tables:
```sql
EXPLAIN SELECT f.*, a.airline_name, g.map_x, g.map_y
FROM Flight f
JOIN Airline a ON a.airline_id = f.airline_id
LEFT JOIN Gate g ON g.gate_id = f.gate_id
WHERE f.sim_arrival_sec <= 500 AND f.sim_departure_sec >= 500;
```

Then the same against `live_map_cache`:
```sql
EXPLAIN SELECT * FROM live_map_cache
WHERE sim_arrival_sec <= 500 AND sim_departure_sec >= 500;
```

Save both outputs for the report — this is the optimization story.

**Step 2: Error handling**

- API endpoints: proper try/catch, meaningful error messages
- Front-end: loading states, error states for failed fetches
- Connection pooling: ensure pool doesn't leak

**Step 3: Speed controls**

Verify pause/1×/2× work smoothly. Add keyboard shortcuts (Space=pause, 1=normal, 2=fast).

**Step 4: Responsive check**

Test at common breakpoints. Sidebar collapses on mobile. Map scales with viewBox.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: polish, EXPLAIN optimization, error handling"
```

---

## Summary: Full Task List

| # | Task | Phase |
|---|------|-------|
| 1 | Scaffold Vite + React + Tailwind | 1 |
| 2 | Railway MySQL setup + connection | 1 |
| 3 | 17 database tables | 2 |
| 4 | Performance indexes | 2 |
| 5 | 4 triggers | 3 |
| 6 | 3 functions | 3 |
| 7 | 4 stored procedures | 3 |
| 8 | 2 views | 3 |
| 9 | Master DB setup script | 3 |
| 10 | Seed script (50-70 flights) | 4 |
| 11 | 9 API endpoints | 5 |
| 12 | Layout shell (sidebar + top bar) | 6 |
| 13 | SVG airport map | 7 |
| 14 | Simulation engine + animation | 8 |
| 15 | Flight detail drawer | 9 |
| 16 | ATC tower console | 9 |
| 17 | Cargo module | 9 |
| 18 | Airport panel | 9 |
| 19 | Arrivals/departures boards | 9 |
| 20 | Analytics dashboard | 10 |
| 21 | Vercel deployment | 11 |
| 22 | Polish + EXPLAIN optimization | 11 |

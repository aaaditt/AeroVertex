// ── Speed weights per segment ───────────────────────────────────────
// Higher = covers that segment faster. Ratio between max and min
// determines the visual speed contrast across the path.
//
// Arrival (10 pts → 9 segs) — east-to-west landing, then loop back east
// around the concourse via the east spine:
//   [0] high-altitude descent       [1] final approach flare to touchdown
//   [2] high-speed roll (touch→mid) [3] braking roll (mid→far exit)
//   [4] exit south onto TWY A        [5] taxi east along TWY A
//   [6] south down east spine       [7] west along mid-pax / cargo twy
//   [8] gate creep
const ARRIVAL_W  = [42, 22, 18, 9, 4, 3, 2.5, 1.8, 0.4]

// Departure (9 pts → 8 segs) — full-runway takeoff using rwy 09R/27L:
//   [0] pushback (slow)             [1] turn onto mid-pax taxiway
//   [2] taxi west to spine          [3] spine taxi south to threshold
//   [4] hold-short at threshold     [5] takeoff roll (full runway)
//   [6] rotation + initial climb    [7] climb-out off-screen east
const DEPART_W = [0.25, 0.55, 1.6, 2.2, 0.15, 14, 22, 36]

// ── Position computation ────────────────────────────────────────────

export function getAircraftPosition(flight, simSecond) {
  const { sim_arrival_sec, sim_gate_in_sec, sim_gate_out_sec, sim_departure_sec } = flight
  const destX  = flight.gate_x ?? flight.bay_x
  const destY  = flight.gate_y ?? flight.bay_y
  const isCargo = flight.bay_x != null

  if (simSecond < sim_arrival_sec || simSecond > sim_departure_sec) return null

  // ── Arriving ──
  if (simSecond <= sim_gate_in_sec) {
    const dur = sim_gate_in_sec - sim_arrival_sec
    if (dur <= 0) return { x: destX, y: destY, heading: 0 }
    const t = (simSecond - sim_arrival_sec) / dur
    return interpolateWeighted(buildArrivalPath(destX, destY, isCargo), t, ARRIVAL_W)
  }

  // ── At gate ──
  if (simSecond <= sim_gate_out_sec) {
    return { x: destX, y: destY, heading: 0 }
  }

  // ── Departing ──
  const dur = sim_departure_sec - sim_gate_out_sec
  if (dur <= 0) return null
  const t = (simSecond - sim_gate_out_sec) / dur
  const path = buildDeparturePath(destX, destY, isCargo)
  const result = interpolateWeighted(path, t, DEPART_W)

  // Pushback: plane faces FORWARD while being towed BACKWARD (seg 0)
  if (result.seg === 0) result.heading += 180

  return result
}

// ── Path builders ───────────────────────────────────────────────────

// ── Arrival: east-to-west landing, loop back east around concourse ──
// Geometry reference (from AirportMap.jsx):
//   RWY1 (09L/27R, arrivals) at y=82, runway extents x=50..950
//   Arrival taxiway (TWY A) at y=130, runs full width
//   Terminal Concourse A occupies x≈60..660, y≈162..238 (gates A1..A5 hang south)
//   East spine x=800 — clears the concourse east end, west spine x=200 cuts through it
//   Mid-pax taxiway at y=358, cargo taxiway at y=430
//
// Physics narrative: plane descends from off-screen east, flares over
// the FAR threshold (x=900), touches down, decelerates across ~78% of
// the runway, exits south at the WEST end. To avoid threading through
// the concourse footprint, it then taxis east along TWY A back to the
// EAST spine, descends to the mid-pax taxiway, and approaches the gate
// from the east side. Resulting path looks like a backward "C" around
// the terminal.
function buildArrivalPath(gx, gy, isCargo) {
  const midY = isCargo ? 430 : 358
  return [
    { x: 1250, y: 30 },   // 0: high-altitude descent, far off-screen east
    { x: 1020, y: 60 },   // 1: descending through MVA, on final approach
    { x: 900,  y: 82 },   // 2: touchdown — near east threshold of RWY 1
    { x: 500,  y: 82 },   // 3: high-speed roll across middle of runway
    { x: 200,  y: 82 },   // 4: braked, near west threshold — about to exit
    { x: 200,  y: 130 },  // 5: rapid-exit south onto TWY A
    { x: 800,  y: 130 },  // 6: taxi east along TWY A back to east spine
    { x: 800,  y: midY }, // 7: south down east spine to mid-pax twy
    { x: gx,   y: midY }, // 8: west along mid-pax / cargo twy to gate column
    { x: gx,   y: gy },   // 9: creep north into gate stand
  ]
}

// ── Departure: full-runway takeoff to the east ──────────────────────
// Physics narrative: pushback from gate, taxi west to west spine, south
// to runway 2 (y=572) at the WEST threshold (x≈100), hold short briefly,
// then accelerate eastward across the FULL runway, rotate near x=850,
// climb out off-screen east.
function buildDeparturePath(gx, gy, isCargo) {
  const midY = isCargo ? 430 : 358
  const pushY = Math.min(gy + 28, midY - 8)
  return [
    { x: gx,      y: gy },     // 0: at gate
    { x: gx,      y: pushY },  // 1: tug pushback (south)
    { x: gx - 18, y: midY },   // 2: pivot onto mid-pax/cargo taxiway
    { x: 200,     y: midY },   // 3: taxi west along mid-pax
    { x: 200,     y: 572 },    // 4: south down west spine to rwy 2 threshold
    { x: 100,     y: 572 },    // 5: align with runway threshold (west end)
    { x: 130,     y: 572 },    // 6: hold-short pause (low weight on this short seg)
    { x: 850,     y: 572 },    // 7: takeoff roll — accelerates across full runway
    { x: 1100,    y: 500 },    // 8: rotation + climb-out, off-screen east
  ]
}

// ── Weighted interpolation engine ───────────────────────────────────

function lerp(a, b, t) { return a + (b - a) * t }

function segDist(a, b) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

function buildCumulative(pts, weights) {
  const costs = []
  for (let i = 0; i < pts.length - 1; i++) {
    costs.push(segDist(pts[i], pts[i + 1]) / Math.max(weights[i] ?? 1, 0.01))
  }
  const total = costs.reduce((a, b) => a + b, 0)
  const cum = [0]
  let run = 0
  for (const c of costs) { run += c / total; cum.push(Math.min(run, 1)) }
  return cum
}

function interpolateWeighted(pts, t, weights) {
  const cl = Math.max(0, Math.min(1, t))
  const cum = buildCumulative(pts, weights)
  const segs = pts.length - 1

  let i = segs - 1
  for (let s = 0; s < segs; s++) {
    if (cl <= cum[s + 1]) { i = s; break }
  }

  const span = cum[i + 1] - cum[i]
  const segT = span > 0 ? Math.max(0, Math.min(1, (cl - cum[i]) / span)) : 0

  const x = lerp(pts[i].x, pts[i + 1].x, segT)
  const y = lerp(pts[i].y, pts[i + 1].y, segT)

  const aT = Math.min(segT + 0.015, 1)
  const nx = lerp(pts[i].x, pts[i + 1].x, aT)
  const ny = lerp(pts[i].y, pts[i + 1].y, aT)
  const heading = Math.atan2(ny - y, nx - x) * 180 / Math.PI + 90

  return { x, y, heading, seg: i }
}

// ── Status derivation ───────────────────────────────────────────────

export function getFlightStatus(flight, simSecond) {
  if (flight.status === 'Cancelled') return 'Cancelled'
  if (flight.delay_seconds > 0) return 'Delayed'
  if (simSecond < flight.sim_arrival_sec) return 'Scheduled'
  if (simSecond < flight.sim_gate_in_sec) return 'Taxiing'
  if (simSecond < flight.sim_gate_out_sec) return 'At_Gate'
  if (simSecond < flight.sim_departure_sec) return 'Pushback'
  return 'Departed'
}

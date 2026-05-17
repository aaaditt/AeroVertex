// ── Speed weights per segment ───────────────────────────────────────
// Higher = covers that segment faster. Ratio between max and min
// determines the visual speed contrast.
//
// Arrival (7 pts → 6 segs):
//   [0] descent approach   [1] final approach   [2] runway roll
//   [3] spine taxi          [4] horiz taxi       [5] gate creep
const ARRIVAL_W  = [28, 16, 9, 2.2, 1.6, 0.3]

// Departure (7 pts → 6 segs):
//   [0] pushback   [1] turn onto taxi   [2] horiz taxi
//   [3] spine taxi [4] runway accel     [5] liftoff climb
const DEPART_W = [0.25, 0.5, 1.4, 2.0, 11, 28]

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

function buildArrivalPath(gx, gy, isCargo) {
  const midY = isCargo ? 420 : 350
  return [
    { x: 1250, y: 55 },   // high altitude, far off-screen
    { x: 1060, y: 125 },  // on final, descending to runway
    { x: 950,  y: 140 },  // touchdown
    { x: 800,  y: 140 },  // end of roll → exit onto spine
    { x: 800,  y: midY }, // south along east spine
    { x: gx,   y: midY }, // west along horizontal taxiway
    { x: gx,   y: gy },   // creep north into gate stand
  ]
}

function buildDeparturePath(gx, gy, isCargo) {
  const midY = isCargo ? 420 : 350
  const pushY = Math.min(gy + 28, midY - 8)
  return [
    { x: gx,      y: gy },     // at gate
    { x: gx,      y: pushY },  // tug pushback (south)
    { x: gx - 18, y: midY },   // pivot onto taxiway
    { x: 200,     y: midY },   // west along horizontal
    { x: 200,     y: 560 },    // south down west spine to rwy 2
    { x: 50,      y: 560 },    // runway roll (accelerating)
    { x: -150,    y: 500 },    // climb-out, off-screen
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

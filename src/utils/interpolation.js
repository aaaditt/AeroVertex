export function getAircraftPosition(flight, simSecond) {
  const { sim_arrival_sec, sim_gate_in_sec, sim_gate_out_sec, sim_departure_sec } = flight
  const destX = flight.gate_x ?? flight.bay_x
  const destY = flight.gate_y ?? flight.bay_y
  const isCargo = flight.bay_x != null

  if (simSecond < sim_arrival_sec || simSecond > sim_departure_sec) return null

  if (simSecond <= sim_gate_in_sec) {
    const path = buildArrivalPath(destX, destY, isCargo)
    const t = (simSecond - sim_arrival_sec) / (sim_gate_in_sec - sim_arrival_sec)
    return interpolatePath(path, t)
  }
  if (simSecond <= sim_gate_out_sec) {
    return { x: destX, y: destY, heading: 0 }
  }
  const path = buildDeparturePath(destX, destY, isCargo)
  const t = (simSecond - sim_gate_out_sec) / (sim_departure_sec - sim_gate_out_sec)
  return interpolatePath(path, t)
}

function buildArrivalPath(gx, gy, isCargo) {
  const midY = isCargo ? 420 : 350
  return [
    { x: 950, y: 140 },
    { x: 800, y: 140 },
    { x: 800, y: midY },
    { x: gx,  y: midY },
    { x: gx,  y: gy },
  ]
}

function buildDeparturePath(gx, gy, isCargo) {
  const midY = isCargo ? 420 : 350
  return [
    { x: gx,  y: gy },
    { x: gx,  y: midY },
    { x: 200, y: midY },
    { x: 200, y: 560 },
    { x: 50,  y: 560 },
  ]
}

function lerp(a, b, t) { return a + (b - a) * t }

function interpolatePath(pts, t) {
  const clamped = Math.max(0, Math.min(1, t))
  const segs = pts.length - 1
  const scaled = clamped * segs
  const i = Math.min(Math.floor(scaled), segs - 1)
  const segT = scaled - i
  const x = lerp(pts[i].x, pts[i + 1].x, segT)
  const y = lerp(pts[i].y, pts[i + 1].y, segT)
  const nx = lerp(pts[i].x, pts[i + 1].x, Math.min(segT + 0.02, 1))
  const ny = lerp(pts[i].y, pts[i + 1].y, Math.min(segT + 0.02, 1))
  const heading = Math.atan2(ny - y, nx - x) * 180 / Math.PI + 90
  return { x, y, heading }
}

export function getFlightStatus(flight, simSecond) {
  if (flight.status === 'Cancelled') return 'Cancelled'
  if (flight.delay_seconds > 0) return 'Delayed'
  if (simSecond < flight.sim_arrival_sec) return 'Scheduled'
  if (simSecond < flight.sim_gate_in_sec) return 'Taxiing'
  if (simSecond < flight.sim_gate_out_sec) return 'At_Gate'
  if (simSecond < flight.sim_departure_sec) return 'Pushback'
  return 'Departed'
}

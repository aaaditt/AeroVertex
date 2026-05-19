import { useRef, useEffect } from 'react'
import { getAircraftPosition, getFlightStatus } from '../../utils/interpolation'
import AircraftIcon from './AircraftIcon'

const SAFE_DIST = 34          // min px between any two planes (generic collision)

// Runway 2 (departures) is at y=572. A plane is "on the runway" when its
// computed y is within this band — anywhere along the strip x=40..960.
const RWY2_Y_MIN = 555
const RWY2_Y_MAX = 590

// Hold line: y-coordinate on the west spine where queued departures must
// stop while the runway is occupied. Far enough north of the runway curve
// (which starts at y=558) that planes visibly stack on the straight
// vertical taxiway, not in the curve.
const HOLD_LINE_Y = 545

// Min spacing between queued planes nose-to-tail on the spine.
const QUEUE_GAP = 36

export default function AircraftLayer({ flights, simRef, onSelectFlight }) {
  const elMapRef     = useRef(new Map())
  const flightMapRef = useRef(new Map())
  const holdRef      = useRef(new Map())   // flightId → seconds of hold
  const lastTsRef    = useRef(null)

  useEffect(() => {
    const m = new Map()
    flights.forEach(f => m.set(f.flight_id ?? f.id, f))
    flightMapRef.current = m
  }, [flights])

  useEffect(() => {
    let rafId

    function frame(ts) {
      const dt = lastTsRef.current != null ? (ts - lastTsRef.current) / 1000 : 0
      lastTsRef.current = ts
      const sec = simRef.current

      // ── Phase 1: compute raw positions with per-plane hold ──
      const live = new Map()

      elMapRef.current.forEach((el, id) => {
        const flight = flightMapRef.current.get(id)
        if (!flight) return

        const hold = holdRef.current.get(id) || 0
        const adjSec = sec - hold
        const pos = getAircraftPosition(flight, adjSec)

        if (!pos) {
          el.setAttribute('display', 'none')
          // Decay hold even when invisible so plane doesn't get stuck
          if (hold > 0) holdRef.current.set(id, Math.max(0, hold - dt * 0.3))
          return
        }

        el.removeAttribute('display')
        live.set(id, { ...pos, flight, hold })
      })

      // ── Phase 1.5: runway is a SINGLE EXCLUSIVE LOCK ──
      //
      // Rule: at most ONE departing plane may occupy the runway strip
      // (y ∈ [555, 590], anywhere x). All other departing planes that are
      // approaching the runway must hold on the west spine taxiway at
      // y ≤ HOLD_LINE_Y until the strip is completely clear.
      //
      // When the runway clears, the earliest-pushback queued plane
      // releases first. Behind it on the spine, queued planes stack
      // nose-to-tail with QUEUE_GAP spacing.

      // Find every departing plane and classify it.
      const onRunwayPlanes = []      // currently on the runway strip
      const approachPlanes = []      // departing, past mid-pax, headed to runway
      live.forEach((pos, id) => {
        const f = pos.flight
        if (sec < f.sim_gate_out_sec || sec > f.sim_departure_sec) return

        const { x, y } = pos
        const onRunway = y >= RWY2_Y_MIN && y <= RWY2_Y_MAX && x >= 40 && x <= 960
        if (onRunway) {
          onRunwayPlanes.push({ id, pos, flight: f })
        } else if (x >= 180 && x <= 220 && y >= 360 && y < RWY2_Y_MIN) {
          // On the west spine, descending toward the runway
          approachPlanes.push({ id, pos, flight: f })
        }
      })

      const queueHeld = new Set()

      // Sort approach planes by pushback time (earliest = front of queue).
      approachPlanes.sort((a, b) =>
        a.flight.sim_gate_out_sec - b.flight.sim_gate_out_sec
      )

      // The runway is occupied if anyone is on the strip.
      const runwayOccupied = onRunwayPlanes.length > 0

      // For each approaching plane, decide what its allowed Y-position is:
      //   - Front of queue (idx 0): may proceed to runway IFF runway is clear.
      //                             If runway occupied, hold at HOLD_LINE_Y.
      //   - Follower (idx >= 1): hold at HOLD_LINE_Y - idx * QUEUE_GAP
      //                          (behind the plane in front of it on the spine)
      for (let idx = 0; idx < approachPlanes.length; idx++) {
        const p = approachPlanes[idx]
        let maxAllowedY

        if (idx === 0) {
          // Front of queue
          maxAllowedY = runwayOccupied ? HOLD_LINE_Y : Infinity
        } else {
          // Followers always stack behind the queue head with proper spacing
          maxAllowedY = HOLD_LINE_Y - idx * QUEUE_GAP
        }

        // If natural y is past the allowed line, freeze the plane in place
        // by bumping its hold (perceived sim time pauses).
        if (p.pos.y > maxAllowedY) {
          const cur = holdRef.current.get(p.id) || 0
          holdRef.current.set(p.id, cur + dt * 1.0)
          queueHeld.add(p.id)
        }
      }

      // ── Phase 2: generic collision-avoidance for any remaining overlaps ──
      // Skip pairs already handled by Phase 1.5 (queue planes hold themselves).
      const arr = [...live.entries()]
      const conflicted = new Set(queueHeld)  // queue-held planes count as conflicted

      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const [idA, a] = arr[i]
          const [idB, b] = arr[j]
          // If both are queue-held, skip — they're already being managed.
          if (queueHeld.has(idA) && queueHeld.has(idB)) continue
          const dist = Math.hypot(a.x - b.x, a.y - b.y)

          if (dist < SAFE_DIST) {
            // The plane that arrived later (or has less progress) yields
            const progA = sec - a.flight.sim_arrival_sec
            const progB = sec - b.flight.sim_arrival_sec
            const yieldId = progA < progB ? idA : idB
            conflicted.add(yieldId)

            const cur = holdRef.current.get(yieldId) || 0
            holdRef.current.set(yieldId, cur + dt * 1.8)
          }
        }
      }

      // Gradually release hold for non-conflicted planes (lets queue followers
      // catch up smoothly when the leader moves ahead and gap re-opens).
      holdRef.current.forEach((hold, id) => {
        if (hold > 0 && !conflicted.has(id)) {
          holdRef.current.set(id, Math.max(0, hold - dt * 0.4))
        }
      })

      // ── Phase 3: apply transforms + status colours ──
      live.forEach((pos, id) => {
        const el = elMapRef.current.get(id)
        if (!el) return

        el.setAttribute('transform', `translate(${pos.x},${pos.y}) rotate(${pos.heading})`)

        const status = getFlightStatus(pos.flight, sec)
        const color = status === 'Delayed'   ? '#8b6914'
                    : status === 'Cancelled' ? '#993333'
                    : '#2d2d2d'

        el.querySelectorAll('[data-plane]').forEach(s => {
          s.setAttribute('fill', color)
        })
        const label = el.querySelector('[data-label]')
        if (label) label.setAttribute('fill', color)
      })

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [simRef])

  return (
    <>
      {flights.map(f => {
        const id = f.flight_id ?? f.id
        const label = f.flight_number ?? f.callsign ?? ''
        return (
          <AircraftIcon
            key={id}
            ref={el => {
              if (el) elMapRef.current.set(id, el)
              else elMapRef.current.delete(id)
            }}
            callsign={label}
            onClick={() => onSelectFlight?.(id)}
          />
        )
      })}
    </>
  )
}

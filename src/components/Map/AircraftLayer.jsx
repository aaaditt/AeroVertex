import { useRef, useEffect } from 'react'
import { getAircraftPosition, getFlightStatus } from '../../utils/interpolation'
import AircraftIcon from './AircraftIcon'

const SAFE_DIST = 34  // min px between any two planes

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

      // ── Phase 1: compute positions with per-plane hold ──
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

      // ── Phase 2: collision-avoidance hold adjustments ──
      const arr = [...live.entries()]
      const conflicted = new Set()

      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const [idA, a] = arr[i]
          const [idB, b] = arr[j]
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

      // Gradually release hold for non-conflicted planes
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

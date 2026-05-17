import { useRef, useEffect } from 'react'
import { getAircraftPosition, getFlightStatus } from '../../utils/interpolation'
import AircraftIcon from './AircraftIcon'

export default function AircraftLayer({ flights, simRef, onSelectFlight }) {
  // flightId → { ref: { current: null }, flight }
  // Plain object refs work — React sets ref.current = domNode on mount.
  const iconRefsRef = useRef({})

  // Keep flight data current without remounting icons
  useEffect(() => {
    const prev = iconRefsRef.current
    const next = {}
    flights.forEach(f => {
      const id = f.flight_id ?? f.id
      next[id] = prev[id]
        ? { ref: prev[id].ref, flight: f }
        : { ref: { current: null }, flight: f }
    })
    iconRefsRef.current = next
  }, [flights])

  // RAF loop: 60fps position writes — never triggers a React re-render
  useEffect(() => {
    let rafId
    function frame() {
      const sec = simRef.current
      const entries = iconRefsRef.current
      for (const id in entries) {
        const { ref, flight } = entries[id]
        const el = ref.current
        if (!el) continue
        const pos = getAircraftPosition(flight, sec)
        if (!pos) {
          el.setAttribute('display', 'none')
        } else {
          el.removeAttribute('display')
          el.setAttribute('transform', `translate(${pos.x},${pos.y}) rotate(${pos.heading})`)
        }
      }
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [simRef])

  return (
    <>
      {flights.map(f => {
        const id = f.flight_id ?? f.id
        // Lazy-create entry on first render before the effect has synced
        if (!iconRefsRef.current[id]) {
          iconRefsRef.current[id] = { ref: { current: null }, flight: f }
        }
        const entry = iconRefsRef.current[id]
        const status = getFlightStatus(f, simRef.current)
        const label = f.flight_number ?? f.callsign ?? ''
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

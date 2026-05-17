import { useRef, useEffect } from 'react'
import { getAircraftPosition, getFlightStatus } from '../../utils/interpolation'
import AircraftIcon from './AircraftIcon'

export default function AircraftLayer({ flights, simRef, onSelectFlight }) {
  const elMapRef = useRef(new Map())     // flightId → DOM <g> element
  const flightMapRef = useRef(new Map()) // flightId → flight data

  useEffect(() => {
    const m = new Map()
    flights.forEach(f => m.set(f.flight_id ?? f.id, f))
    flightMapRef.current = m
  }, [flights])

  useEffect(() => {
    let rafId
    function frame() {
      const sec = simRef.current
      elMapRef.current.forEach((el, id) => {
        const flight = flightMapRef.current.get(id)
        if (!flight) return
        const pos = getAircraftPosition(flight, sec)
        if (!pos) {
          el.setAttribute('display', 'none')
        } else {
          el.removeAttribute('display')
          el.setAttribute('transform', `translate(${pos.x},${pos.y}) rotate(${pos.heading})`)
        }
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
        const status = getFlightStatus(f, 0)
        const label = f.flight_number ?? f.callsign ?? ''
        return (
          <AircraftIcon
            key={id}
            ref={el => {
              if (el) elMapRef.current.set(id, el)
              else elMapRef.current.delete(id)
            }}
            status={status}
            callsign={label}
            onClick={() => onSelectFlight?.(id)}
          />
        )
      })}
    </>
  )
}

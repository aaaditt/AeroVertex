import { getAircraftPosition, getFlightStatus } from '../../utils/interpolation'
import AircraftIcon from './AircraftIcon'

export default function AircraftLayer({ flights, simSecond, onSelectFlight }) {
  return (
    <>
      {flights.map(flight => {
        const pos = getAircraftPosition(flight, simSecond)
        if (!pos) return null
        const status = getFlightStatus(flight, simSecond)
        // live_map_cache uses flight_id and flight_number (not id/callsign)
        const key = flight.flight_id ?? flight.id
        const label = flight.flight_number ?? flight.callsign ?? ''
        return (
          <AircraftIcon
            key={key}
            x={pos.x}
            y={pos.y}
            heading={pos.heading}
            status={status}
            callsign={label}
            onClick={() => onSelectFlight?.(key)}
          />
        )
      })}
    </>
  )
}

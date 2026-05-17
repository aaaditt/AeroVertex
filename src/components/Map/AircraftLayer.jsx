import { getAircraftPosition, getFlightStatus } from '../../utils/interpolation'
import AircraftIcon from './AircraftIcon'

export default function AircraftLayer({ flights, simSecond }) {
  return (
    <>
      {flights.map(flight => {
        const pos = getAircraftPosition(flight, simSecond)
        if (!pos) return null
        const status = getFlightStatus(flight, simSecond)
        return (
          <AircraftIcon
            key={flight.id}
            x={pos.x}
            y={pos.y}
            heading={pos.heading}
            status={status}
            callsign={flight.callsign}
          />
        )
      })}
    </>
  )
}

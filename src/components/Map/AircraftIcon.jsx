import { forwardRef } from 'react'

const STATUS_COLORS = {
  Delayed:   '#d35400',
  Cancelled: '#c0392b',
}

const AircraftIcon = forwardRef(function AircraftIcon({ status, callsign, onClick }, ref) {
  const color = STATUS_COLORS[status] ?? '#e67e22'
  return (
    <g ref={ref} style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <ellipse cx={0} cy={0} rx={5} ry={12} fill={color} opacity={0.95} />
      <polygon points="-14,4 14,4 8,-2 -8,-2" fill={color} opacity={0.85} />
      <polygon points="-5,10 5,10 3,14 -3,14" fill={color} opacity={0.85} />
      <text
        x={0}
        y={-16}
        textAnchor="middle"
        fill={color}
        fontSize={7}
        fontFamily="monospace"
        letterSpacing={0.5}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {callsign}
      </text>
    </g>
  )
})

export default AircraftIcon

const STATUS_COLORS = {
  At_Gate: '#3b82f6',
  Taxiing:  '#3b82f6',
  Pushback: '#3b82f6',
  Delayed:  '#f59e0b',
  Cancelled:'#ef4444',
  Scheduled:'#64748b',
  Departed: '#64748b',
}

export default function AircraftIcon({ x, y, heading, status, callsign, onClick }) {
  const color = STATUS_COLORS[status] ?? '#3b82f6'

  return (
    <g style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      {/* Rotated aircraft body centered at (x, y) */}
      <g transform={`translate(${x},${y}) rotate(${heading})`}>
        {/* Fuselage */}
        <ellipse cx={0} cy={0} rx={4} ry={9} fill={color} opacity={0.95} />
        {/* Wings */}
        <polygon points="0,-2 -13,4 0,1 13,4" fill={color} opacity={0.85} />
        {/* Tail */}
        <polygon points="0,7 -5,10 5,10" fill={color} opacity={0.85} />
        {/* Nose highlight */}
        <circle cx={0} cy={-9} r={1.5} fill="white" opacity={0.6} />
      </g>
      {/* Callsign label — always upright */}
      <text
        x={x}
        y={y - 14}
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
}

import { forwardRef } from 'react'

// Top-down aircraft silhouette, monochrome.
// x/y/heading are written via DOM setAttribute by AircraftLayer RAF loop.
// origin, destination shown as route label below the callsign.
const AircraftIcon = forwardRef(function AircraftIcon({ callsign, origin, destination, onClick }, ref) {
  const route = (origin && destination) ? `${origin}–${destination}` : ''
  return (
    <g ref={ref} style={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      {/* Fuselage */}
      <ellipse cx={0} cy={0} rx={3.5} ry={12}
        fill="#2d2d2d" data-plane="fuselage" />
      {/* Swept-back main wings */}
      <path d="M -2.5,-2 L -18,7 L -18,9.5 L -1,5 Z"
        fill="#333" opacity={0.9} data-plane="wing-l" />
      <path d="M 2.5,-2 L 18,7 L 18,9.5 L 1,5 Z"
        fill="#333" opacity={0.9} data-plane="wing-r" />
      {/* T-tail stabiliser */}
      <path d="M -1,8 L -8,14 L -8,15.5 L 0,12.5 L 8,15.5 L 8,14 L 1,8 Z"
        fill="#333" opacity={0.85} data-plane="tail" />
      {/* Nose highlight */}
      <ellipse cx={0} cy={-10} rx={1.5} ry={2.5}
        fill="#fff" opacity={0.4} data-plane="nose" />
      {/* Callsign */}
      <text x={0} y={-20}
        textAnchor="middle" fontSize={7}
        fontFamily="monospace" letterSpacing={0.5}
        fill="#333" fontWeight={600}
        data-label="true"
        style={{ pointerEvents: 'none', userSelect: 'none' }}>
        {callsign}
      </text>
      {/* Route — origin–destination */}
      {route && (
        <text x={0} y={-11}
          textAnchor="middle" fontSize={6}
          fontFamily="monospace" letterSpacing={0.3}
          fill="#555"
          style={{ pointerEvents: 'none', userSelect: 'none' }}>
          {route}
        </text>
      )}
    </g>
  )
})

export default AircraftIcon

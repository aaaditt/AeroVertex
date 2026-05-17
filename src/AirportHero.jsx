import { useEffect, useRef, useState } from 'react'

// Static airport layout — mirrors what the DB schema would store
// (map_x/y coordinates normalised to a 1000×700 canvas)
const LAYOUT = {
  runways: [
    { id: 'R1', name: '27L/09R', x1: 30,  y1: 120, x2: 970, y2: 120 },
    { id: 'R2', name: '27R/09L', x1: 30,  y1: 580, x2: 970, y2: 580 },
  ],
  taxiways: [
    // main spine connecting both runways
    { id: 'T1', x1: 200, y1: 120, x2: 200, y2: 580 },
    { id: 'T2', x1: 500, y1: 120, x2: 500, y2: 580 },
    { id: 'T3', x1: 800, y1: 120, x2: 800, y2: 580 },
    // mid horizontal connector
    { id: 'T4', x1: 200, y1: 350, x2: 800, y2: 350 },
    // apron leads
    { id: 'T5', x1: 280, y1: 200, x2: 280, y2: 350 },
    { id: 'T6', x1: 430, y1: 200, x2: 430, y2: 350 },
    { id: 'T7', x1: 580, y1: 200, x2: 580, y2: 350 },
    { id: 'T8', x1: 720, y1: 200, x2: 720, y2: 350 },
  ],
  terminals: [
    { id: 'T-A', name: 'Terminal A', x: 260, y: 270, w: 340, h: 80, type: 'Domestic' },
    { id: 'T-B', name: 'Terminal B', x: 620, y: 270, w: 240, h: 80, type: 'International' },
  ],
  gates: [
    // Terminal A gates
    { id: 'A1', label: 'A1', x: 285, y: 240 },
    { id: 'A2', label: 'A2', x: 335, y: 240 },
    { id: 'A3', label: 'A3', x: 385, y: 240 },
    { id: 'A4', label: 'A4', x: 435, y: 240 },
    { id: 'A5', label: 'A5', x: 485, y: 240 },
    { id: 'A6', label: 'A6', x: 535, y: 240 },
    // Terminal B gates
    { id: 'B1', label: 'B1', x: 635, y: 240 },
    { id: 'B2', label: 'B2', x: 685, y: 240 },
    { id: 'B3', label: 'B3', x: 735, y: 240 },
    { id: 'B4', label: 'B4', x: 785, y: 240 },
  ],
  cargoBays: [
    { id: 'C1', label: 'C1', x: 140, y: 440, w: 60, h: 50 },
    { id: 'C2', label: 'C2', x: 220, y: 440, w: 60, h: 50 },
    { id: 'C3', label: 'C3', x: 300, y: 440, w: 60, h: 50 },
  ],
  constructionZones: [
    { x: 820, y: 270, w: 120, h: 100, label: 'Terminal C\n(Under Construction)' },
    { x: 380, y: 440, w: 180, h: 80,  label: 'Expansion\n(Planned)' },
  ],
}

// Taxi path steps: array of {x,y} waypoints
function buildArrivalPath(gate) {
  // Land on R1 from east → taxi south on T3 → west on T4 → north apron to gate
  const apronX = gate.x
  return [
    { x: 970, y: 120 },   // touchdown
    { x: 800, y: 120 },   // slow roll
    { x: 800, y: 350 },   // T3 south
    { x: apronX, y: 350 }, // T4 west
    { x: apronX, y: gate.y + 20 }, // apron north
    { x: gate.x, y: gate.y },      // at gate
  ]
}

function buildDeparturePath(gate) {
  return [
    { x: gate.x, y: gate.y },
    { x: gate.x, y: gate.y + 20 },
    { x: gate.x, y: 350 },
    { x: 200, y: 350 },
    { x: 200, y: 580 },   // T1 south to R2
    { x: 30,  y: 580 },   // line up
  ]
}

const FLIGHTS = [
  { id: 1, callsign: 'AV101', airline: 'AeroVia',    gateId: 'A2', color: '#3b82f6', phase: 'arriving',   delayMs: 0    },
  { id: 2, callsign: 'SK202', airline: 'SkyKing',    gateId: 'B1', color: '#f59e0b', phase: 'arriving',   delayMs: 4000 },
  { id: 3, callsign: 'GT303', airline: 'GulfTrans',  gateId: 'A5', color: '#10b981', phase: 'departing',  delayMs: 2000 },
  { id: 4, callsign: 'CX404', airline: 'CargoXL',    gateId: 'C1', color: '#8b5cf6', phase: 'arriving',   delayMs: 7000, isCargo: true },
]

function lerp(a, b, t) { return a + (b - a) * t }

function interpolatePath(path, t) {
  if (path.length < 2) return path[0]
  const segs = path.length - 1
  const scaled = t * segs
  const i = Math.min(Math.floor(scaled), segs - 1)
  const segT = scaled - i
  return {
    x: lerp(path[i].x, path[i + 1].x, segT),
    y: lerp(path[i].y, path[i + 1].y, segT),
  }
}

function PlaneIcon({ x, y, heading, color, callsign, docked }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${heading})`} style={{ transition: docked ? 'none' : '' }}>
      {/* fuselage */}
      <ellipse cx={0} cy={0} rx={14} ry={5} fill={color} opacity={0.9} />
      {/* wings */}
      <polygon points="0,-1 -10,8 10,8" fill={color} opacity={0.7} />
      {/* tail */}
      <polygon points="0,0 -4,5 4,5" fill={color} opacity={0.85} />
      {/* callsign label */}
      <text x={0} y={-10} textAnchor="middle" fontSize="7" fill="white" fontFamily="monospace" fontWeight="bold">
        {callsign}
      </text>
    </g>
  )
}

const TOTAL_FLIGHT_DURATION_MS = 16000

export default function AirportHero() {
  const [tick, setTick]   = useState(0)
  const startRef          = useRef(Date.now())
  const rafRef            = useRef(null)

  useEffect(() => {
    let running = true
    function frame() {
      if (!running) return
      setTick(Date.now())
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => { running = false; cancelAnimationFrame(rafRef.current) }
  }, [])

  const now = tick

  // Resolve gate & cargo positions
  const gateMap  = Object.fromEntries(LAYOUT.gates.map(g => [g.id, g]))
  const cargoMap = Object.fromEntries(LAYOUT.cargoBays.map(b => [b.id, { ...b, x: b.x + b.w / 2, y: b.y }]))
  const allPosMap = { ...gateMap, ...cargoMap }

  const planes = FLIGHTS.map(f => {
    const start     = startRef.current + f.delayMs
    const elapsed   = Math.max(0, now - start)
    // Loop: re-start every TOTAL_FLIGHT_DURATION_MS
    const cycleMs   = TOTAL_FLIGHT_DURATION_MS
    const loopElapsed = elapsed % cycleMs
    const rawT      = Math.min(loopElapsed / cycleMs, 1)

    const pos       = allPosMap[f.gateId] || { x: 500, y: 350 }
    const dockedStart = 0.45
    const dockedEnd   = 0.65

    let px, py, heading, docked

    if (f.phase === 'arriving') {
      const path = buildArrivalPath(pos)
      if (rawT < dockedStart) {
        const t = rawT / dockedStart
        const pt = interpolatePath(path, t)
        px = pt.x; py = pt.y; docked = false
        const next = interpolatePath(path, Math.min(t + 0.01, 1))
        heading = Math.atan2(next.y - pt.y, next.x - pt.x) * 180 / Math.PI + 90
      } else if (rawT < dockedEnd) {
        px = pos.x; py = pos.y; docked = true; heading = 0
      } else {
        const depPath = buildDeparturePath(pos)
        const t = (rawT - dockedEnd) / (1 - dockedEnd)
        const pt = interpolatePath(depPath, t)
        px = pt.x; py = pt.y; docked = false
        const next = interpolatePath(depPath, Math.min(t + 0.01, 1))
        heading = Math.atan2(next.y - pt.y, next.x - pt.x) * 180 / Math.PI + 90
      }
    } else {
      // departing — starts at gate
      const path = buildDeparturePath(pos)
      if (rawT < 0.35) {
        px = pos.x; py = pos.y; docked = true; heading = 0
      } else {
        const t = (rawT - 0.35) / 0.65
        const pt = interpolatePath(path, t)
        px = pt.x; py = pt.y; docked = false
        const next = interpolatePath(path, Math.min(t + 0.01, 1))
        heading = Math.atan2(next.y - pt.y, next.x - pt.x) * 180 / Math.PI + 90
      }
    }

    return { ...f, px, py, heading: heading || 0, docked }
  })

  return (
    <div style={{ width: '100%', background: '#0a1628', borderRadius: 12, overflow: 'hidden', position: 'relative', userSelect: 'none' }}>
      {/* header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: '#0d1f3c', borderBottom: '1px solid #1e3a5f' }}>
        <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700, fontSize: 14, letterSpacing: 2 }}>
          ✈ AEROVERTEX AIRPORT — LIVE MAP
        </span>
        <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: 11 }}>
          ● OPERATIONAL
        </span>
      </div>

      {/* SVG map */}
      <svg
        viewBox="0 0 1000 700"
        style={{ width: '100%', display: 'block' }}
        role="img"
        aria-label="Airport live map"
      >
        {/* grass */}
        <rect x={0} y={0} width={1000} height={700} fill="#0f2d1a" />

        {/* runway strip (tarmac base) */}
        {LAYOUT.runways.map(r => (
          <rect key={r.id} x={r.x1} y={r.y1 - 18} width={r.x2 - r.x1} height={36} fill="#1c2a1c" rx={2} />
        ))}

        {/* runway surface */}
        {LAYOUT.runways.map(r => (
          <g key={r.id}>
            <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke="#2d3d2d" strokeWidth={28} />
            {/* centre line dashes */}
            {Array.from({ length: 24 }).map((_, i) => (
              <line
                key={i}
                x1={r.x1 + 20 + i * 40} y1={r.y1}
                x2={r.x1 + 35 + i * 40} y2={r.y1}
                stroke="#e5e540"
                strokeWidth={2}
                strokeDasharray="8 4"
                opacity={0.6}
              />
            ))}
            {/* threshold marks */}
            {[-8, -4, 0, 4, 8].map(off => (
              <line key={off} x1={r.x1 + 50} y1={r.y1 + off * 1.5} x2={r.x1 + 80} y2={r.y1 + off * 1.5}
                stroke="white" strokeWidth={2} opacity={0.5} />
            ))}
            {/* runway ID */}
            <text x={r.x1 + 95} y={r.y1 + 5} fill="white" fontSize={11} fontFamily="monospace" opacity={0.7}>{r.name}</text>
            {/* edge lights */}
            {Array.from({ length: 30 }).map((_, i) => (
              <circle key={i} cx={r.x1 + 20 + i * 32} cy={r.y1 - 16} r={2} fill="#60a5fa" opacity={0.5} />
            ))}
            {Array.from({ length: 30 }).map((_, i) => (
              <circle key={i} cx={r.x1 + 20 + i * 32} cy={r.y1 + 16} r={2} fill="#60a5fa" opacity={0.5} />
            ))}
          </g>
        ))}

        {/* taxiways */}
        {LAYOUT.taxiways.map(t => (
          <line key={t.id}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="#1c2d1c" strokeWidth={16}
          />
        ))}
        {/* taxiway centre lines */}
        {LAYOUT.taxiways.map(t => (
          <line key={t.id + 'c'}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="#e5e540" strokeWidth={1} strokeDasharray="12 8" opacity={0.4}
          />
        ))}

        {/* apron areas */}
        <rect x={255} y={195} width={300} height={160} fill="#192b19" rx={4} />
        <rect x={615} y={195} width={210} height={160} fill="#192b19" rx={4} />

        {/* terminals */}
        {LAYOUT.terminals.map(t => (
          <g key={t.id}>
            <rect x={t.x} y={t.y} width={t.w} height={t.h} fill="#1a3a5c" rx={6} stroke="#2563eb" strokeWidth={1.5} />
            <rect x={t.x} y={t.y} width={t.w} height={10} fill="#2563eb" rx="6 6 0 0" opacity={0.6} />
            <text x={t.x + t.w / 2} y={t.y + 32} textAnchor="middle" fill="#93c5fd" fontSize={13} fontFamily="monospace" fontWeight="bold">
              {t.name}
            </text>
            <text x={t.x + t.w / 2} y={t.y + 50} textAnchor="middle" fill="#4b7fbd" fontSize={9} fontFamily="monospace">
              {t.type}
            </text>
            {/* windows */}
            {Array.from({ length: Math.floor(t.w / 22) }).map((_, i) => (
              <rect key={i} x={t.x + 12 + i * 22} y={t.y + 58} width={10} height={8} fill="#bfdbfe" rx={1} opacity={0.5} />
            ))}
          </g>
        ))}

        {/* gate jetbridges */}
        {LAYOUT.gates.map(g => (
          <g key={g.id}>
            <line x1={g.x} y1={g.y + 20} x2={g.x} y2={g.y + 40} stroke="#374151" strokeWidth={3} />
            <rect x={g.x - 8} y={g.y + 38} width={16} height={10} fill="#1e3a5f" rx={2} />
            <circle cx={g.x} cy={g.y + 18} r={5} fill="#3b82f6" opacity={0.8} />
            <text x={g.x} y={g.y + 14} textAnchor="middle" fill="#93c5fd" fontSize={7} fontFamily="monospace">{g.label}</text>
          </g>
        ))}

        {/* cargo area */}
        <rect x={115} y={410} width={270} height={100} fill="#1a2a1a" rx={4} stroke="#6b7280" strokeWidth={1} strokeDasharray="4 3" />
        <text x={250} y={430} textAnchor="middle" fill="#9ca3af" fontSize={10} fontFamily="monospace">CARGO AREA</text>
        {LAYOUT.cargoBays.map(b => (
          <g key={b.id}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#1f3830" rx={3} stroke="#4ade80" strokeWidth={1} opacity={0.8} />
            <text x={b.x + b.w / 2} y={b.y + b.h / 2 + 4} textAnchor="middle" fill="#4ade80" fontSize={10} fontFamily="monospace" fontWeight="bold">{b.label}</text>
            {/* cargo truck */}
            <rect x={b.x + 5} y={b.y + b.h - 12} width={18} height={8} fill="#374151" rx={1} />
            <circle cx={b.x + 8}  cy={b.y + b.h - 2} r={2} fill="#6b7280" />
            <circle cx={b.x + 18} cy={b.y + b.h - 2} r={2} fill="#6b7280" />
          </g>
        ))}

        {/* construction zones */}
        {LAYOUT.constructionZones.map((z, i) => (
          <g key={i}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h}
              fill="#1a1a0a" rx={4}
              stroke="#f59e0b" strokeWidth={2} strokeDasharray="8 4"
            />
            {/* diagonal hazard stripes */}
            {Array.from({ length: 8 }).map((_, j) => (
              <line key={j}
                x1={z.x + j * 18} y1={z.y}
                x2={z.x} y2={z.y + j * 14}
                stroke="#f59e0b" strokeWidth={1} opacity={0.2}
              />
            ))}
            <text x={z.x + z.w / 2} y={z.y + z.h / 2 - 5} textAnchor="middle" fill="#f59e0b" fontSize={9} fontFamily="monospace">🚧</text>
            {z.label.split('\n').map((line, li) => (
              <text key={li} x={z.x + z.w / 2} y={z.y + z.h / 2 + 8 + li * 11}
                textAnchor="middle" fill="#f59e0b" fontSize={8} fontFamily="monospace" opacity={0.9}>
                {line}
              </text>
            ))}
          </g>
        ))}

        {/* control tower */}
        <rect x={70} y={280} width={40} height={80} fill="#0f2d4a" rx={3} stroke="#2563eb" strokeWidth={1} />
        <rect x={65} y={270} width={50} height={18} fill="#1e40af" rx={2} />
        <rect x={60} y={255} width={60} height={20} fill="#1e40af" rx={4} stroke="#60a5fa" strokeWidth={1} />
        {/* rotating radar */}
        <circle cx={90} cy={255} r={8} fill="none" stroke="#4ade80" strokeWidth={1} opacity={0.4} />
        <line x1={90} y1={255} x2={90} y2={248}
          stroke="#4ade80" strokeWidth={1.5}
          style={{ transformOrigin: '90px 255px', animation: 'spin 3s linear infinite' }}
        />
        <text x={90} y={318} textAnchor="middle" fill="#60a5fa" fontSize={8} fontFamily="monospace">TWR</text>

        {/* wind sock */}
        <line x1={920} y1={340} x2={920} y2={360} stroke="#6b7280" strokeWidth={2} />
        <polygon points="920,340 935,344 920,348" fill="#f87171" opacity={0.8} />
        <text x={920} y={372} textAnchor="middle" fill="#9ca3af" fontSize={7} fontFamily="monospace">280°</text>

        {/* animated planes */}
        {planes.map(p => (
          <PlaneIcon
            key={p.id}
            x={p.px}
            y={p.py}
            heading={p.heading}
            color={p.color}
            callsign={p.callsign}
            docked={p.docked}
          />
        ))}

        {/* legend */}
        <g transform="translate(20, 620)">
          <rect x={0} y={0} width={450} height={60} fill="#0d1f3c" rx={6} opacity={0.85} />
          {planes.map((p, i) => (
            <g key={p.id} transform={`translate(${10 + i * 110}, 10)`}>
              <circle cx={6} cy={6} r={5} fill={p.color} />
              <text x={14} y={10} fill="white" fontSize={9} fontFamily="monospace" fontWeight="bold">{p.callsign}</text>
              <text x={14} y={22} fill="#9ca3af" fontSize={8} fontFamily="monospace">{p.airline}</text>
              <text x={14} y={34} fill={p.docked ? '#4ade80' : '#f59e0b'} fontSize={8} fontFamily="monospace">
                {p.docked ? '● AT GATE' : '◆ TAXIING'}
              </text>
            </g>
          ))}
        </g>
      </svg>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

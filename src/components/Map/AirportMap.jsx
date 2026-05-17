import { MAP_CONFIG as C } from './mapConfig'

// ── small helpers ──────────────────────────────────────────────────────────

function EdgeLights({ x1, y1, x2, y2 }) {
  const count = 12
  const dots = Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1)
    return { cx: x1 + t * (x2 - x1), cy: y1 + t * (y2 - y1) }
  })
  const offset = y1 === y2 ? 16 : 16
  return (
    <>
      {dots.map((d, i) => (
        <g key={i}>
          <circle cx={d.cx} cy={d.cy - offset} r={2.5} fill="#60a5fa" opacity={0.7} />
          <circle cx={d.cx} cy={d.cy + offset} r={2.5} fill="#60a5fa" opacity={0.7} />
        </g>
      ))}
    </>
  )
}

function ThresholdMarks({ x1, y1, x2, y2 }) {
  const isHoriz = y1 === y2
  if (isHoriz) {
    return (
      <>
        {[-8, -4, 0, 4, 8].map(o => (
          <line key={o} x1={x1 + 20} y1={y1 + o * 1.5} x2={x1 + 40} y2={y1 + o * 1.5}
            stroke="white" strokeWidth={2} opacity={0.7} />
        ))}
        {[-8, -4, 0, 4, 8].map(o => (
          <line key={o} x1={x2 - 40} y1={y2 + o * 1.5} x2={x2 - 20} y2={y2 + o * 1.5}
            stroke="white" strokeWidth={2} opacity={0.7} />
        ))}
      </>
    )
  }
  return null
}

// ── main component ─────────────────────────────────────────────────────────

export default function AirportMap({
  onSelectFlight,
  onSelectGate,
  onSelectCargo,
  onSelectTower,
  onSelectAirport,
}) {
  const pt = C.passengerTerminal
  const ct = C.cargoTerminal
  const tower = C.controlTower

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <svg
        viewBox={C.viewBox}
        style={{ width: '100%', height: '100%', maxHeight: 'calc(100vh - 120px)', display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ── LAYER 1: Grass background ───────────────────────────────── */}
        <rect x={0} y={0} width={1000} height={700} fill="#0f2d1a" />

        {/* ── LAYER 2: Runway strips (dark tarmac pads) ──────────────── */}
        {C.runways.map(r => (
          <rect
            key={r.id}
            x={r.x1 - 4}
            y={r.y1 - 20}
            width={r.x2 - r.x1 + 8}
            height={40}
            fill="#111820"
            rx={2}
          />
        ))}

        {/* ── LAYER 3: Runways ────────────────────────────────────────── */}
        {C.runways.map(r => (
          <g key={r.id}>
            {/* Base runway line */}
            <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
              stroke="#2a3a4a" strokeWidth={28} />
            {/* White centre dashes */}
            <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
              stroke="white" strokeWidth={2} strokeDasharray="24 16" opacity={0.8} />
            {/* Threshold marks */}
            <ThresholdMarks x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
            {/* Edge lighting */}
            <EdgeLights x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
            {/* Runway name labels */}
            <text x={r.x1 + 55} y={r.y1 - 10}
              fill="#93c5fd" fontSize={9} fontFamily="monospace" letterSpacing={1} opacity={0.8}>
              {r.name.split('/')[0]}
            </text>
            <text x={r.x2 - 75} y={r.y1 - 10}
              fill="#93c5fd" fontSize={9} fontFamily="monospace" letterSpacing={1} opacity={0.8}>
              {r.name.split('/')[1]}
            </text>
          </g>
        ))}

        {/* ── LAYER 4: Taxiways ───────────────────────────────────────── */}
        {C.taxiways.map((t, i) => (
          <g key={i}>
            <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="#1a2a1a" strokeWidth={14} />
            <line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="#b45309" strokeWidth={1.5} strokeDasharray="12 8" opacity={0.7} />
          </g>
        ))}

        {/* ── LAYER 5: Apron pads ─────────────────────────────────────── */}
        <rect x={140} y={158} width={620} height={110} fill="#122015" rx={2} />
        <rect x={270} y={448} width={480} height={82}  fill="#122015" rx={2} />

        {/* ── LAYER 6: Cargo Terminal ─────────────────────────────────── */}
        <rect
          x={ct.x} y={ct.y} width={ct.w} height={ct.h}
          fill="#1f3830" stroke="#4ade80" strokeWidth={1.5} rx={3}
          onClick={onSelectCargo}
          style={{ cursor: 'pointer' }}
        />
        <text x={ct.x + ct.w / 2} y={ct.y + ct.h / 2 + 4}
          fill="#4ade80" fontSize={11} fontFamily="monospace" textAnchor="middle"
          letterSpacing={2} style={{ pointerEvents: 'none' }}>
          {ct.label.toUpperCase()}
        </text>

        {/* ── LAYER 7: Passenger Terminal ─────────────────────────────── */}
        <rect
          x={pt.x} y={pt.y} width={pt.w} height={pt.h}
          fill="#1a3a5c" stroke="#3b82f6" strokeWidth={1.5} rx={3}
          onClick={onSelectAirport}
          style={{ cursor: 'pointer' }}
        />
        {/* Window row */}
        {Array.from({ length: 18 }, (_, i) => (
          <rect key={i}
            x={pt.x + 20 + i * 32} y={pt.y + 20}
            width={18} height={12}
            fill="#60a5fa" opacity={0.25} rx={1}
            style={{ pointerEvents: 'none' }}
          />
        ))}
        <text x={pt.x + pt.w / 2} y={pt.y + pt.h / 2 + 4}
          fill="#93c5fd" fontSize={11} fontFamily="monospace" textAnchor="middle"
          letterSpacing={2} style={{ pointerEvents: 'none' }}>
          {pt.label.toUpperCase()}
        </text>
        {/* Gate arm stubs (A-wing) */}
        {C.gates.filter(g => g.label.startsWith('A')).map(g => (
          <line key={g.id}
            x1={g.x} y1={pt.y + pt.h}
            x2={g.x} y2={g.y - 6}
            stroke="#1e3a5f" strokeWidth={10}
            style={{ pointerEvents: 'none' }}
          />
        ))}

        {/* ── LAYER 8: Gate markers ───────────────────────────────────── */}
        {C.gates.map(g => (
          <g key={g.id} onClick={() => onSelectGate(g.id)} style={{ cursor: 'pointer' }}>
            <circle cx={g.x} cy={g.y} r={10} fill="#1e3a5f" stroke="#3b82f6" strokeWidth={1.5} />
            <text x={g.x} y={g.y + 4}
              fill="#93c5fd" fontSize={7} fontFamily="monospace" textAnchor="middle"
              style={{ pointerEvents: 'none' }}>
              {g.label}
            </text>
          </g>
        ))}

        {/* ── LAYER 9: Cargo bay markers ──────────────────────────────── */}
        {C.cargoBays.map(b => (
          <g key={b.id} onClick={onSelectCargo} style={{ cursor: 'pointer' }}>
            <rect x={b.x - 9} y={b.y - 9} width={18} height={18}
              fill="#1a2e1a" stroke="#4ade80" strokeWidth={1.5} rx={2} />
            <text x={b.x} y={b.y + 4}
              fill="#4ade80" fontSize={7} fontFamily="monospace" textAnchor="middle"
              style={{ pointerEvents: 'none' }}>
              {b.label}
            </text>
          </g>
        ))}

        {/* ── LAYER 10: Control Tower ─────────────────────────────────── */}
        <g onClick={onSelectTower} style={{ cursor: 'pointer' }}>
          {/* Tower base */}
          <rect x={tower.x - 8} y={tower.y + 10} width={16} height={40}
            fill="#1a2a3a" stroke="#1e3a5f" strokeWidth={1} />
          {/* Tower body */}
          <rect x={tower.x - 12} y={tower.y - 20} width={24} height={32}
            fill="#0f2240" stroke="#3b82f6" strokeWidth={1.5} rx={2} />
          {/* Overhang deck */}
          <rect x={tower.x - 16} y={tower.y - 26} width={32} height={8}
            fill="#1a3a5c" stroke="#3b82f6" strokeWidth={1} rx={1} />
          {/* Radar dish */}
          <circle cx={tower.x} cy={tower.y - 36} r={8}
            fill="none" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 2" />
          <line x1={tower.x} y1={tower.y - 36} x2={tower.x} y2={tower.y - 26}
            stroke="#60a5fa" strokeWidth={1} />
          {/* Tower label */}
          <text x={tower.x} y={tower.y + 60}
            fill="#4b7fbd" fontSize={8} fontFamily="monospace" textAnchor="middle"
            letterSpacing={1} style={{ pointerEvents: 'none' }}>
            TWR
          </text>
          {/* Blinking beacon */}
          <circle cx={tower.x} cy={tower.y - 44} r={3} fill="#60a5fa" opacity={0.9}>
            <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* ── LAYER 11: Construction zone ─────────────────────────────── */}
        <rect x={820} y={270} width={140} height={90}
          fill="#1a1200" stroke="#b45309" strokeWidth={1.5}
          strokeDasharray="8 4" rx={3} opacity={0.85} />
        {/* Construction stripes */}
        {[0, 1, 2, 3].map(i => (
          <line key={i}
            x1={820 + i * 35} y1={270}
            x2={820 + i * 35 + 35} y2={360}
            stroke="#b45309" strokeWidth={1} opacity={0.3}
          />
        ))}
        <text x={890} y={310}
          fill="#f59e0b" fontSize={8} fontFamily="monospace" textAnchor="middle"
          letterSpacing={1}>
          TERMINAL C
        </text>
        <text x={890} y={322}
          fill="#f59e0b" fontSize={7} fontFamily="monospace" textAnchor="middle"
          letterSpacing={1} opacity={0.7}>
          UNDER CONSTRUCTION
        </text>

        {/* ── Perimeter fence ─────────────────────────────────────────── */}
        <rect x={10} y={10} width={980} height={680}
          fill="none" stroke="#1e3a5f" strokeWidth={1} strokeDasharray="6 6" opacity={0.4} />
      </svg>
    </div>
  )
}

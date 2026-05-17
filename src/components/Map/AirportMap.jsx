import { MAP_CONFIG as C } from './mapConfig'
import AircraftLayer from './AircraftLayer'

// ── Runway edge lighting dots ──────────────────────────────────────────────
function EdgeLights({ x1, y1, x2, y2 }) {
  const count = 18
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1)
        const cx = x1 + t * (x2 - x1)
        const cy = y1 + t * (y2 - y1)
        return (
          <g key={i}>
            <circle cx={cx} cy={cy - 17} r={2} fill="#93c5fd" opacity={0.55} />
            <circle cx={cx} cy={cy + 17} r={2} fill="#93c5fd" opacity={0.55} />
          </g>
        )
      })}
    </>
  )
}

// ── Runway threshold bars ──────────────────────────────────────────────────
function ThresholdBars({ x1, y1, x2, y2 }) {
  const bars = [-10, -5, 0, 5, 10]
  return (
    <>
      {bars.map(o => (
        <g key={o}>
          <line x1={x1 + 18} y1={y1 + o * 1.4} x2={x1 + 44} y2={y1 + o * 1.4}
            stroke="white" strokeWidth={2.5} opacity={0.75} />
          <line x1={x2 - 44} y1={y2 + o * 1.4} x2={x2 - 18} y2={y2 + o * 1.4}
            stroke="white" strokeWidth={2.5} opacity={0.75} />
        </g>
      ))}
    </>
  )
}

// ── Curved taxiway exit path (SVG path string) ────────────────────────────
// Generates a smooth curve from runway to the taxiway spine using a quadratic bezier
function curvedExit(rx, ry, tx, ty) {
  const cx = tx
  const cy = ry
  return `M ${rx} ${ry} Q ${cx} ${cy} ${tx} ${ty}`
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AirportMap({
  flights = [],
  simSecond = 0,
  onSelectFlight,
  onSelectGate,
  onSelectCargo,
  onSelectTower,
  onSelectAirport,
}) {
  const pt = C.passengerTerminal
  const ct = C.cargoTerminal
  const tw = C.controlTower

  // Gate positions split by wing
  const aGates = C.gates.filter(g => g.label.startsWith('A'))
  const bGates = C.gates.filter(g => g.label.startsWith('B'))

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '12px 16px',
    }}>
      <svg
        viewBox={C.viewBox}
        style={{ width: '100%', height: '100%', maxHeight: 'calc(100vh - 120px)', display: 'block' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* ─── LAYER 0: Subtle grid overlay ───────────────────────────── */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1a2d1a" strokeWidth="0.5" opacity="0.6" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* ─── LAYER 1: Grass field ────────────────────────────────────── */}
        <rect x={0} y={0} width={1000} height={700} fill="#0c2214" />
        <rect x={0} y={0} width={1000} height={700} fill="url(#grid)" />

        {/* ─── LAYER 2: Runway tarmac pads ─────────────────────────────── */}
        {C.runways.map(r => (
          <rect key={r.id}
            x={r.x1 - 6} y={r.y1 - 22}
            width={r.x2 - r.x1 + 12} height={44}
            fill="#0d1a10" rx={3}
          />
        ))}

        {/* ─── LAYER 3: Runways ────────────────────────────────────────── */}
        {C.runways.map(r => (
          <g key={r.id}>
            <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
              stroke="#1e2e20" strokeWidth={30} />
            {/* Painted surface */}
            <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
              stroke="#253525" strokeWidth={26} />
            {/* Centre line dashes */}
            <line x1={r.x1 + 60} y1={r.y1} x2={r.x2 - 60} y2={r.y2}
              stroke="white" strokeWidth={1.8} strokeDasharray="28 18" opacity={0.7} />
            <ThresholdBars x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
            <EdgeLights x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
            {/* Runway designation labels */}
            <text x={r.x1 + 60} y={r.y1 - 14}
              fill="#7fb3d3" fontSize={9} fontFamily="monospace" letterSpacing={1.5} opacity={0.9}>
              {r.name.split('/')[0]}
            </text>
            <text x={r.x2 - 80} y={r.y1 - 14}
              fill="#7fb3d3" fontSize={9} fontFamily="monospace" letterSpacing={1.5} opacity={0.9}>
              {r.name.split('/')[1]}
            </text>
          </g>
        ))}

        {/* ─── LAYER 4: Taxiway base (filled surface) ──────────────────── */}
        {C.taxiways.map((t, i) => (
          <line key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="#152215" strokeWidth={18}
          />
        ))}

        {/* Curved runway exits — where aircraft peel off the runway */}
        {/* R1 exit east → east spine */}
        <path d={curvedExit(800, 140, 800, 200)}
          stroke="#152215" strokeWidth={18} fill="none" />
        {/* R1 exit west → west spine */}
        <path d={curvedExit(200, 140, 200, 200)}
          stroke="#152215" strokeWidth={18} fill="none" />
        {/* R2 exit east → east spine */}
        <path d={curvedExit(800, 560, 800, 500)}
          stroke="#152215" strokeWidth={18} fill="none" />
        {/* R2 exit west → west spine */}
        <path d={curvedExit(200, 560, 200, 500)}
          stroke="#152215" strokeWidth={18} fill="none" />

        {/* ─── LAYER 4b: Taxiway yellow centre lines ────────────────────── */}
        {C.taxiways.map((t, i) => (
          <line key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="#a16207" strokeWidth={1.5} strokeDasharray="14 9" opacity={0.65}
          />
        ))}
        {/* Curved exit centre lines */}
        {[
          curvedExit(800, 140, 800, 200),
          curvedExit(200, 140, 200, 200),
          curvedExit(800, 560, 800, 500),
          curvedExit(200, 560, 200, 500),
        ].map((d, i) => (
          <path key={i} d={d}
            stroke="#a16207" strokeWidth={1.5} strokeDasharray="10 8" fill="none" opacity={0.65}
          />
        ))}

        {/* ─── LAYER 5: Apron areas ────────────────────────────────────── */}
        {/* Passenger apron */}
        <rect x={130} y={152} width={640} height={120} fill="#112015" rx={4} />
        {/* Cargo apron */}
        <rect x={265} y={440} width={490} height={90} fill="#0f1e14" rx={4} />

        {/* ─── LAYER 6: Apron lead-in taxiways (vertical stubs to gates) ── */}
        {aGates.map(g => (
          <line key={g.id}
            x1={g.x} y1={350} x2={g.x} y2={g.y}
            stroke="#152215" strokeWidth={12}
          />
        ))}
        {aGates.map(g => (
          <line key={g.id + 'c'}
            x1={g.x} y1={350} x2={g.x} y2={g.y}
            stroke="#a16207" strokeWidth={1} strokeDasharray="8 7" opacity={0.5}
          />
        ))}
        {bGates.map(g => (
          <line key={g.id}
            x1={g.x} y1={350} x2={g.x} y2={g.y}
            stroke="#152215" strokeWidth={12}
          />
        ))}
        {bGates.map(g => (
          <line key={g.id + 'c'}
            x1={g.x} y1={350} x2={g.x} y2={g.y}
            stroke="#a16207" strokeWidth={1} strokeDasharray="8 7" opacity={0.5}
          />
        ))}
        {/* Cargo bay lead-ins */}
        {C.cargoBays.map(b => (
          <line key={b.id}
            x1={b.x} y1={420} x2={b.x} y2={b.y}
            stroke="#0f1e14" strokeWidth={12}
          />
        ))}
        {C.cargoBays.map(b => (
          <line key={b.id + 'c'}
            x1={b.x} y1={420} x2={b.x} y2={b.y}
            stroke="#065f46" strokeWidth={1} strokeDasharray="8 7" opacity={0.55}
          />
        ))}

        {/* ─── LAYER 7: Cargo Terminal ─────────────────────────────────── */}
        {/* Terminal shadow */}
        <rect x={ct.x + 4} y={ct.y + 4} width={ct.w} height={ct.h}
          fill="#000000" opacity={0.35} rx={5} />
        <rect x={ct.x} y={ct.y} width={ct.w} height={ct.h}
          fill="#162e24" stroke="#22c55e" strokeWidth={1.5} rx={5}
          onClick={onSelectCargo} style={{ cursor: 'pointer' }}
        />
        {/* Cargo terminal accent stripe */}
        <rect x={ct.x} y={ct.y} width={ct.w} height={8}
          fill="#166534" rx="5 5 0 0" style={{ pointerEvents: 'none' }} />
        <text x={ct.x + ct.w / 2} y={ct.y + ct.h / 2 + 5}
          fill="#4ade80" fontSize={10} fontFamily="monospace" textAnchor="middle"
          letterSpacing={3} fontWeight="600" style={{ pointerEvents: 'none' }}>
          {ct.label.toUpperCase()}
        </text>

        {/* ─── LAYER 8: Passenger Terminal body ────────────────────────── */}
        {/* Shadow */}
        <rect x={pt.x + 5} y={pt.y + 5} width={pt.w} height={pt.h}
          fill="#000000" opacity={0.4} rx={6} />
        {/* Main body */}
        <rect x={pt.x} y={pt.y} width={pt.w} height={pt.h}
          fill="#112240" stroke="#2563eb" strokeWidth={2} rx={6}
          onClick={onSelectAirport} style={{ cursor: 'pointer' }}
        />
        {/* Header stripe */}
        <rect x={pt.x} y={pt.y} width={pt.w} height={10}
          fill="#1d4ed8" rx="6 6 0 0" style={{ pointerEvents: 'none' }} />
        {/* Window row */}
        {Array.from({ length: 16 }, (_, i) => (
          <rect key={i}
            x={pt.x + 22 + i * 36} y={pt.y + 20}
            width={20} height={10}
            fill="#3b82f6" opacity={0.2} rx={2}
            style={{ pointerEvents: 'none' }}
          />
        ))}
        {/* Terminal label */}
        <text x={pt.x + pt.w / 2} y={pt.y + pt.h / 2 + 5}
          fill="#93c5fd" fontSize={11} fontFamily="monospace" textAnchor="middle"
          letterSpacing={3} fontWeight="600" style={{ pointerEvents: 'none' }}>
          {pt.label.toUpperCase()}
        </text>

        {/* ─── LAYER 9: Concourse arms (gate finger piers) ──────────────── */}
        {/* A-wing: concourse arm from terminal bottom down to gate level */}
        <rect x={160} y={pt.y + pt.h} width={470} height={20}
          fill="#0d1e38" stroke="#1e3a5f" strokeWidth={1} rx={2}
          style={{ pointerEvents: 'none' }}
        />
        {/* B-wing: upper concourse inside the terminal area */}
        <rect x={180} y={pt.y - 4} width={580} height={16}
          fill="#0d1e38" stroke="#1e3a5f" strokeWidth={1} rx={2}
          style={{ pointerEvents: 'none' }}
        />

        {/* Jetbridge connectors — from concourse arm to gate circle */}
        {aGates.map(g => (
          <line key={g.id}
            x1={g.x} y1={pt.y + pt.h + 20}
            x2={g.x} y2={g.y - 10}
            stroke="#1e3a5f" strokeWidth={3}
            style={{ pointerEvents: 'none' }}
          />
        ))}
        {bGates.map(g => (
          <line key={g.id}
            x1={g.x} y1={pt.y - 4}
            x2={g.x} y2={g.y + 10}
            stroke="#1e3a5f" strokeWidth={3}
            style={{ pointerEvents: 'none' }}
          />
        ))}

        {/* ─── LAYER 10: Gate pads (apron stands) ───────────────────────── */}
        {C.gates.map(g => (
          <g key={g.id} onClick={() => onSelectGate?.(g.id)} style={{ cursor: 'pointer' }}>
            {/* Stand pad */}
            <ellipse cx={g.x} cy={g.y} rx={14} ry={9}
              fill="#0d1e10" stroke="#1e3a5f" strokeWidth={1} opacity={0.8} />
            {/* Gate marker circle */}
            <circle cx={g.x} cy={g.y} r={9}
              fill="#0f2240" stroke="#3b82f6" strokeWidth={1.5} />
            <text x={g.x} y={g.y + 3.5}
              fill="#93c5fd" fontSize={6.5} fontFamily="monospace" textAnchor="middle"
              fontWeight="600" style={{ pointerEvents: 'none' }}>
              {g.label}
            </text>
          </g>
        ))}

        {/* ─── LAYER 11: Cargo bay pads ─────────────────────────────────── */}
        {C.cargoBays.map(b => (
          <g key={b.id} onClick={onSelectCargo} style={{ cursor: 'pointer' }}>
            <rect x={b.x - 16} y={b.y - 10} width={32} height={20}
              fill="#0c1e14" stroke="#16a34a" strokeWidth={1} rx={3} opacity={0.9} />
            <rect x={b.x - 10} y={b.y - 6} width={20} height={12}
              fill="#0f2e1a" stroke="#22c55e" strokeWidth={1.2} rx={2} />
            <text x={b.x} y={b.y + 4}
              fill="#4ade80" fontSize={7} fontFamily="monospace" textAnchor="middle"
              fontWeight="600" style={{ pointerEvents: 'none' }}>
              {b.label}
            </text>
          </g>
        ))}

        {/* ─── LAYER 12: Control Tower ──────────────────────────────────── */}
        <g onClick={onSelectTower} style={{ cursor: 'pointer' }}>
          {/* Tower shaft */}
          <rect x={tw.x - 7} y={tw.y + 20} width={14} height={50}
            fill="#0d1e38" stroke="#1e3a5f" strokeWidth={1} />
          {/* Tower cab body */}
          <rect x={tw.x - 14} y={tw.y - 10} width={28} height={34}
            fill="#0f2240" stroke="#2563eb" strokeWidth={2} rx={3} />
          {/* Cab overhang */}
          <rect x={tw.x - 18} y={tw.y - 16} width={36} height={9}
            fill="#1a3a5c" stroke="#3b82f6" strokeWidth={1.5} rx={2} />
          {/* Cab windows */}
          {[-8, 0, 8].map(ox => (
            <rect key={ox} x={tw.x + ox - 4} y={tw.y - 6} width={8} height={8}
              fill="#bfdbfe" opacity={0.3} rx={1} style={{ pointerEvents: 'none' }} />
          ))}
          {/* Radar mast */}
          <line x1={tw.x} y1={tw.y - 16} x2={tw.x} y2={tw.y - 34}
            stroke="#60a5fa" strokeWidth={1} />
          {/* Radar dish ring */}
          <circle cx={tw.x} cy={tw.y - 36} r={9}
            fill="none" stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.7} />
          {/* Blinking beacon */}
          <circle cx={tw.x} cy={tw.y - 45} r={3} fill="#60a5fa" opacity={0.9} filter="url(#glow)">
            <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.5s" repeatCount="indefinite" />
          </circle>
          <text x={tw.x} y={tw.y + 80}
            fill="#4b7fbd" fontSize={8} fontFamily="monospace" textAnchor="middle"
            letterSpacing={2} style={{ pointerEvents: 'none' }}>
            TWR
          </text>
        </g>

        {/* ─── LAYER 13: Construction zone (Terminal C) ─────────────────── */}
        <rect x={820} y={268} width={148} height={95}
          fill="#1a1200" stroke="#92400e" strokeWidth={1.5}
          strokeDasharray="8 4" rx={4} opacity={0.9} />
        {/* Diagonal hazard fill */}
        {[0, 1, 2, 3, 4].map(i => (
          <line key={i}
            x1={820 + i * 30} y1={268}
            x2={820} y2={268 + i * 25}
            stroke="#b45309" strokeWidth={1} opacity={0.2}
          />
        ))}
        <text x={894} y={308}
          fill="#fbbf24" fontSize={8} fontFamily="monospace" textAnchor="middle" letterSpacing={1.5}>
          TERMINAL C
        </text>
        <text x={894} y={320}
          fill="#f59e0b" fontSize={7} fontFamily="monospace" textAnchor="middle" letterSpacing={1} opacity={0.75}>
          UNDER CONSTRUCTION
        </text>

        {/* ─── LAYER 14: Airport perimeter ──────────────────────────────── */}
        <rect x={8} y={8} width={984} height={684}
          fill="none" stroke="#1e3a5f" strokeWidth={1} strokeDasharray="8 6" opacity={0.35} />

        {/* ─── LAYER 15: Aircraft (topmost) ─────────────────────────────── */}
        <AircraftLayer
          flights={flights}
          simSecond={simSecond}
          onSelectFlight={onSelectFlight}
        />
      </svg>
    </div>
  )
}

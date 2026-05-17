import { MAP_CONFIG as C } from './mapConfig'
import AircraftLayer from './AircraftLayer'

function ThresholdMarks({ x1, y1, x2, y2 }) {
  const offsets = [-10, -5, 0, 5, 10]
  return (
    <>
      {offsets.map(o => (
        <g key={o}>
          <line x1={x1 + 18} y1={y1 + o * 1.4} x2={x1 + 44} y2={y1 + o * 1.4}
            stroke="#ffffff" strokeWidth={2.5} opacity={0.8} />
          <line x1={x2 - 44} y1={y2 + o * 1.4} x2={x2 - 18} y2={y2 + o * 1.4}
            stroke="#ffffff" strokeWidth={2.5} opacity={0.8} />
        </g>
      ))}
    </>
  )
}

export default function AirportMap({
  flights = [],
  simRef,
  onSelectFlight,
  onSelectGate,
  onSelectCargo,
  onSelectTower,
  onSelectAirport,
}) {
  const tw = C.controlTower
  const ct = C.cargoTerminal
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
        {/* ── LAYER 1: Defs ──────────────────────────────────────────── */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d0d8c8" strokeWidth="0.8" />
          </pattern>
          <filter id="termShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* ── LAYER 2: Background ─────────────────────────────────────── */}
        <rect x={0} y={0} width={1000} height={700} fill="#dde8d0" />
        <rect x={0} y={0} width={1000} height={700} fill="url(#grid)" />

        {/* ── LAYER 3: Runway strips ──────────────────────────────────── */}
        {C.runways.map(r => (
          <g key={r.id}>
            <line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
              stroke="#9aa09a" strokeWidth={28} strokeLinecap="butt" />
            {/* Centre line dashes */}
            <line x1={r.x1 + 60} y1={r.y1} x2={r.x2 - 60} y2={r.y2}
              stroke="#ffffff" strokeWidth={2} strokeDasharray="30 15" />
          </g>
        ))}

        {/* ── LAYER 4: Threshold marks ────────────────────────────────── */}
        {C.runways.map(r => (
          <ThresholdMarks key={r.id} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
        ))}

        {/* ── LAYER 5: Runway ID labels ───────────────────────────────── */}
        {C.runways.map(r => (
          <g key={r.id}>
            <text x={r.x1 + 60} y={r.y1 - 10} fill="#1a1a1a" fontSize={10}
              fontFamily="monospace" letterSpacing={1.5} opacity={0.8}>
              {r.name.split('/')[0]}
            </text>
            <text x={r.x2 - 80} y={r.y1 - 10} fill="#1a1a1a" fontSize={10}
              fontFamily="monospace" letterSpacing={1.5} opacity={0.8}>
              {r.name.split('/')[1]}
            </text>
          </g>
        ))}

        {/* ── LAYER 6: Taxiways ───────────────────────────────────────── */}
        {C.taxiways.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="#b0b8b0" strokeWidth={14} />
        ))}
        {C.taxiways.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="#8a7a5a" strokeWidth={2} strokeDasharray="20 10" />
        ))}

        {/* ── LAYER 7: Apron pads ─────────────────────────────────────── */}
        {/* Passenger apron */}
        <rect x={135} y={148} width={645} height={140} fill="#ccd8c8" rx={5} />
        {/* Cargo apron */}
        <rect x={265} y={445} width={490} height={80} fill="#ccd8c8" rx={4} />

        {/* ── LAYER 8: Passenger Terminal ─────────────────────────────── */}
        <path
          d="M 150,255 Q 150,175 220,175 L 720,175 Q 760,175 760,215 L 760,255 Q 760,275 720,275 L 220,275 Q 150,275 150,255 Z"
          fill="#ffffff"
          stroke="#c8c8c0"
          strokeWidth={1.5}
          filter="url(#termShadow)"
          onClick={onSelectAirport}
          style={{ cursor: 'pointer' }}
        />
        {/* Orange header stripe */}
        <rect x={150} y={175} width={610} height={8} fill="#e67e22" rx={2}
          style={{ pointerEvents: 'none' }} />
        {/* Window row */}
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i}
            x={175 + i * 42} y={190}
            width={22} height={12}
            fill="#e0e8f0" rx={2}
            style={{ pointerEvents: 'none' }}
          />
        ))}
        {/* Terminal label */}
        <text x={455} y={242}
          textAnchor="middle"
          fill="#1a1a1a"
          fontSize={11}
          fontFamily="monospace"
          letterSpacing={2}
          fontWeight="600"
          style={{ pointerEvents: 'none' }}>
          PASSENGER TERMINAL A
        </text>

        {/* ── LAYER 9: A-wing finger piers ────────────────────────────── */}
        {aGates.map(g => (
          <path key={g.id}
            d={`M ${g.x - 4},175 L ${g.x - 4},145 Q ${g.x},135 ${g.x + 4},145 L ${g.x + 4},175 Z`}
            fill="#f0f0eb"
            stroke="#c8c8c0"
            strokeWidth={1}
            style={{ pointerEvents: 'none' }}
          />
        ))}

        {/* ── LAYER 10: Gate markers ──────────────────────────────────── */}
        {C.gates.map(g => (
          <g key={g.id} onClick={() => onSelectGate?.(g.id)} style={{ cursor: 'pointer' }}>
            <circle cx={g.x} cy={g.y} r={5} fill="#e67e22" stroke="#ffffff" strokeWidth={1.5} />
            <text x={g.x} y={g.y + 3.5}
              textAnchor="middle"
              fill="#1a1a1a"
              fontSize={8}
              fontFamily="monospace"
              fontWeight="600"
              style={{ pointerEvents: 'none' }}>
              {g.label}
            </text>
          </g>
        ))}

        {/* B-gate label backdrop so text reads over gate circle */}
        {bGates.map(g => (
          <text key={g.id + 'lbl'} x={g.x} y={g.y + 16}
            textAnchor="middle" fill="#666660" fontSize={7} fontFamily="monospace"
            style={{ pointerEvents: 'none' }}>
            {g.label}
          </text>
        ))}

        {/* ── LAYER 11: Cargo Terminal ─────────────────────────────────── */}
        <rect
          x={ct.x} y={ct.y} width={ct.w} height={ct.h}
          fill="#ffffff" stroke="#c8c8c0" strokeWidth={1.5} rx={4}
          filter="url(#termShadow)"
          onClick={onSelectCargo}
          style={{ cursor: 'pointer' }}
        />
        <rect x={ct.x} y={ct.y} width={ct.w} height={8}
          fill="#27ae60" rx={2}
          style={{ pointerEvents: 'none' }} />
        <text x={ct.x + ct.w / 2} y={ct.y + ct.h / 2 + 5}
          textAnchor="middle"
          fill="#1a1a1a"
          fontSize={10}
          fontFamily="monospace"
          letterSpacing={2}
          fontWeight="600"
          style={{ pointerEvents: 'none' }}>
          CARGO TERMINAL B
        </text>

        {/* ── LAYER 12: Cargo bay markers ──────────────────────────────── */}
        {C.cargoBays.map(b => (
          <g key={b.id} onClick={onSelectCargo} style={{ cursor: 'pointer' }}>
            <rect x={b.x - 4} y={b.y - 4} width={8} height={8} fill="#27ae60" rx={1} />
            <text x={b.x} y={b.y + 14}
              textAnchor="middle"
              fill="#1a1a1a"
              fontSize={7}
              fontFamily="monospace"
              fontWeight="600"
              style={{ pointerEvents: 'none' }}>
              {b.label}
            </text>
          </g>
        ))}

        {/* ── LAYER 13: Control tower ──────────────────────────────────── */}
        <g onClick={onSelectTower} style={{ cursor: 'pointer' }}>
          {/* Shaft */}
          <rect x={tw.x - 7} y={tw.y + 20} width={14} height={50} fill="#1a1a1a" />
          {/* Cab body */}
          <rect x={tw.x - 14} y={tw.y - 10} width={28} height={34}
            fill="#2a2a28" stroke="#1a1a1a" strokeWidth={1} rx={3} />
          {/* Cab overhang */}
          <rect x={tw.x - 18} y={tw.y - 16} width={36} height={9} fill="#1a1a1a" rx={2} />
          {/* Radar mast */}
          <line x1={tw.x} y1={tw.y - 16} x2={tw.x} y2={tw.y - 34}
            stroke="#e67e22" strokeWidth={1} />
          {/* Spinning radar ring */}
          <circle cx={tw.x} cy={tw.y - 36} r={9}
            fill="none" stroke="#e67e22" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.85}>
            <animateTransform
              attributeName="transform"
              type="rotate"
              from={`0 ${tw.x} ${tw.y - 36}`}
              to={`360 ${tw.x} ${tw.y - 36}`}
              dur="4s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Beacon */}
          <circle cx={tw.x} cy={tw.y - 50} r={2.5} fill="#e67e22" opacity={0.9} />
          <text x={tw.x} y={tw.y + 80}
            fill="#1a1a1a" fontSize={8} fontFamily="monospace" textAnchor="middle"
            letterSpacing={2} style={{ pointerEvents: 'none' }}>
            TWR
          </text>
        </g>

        {/* ── LAYER 14: Construction zone ──────────────────────────────── */}
        <rect x={820} y={268} width={148} height={95}
          fill="rgba(230,126,34,0.05)" stroke="#e67e22" strokeWidth={1.5}
          strokeDasharray="8 4" rx={4} />
        <text x={894} y={308}
          fill="#e67e22" fontSize={8} fontFamily="monospace" textAnchor="middle" letterSpacing={1.5}>
          TERMINAL C
        </text>
        <text x={894} y={320}
          fill="#e67e22" fontSize={7} fontFamily="monospace" textAnchor="middle" letterSpacing={1} opacity={0.75}>
          UNDER CONSTRUCTION
        </text>

        {/* ── Perimeter ─────────────────────────────────────────────────── */}
        <rect x={8} y={8} width={984} height={684}
          fill="none" stroke="#c8c8c0" strokeWidth={1} strokeDasharray="8 6" opacity={0.5} />

        {/* ── Aircraft (topmost) ────────────────────────────────────────── */}
        <AircraftLayer
          flights={flights}
          simRef={simRef}
          onSelectFlight={onSelectFlight}
        />
      </svg>
    </div>
  )
}

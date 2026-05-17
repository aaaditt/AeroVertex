import { MAP_CONFIG as C } from './mapConfig'
import AircraftLayer from './AircraftLayer'

// ── Palette ────────────────────────────────────────────────────────────────
const PAL = {
  paper:      '#eeece8',
  tarmac:     '#a8a6a2',   // grey paved taxiway surface
  tarmacDk:   '#929090',   // apron fill
  runway:     '#7c7a78',
  rwEdge:     '#5e5c5a',
  yellow:     '#c8a832',   // taxiway centerline
  yellowBrt:  '#ddb830',   // arrival MVA line (brighter)
  building:   '#c4c2bc',
  buildingDk: '#a8a6a0',
  interior:   '#d8d6d0',
  stroke:     '#38352e',
  strokeMd:   '#5a5750',
  strokeLt:   '#8a8780',
  text:       '#38352e',
  textMd:     '#686560',
  white:      '#ffffff',
  window:     '#c8d0d8',
}

// ── Taxiway helper: grey tarmac strip + yellow centerline on top ───────────
function Twy({ d, w = 18, yw = 1.6, dashed = true, cap = 'round' }) {
  return (
    <>
      <path d={d} fill="none" stroke={PAL.tarmac} strokeWidth={w}
        strokeLinecap={cap} strokeLinejoin="round" />
      <path d={d} fill="none" stroke={PAL.yellow} strokeWidth={yw}
        strokeLinecap={cap} strokeLinejoin="round"
        strokeDasharray={dashed ? '14 7' : 'none'} />
    </>
  )
}

// ── Finger pier projecting south from terminal ─────────────────────────────
function FingerPier({ x, topY, tipY, label, onSelect }) {
  const pw = 24, ph = tipY - topY
  return (
    <g onClick={onSelect} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
      <rect x={x - pw / 2} y={topY} width={pw} height={ph}
        fill={PAL.building} stroke={PAL.stroke} strokeWidth={1} rx={4} />
      <rect x={x - pw / 2 + 2} y={topY + 2} width={pw - 4} height={ph - 4}
        fill={PAL.interior} rx={3} style={{ pointerEvents: 'none' }} />
      {/* Gate apron nose */}
      <rect x={x - 15} y={tipY - 8} width={30} height={14}
        fill={PAL.buildingDk} stroke={PAL.stroke} strokeWidth={0.8} rx={2}
        style={{ pointerEvents: 'none' }} />
      {/* Pier yellow centerline */}
      <line x1={x} y1={topY + 4} x2={x} y2={tipY - 8}
        stroke={PAL.yellow} strokeWidth={1.4} strokeDasharray="6 4"
        style={{ pointerEvents: 'none' }} />
      <text x={x} y={tipY + 14}
        textAnchor="middle" fill={PAL.textMd} fontSize={7}
        fontFamily="'JetBrains Mono', monospace" fontWeight={600}
        style={{ pointerEvents: 'none' }}>
        {label}
      </text>
    </g>
  )
}

// ── Piano-key threshold marks ──────────────────────────────────────────────
function ThresholdMarks({ cx, y, dir }) {
  // dir: +1 = marks go right from cx, -1 = left
  return (
    <>
      {[-9, -5, -1, 3, 7, 11].map(o => (
        <line key={o}
          x1={cx + dir * 14} y1={y + o * 1.9}
          x2={cx + dir * 44} y2={y + o * 1.9}
          stroke={PAL.white} strokeWidth={2.8} opacity={0.85} />
      ))}
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function AirportMap({
  flights = [],
  simRef,
  onSelectFlight,
  onSelectGate,
  onSelectCargo,
  onSelectTower,
  onSelectAirport,
}) {
  // ── Layout constants ──────────────────────────────────────────────────
  // Runways
  const RWY1_Y = 82,  RWY2_Y = 572
  // Arrival taxiway (MVA strip)
  const ARR_Y  = 130
  // Terminal
  const TX = 60, TY = 162, TW = 600, TH = 76
  const T_SOUTH = TY + TH  // 238
  // Finger piers
  const PIER_TIP_Y = 305
  // Apron perimeter road
  const APR_Y = 318
  // Mid taxiways
  const MID_PAX_Y = 358, CARGO_Y = 430
  // East/West spines
  const EAST_X = 800, WEST_X = 200
  // Cargo terminal — RIGHT of east spine, between mid-pax(358) and rwy2(572)
  const CT_X = 820, CT_Y = 400, CT_W = 160, CT_H = 130
  // Control tower
  const tw = { x: 92, y: 330 }

  const PIERS = [
    { x: 155, label: 'A1' },
    { x: 255, label: 'A2' },
    { x: 360, label: 'A3' },
    { x: 465, label: 'A4' },
    { x: 565, label: 'A5' },
  ]

  const B_GATES = [
    { x: 175, label: 'B1' }, { x: 265, label: 'B2' }, { x: 355, label: 'B3' },
    { x: 445, label: 'B4' }, { x: 535, label: 'B5' }, { x: 615, label: 'B6' },
  ]

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '4px 8px',
    }}>
      <svg
        viewBox={C.viewBox}
        style={{ width: '100%', height: '100%', maxHeight: 'calc(100vh - 56px)', display: 'block', overflow: 'hidden' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#d4d2ce" strokeWidth={0.3} />
          </pattern>
          <filter id="sh">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.14" />
          </filter>
        </defs>

        {/* ── 1. BACKGROUND ──────────────────────────────────── */}
        <rect x={0} y={0} width={1000} height={700} fill={PAL.paper} />
        <rect x={0} y={0} width={1000} height={700} fill="url(#grid)" />

        {/* ── 2. RUNWAY 1 — 09L/27R — arrivals ──────────────── */}
        {/* Shoulder — clamped to x=50..950 so it doesn't bleed past the viewBox */}
        <line x1={50} y1={RWY1_Y} x2={950} y2={RWY1_Y}
          stroke={PAL.rwEdge} strokeWidth={42} strokeLinecap="butt" />
        {/* Pavement */}
        <line x1={50} y1={RWY1_Y} x2={950} y2={RWY1_Y}
          stroke={PAL.runway} strokeWidth={28} strokeLinecap="butt" />
        {/* Touchdown zone marks left */}
        <ThresholdMarks cx={65} y={RWY1_Y} dir={1} />
        {/* Touchdown zone marks right */}
        <ThresholdMarks cx={935} y={RWY1_Y} dir={-1} />
        {/* Runway centreline */}
        <line x1={120} y1={RWY1_Y} x2={880} y2={RWY1_Y}
          stroke={PAL.white} strokeWidth={2} strokeDasharray="30 15" opacity={0.8} />
        {/* Labels */}
        <text x={70} y={RWY1_Y - 16} fill={PAL.textMd} fontSize={9}
          fontFamily="'JetBrains Mono', monospace" letterSpacing={1} fontWeight={600} opacity={0.7}>
          09L
        </text>
        <text x={930} y={RWY1_Y - 16} textAnchor="end" fill={PAL.textMd} fontSize={9}
          fontFamily="'JetBrains Mono', monospace" letterSpacing={1} fontWeight={600} opacity={0.7}>
          27R
        </text>
        <text x={500} y={RWY1_Y - 18} textAnchor="middle" fill={PAL.textMd} fontSize={7}
          fontFamily="'JetBrains Mono', monospace" letterSpacing={3} opacity={0.4}>
          RUNWAY 09L/27R
        </text>

        {/* ── 3. RUNWAY 2 — 09R/27L — departures ────────────── */}
        <line x1={50} y1={RWY2_Y} x2={950} y2={RWY2_Y}
          stroke={PAL.rwEdge} strokeWidth={42} strokeLinecap="butt" />
        <line x1={50} y1={RWY2_Y} x2={950} y2={RWY2_Y}
          stroke={PAL.runway} strokeWidth={28} strokeLinecap="butt" />
        <ThresholdMarks cx={65} y={RWY2_Y} dir={1} />
        <ThresholdMarks cx={935} y={RWY2_Y} dir={-1} />
        <line x1={120} y1={RWY2_Y} x2={880} y2={RWY2_Y}
          stroke={PAL.white} strokeWidth={2} strokeDasharray="30 15" opacity={0.8} />
        <text x={70} y={RWY2_Y + 22} fill={PAL.textMd} fontSize={9}
          fontFamily="'JetBrains Mono', monospace" letterSpacing={1} fontWeight={600} opacity={0.7}>
          09L/27R
        </text>
        <text x={930} y={RWY2_Y + 22} textAnchor="end" fill={PAL.textMd} fontSize={9}
          fontFamily="'JetBrains Mono', monospace" letterSpacing={1} fontWeight={600} opacity={0.7}>
          09R/27L
        </text>
        <text x={500} y={RWY2_Y + 24} textAnchor="middle" fill={PAL.textMd} fontSize={7}
          fontFamily="'JetBrains Mono', monospace" letterSpacing={3} opacity={0.4}>
          RUNWAY 09R/27L
        </text>

        {/* ── 4. ARRIVAL TAXIWAY (MVA strip) ─────────────────── */}
        {/* Tarmac strip */}
        <line x1={50} y1={ARR_Y} x2={950} y2={ARR_Y}
          stroke="#9e9c96" strokeWidth={16} strokeLinecap="butt" />
        {/* Yellow MVA centerline */}
        <line x1={60} y1={ARR_Y} x2={940} y2={ARR_Y}
          stroke={PAL.yellowBrt} strokeWidth={2.4} strokeDasharray="24 10"
          strokeLinecap="butt" opacity={0.95} />
        <text x={500} y={ARR_Y - 9} textAnchor="middle" fill={PAL.yellowBrt}
          fontSize={5.5} fontFamily="'JetBrains Mono', monospace"
          letterSpacing={2.5} opacity={0.7} style={{ pointerEvents: 'none' }}>
          ARRIVAL TAXIWAY — TWY A
        </text>

        {/* ── 5. TAXIWAY NETWORK ─────────────────────────────── */}
        {/*
          Real airport logic:
          - East spine (x=800): connects arrival taxiway → mid-pax taxiway → cargo taxiway → rwy2
          - West spine (x=200): connects rwy1 shoulder → terminal apron → mid-pax → cargo → rwy2
          - Mid-pax taxiway (y=358): runs full width, planes route from spines to gate piers
          - Cargo taxiway (y=430): serves cargo bays on south side
          - Apron road (y=318): runs between pier bases and mid-taxiway
          - Pier spurs: short N-S links from apron road to each pier base
          - Departure: gate pier → apron road → west spine → rwy2 (or mid-pax → west spine)
        */}

        {/* East spine: arrival twy → rwy2 — straight vertical, no runway overlap */}
        <Twy d={`M ${EAST_X},${ARR_Y + 8} L ${EAST_X},${RWY2_Y - 14}`} w={20} />
        {/* East spine — smooth curve east onto arrival taxiway */}
        <Twy d={`M ${EAST_X},${ARR_Y + 8} Q ${EAST_X},${ARR_Y} ${EAST_X + 20},${ARR_Y}`} w={16} yw={1.4} />
        {/* East spine — smooth curve east onto rwy2 */}
        <Twy d={`M ${EAST_X},${RWY2_Y - 14} Q ${EAST_X},${RWY2_Y} ${EAST_X + 20},${RWY2_Y}`} w={16} yw={1.4} />

        {/* West spine: arrival twy → rwy2 — straight vertical */}
        <Twy d={`M ${WEST_X},${ARR_Y + 8} L ${WEST_X},${RWY2_Y - 14}`} w={20} />
        {/* West spine — smooth curve west onto arrival taxiway */}
        <Twy d={`M ${WEST_X},${ARR_Y + 8} Q ${WEST_X},${ARR_Y} ${WEST_X - 20},${ARR_Y}`} w={16} yw={1.4} />
        {/* West spine — smooth curve west onto rwy2 */}
        <Twy d={`M ${WEST_X},${RWY2_Y - 14} Q ${WEST_X},${RWY2_Y} ${WEST_X - 20},${RWY2_Y}`} w={16} yw={1.4} />

        {/* Mid-pax taxiway: west spine → east spine only (not into cargo zone) */}
        <Twy d={`M ${WEST_X},${MID_PAX_Y} L ${EAST_X},${MID_PAX_Y}`} w={18} />

        {/* Cargo taxiway: west spine → east spine (buildings are right of east spine) */}
        <Twy d={`M ${WEST_X},${CARGO_Y} L ${EAST_X},${CARGO_Y}`} w={18} />

        {/* Centre connector: arrival twy → mid-pax */}
        <Twy d={`M 500,${ARR_Y + 9} L 500,${MID_PAX_Y}`} w={16} />

        {/* Apron perimeter road: west spine → east end of terminal */}
        <Twy d={`M ${WEST_X},${APR_Y} L 660,${APR_Y}`} w={15} />
        {/* Apron road curves south to meet mid-pax taxiway */}
        <Twy d={`M 660,${APR_Y} Q 680,${APR_Y} 680,${APR_Y + 18} L 680,${MID_PAX_Y}`} w={15} yw={1.3} />

        {/* Pier spurs: north-south links from apron road to mid-pax */}
        {PIERS.map(p => (
          <Twy key={p.label} d={`M ${p.x},${APR_Y} L ${p.x},${MID_PAX_Y}`} w={14} yw={1.2} />
        ))}

        {/* West spine exit spur — short curve to arrival taxiway (already handled above) */}

        {/* Cargo terminal access: stub east from east spine at cargo taxiway level */}
        <Twy d={`M ${EAST_X},${CT_Y + CT_H / 2} L ${CT_X},${CT_Y + CT_H / 2}`} w={14} yw={1.2} />


        {/* ── 6. APRON FILL ──────────────────────────────────── */}
        {/* Passenger apron — the paved area between terminal and mid-taxiway */}
        <rect x={WEST_X - 2} y={T_SOUTH} width={480} height={APR_Y - T_SOUTH}
          fill={PAL.tarmacDk} opacity={0.28} />
        {/* Cargo apron strip — south of cargo taxiway */}
        <rect x={220} y={CARGO_Y + 10} width={CT_X - 230} height={50}
          fill={PAL.tarmacDk} opacity={0.22} />

        {/* ── 7. TERMINAL CONCOURSE A ────────────────────────── */}
        <rect x={TX} y={TY} width={TW} height={TH}
          fill={PAL.building} stroke={PAL.stroke} strokeWidth={1.5} rx={14}
          filter="url(#sh)"
          onClick={onSelectAirport} style={{ cursor: 'pointer' }} />
        <rect x={TX + 5} y={TY + 5} width={TW - 10} height={TH - 10}
          fill={PAL.interior} rx={10} style={{ pointerEvents: 'none' }} />
        {/* Interior rooms — check-in counters */}
        {[0, 1, 2, 3, 4].map(i => (
          <rect key={i} x={TX + 24 + i * 100} y={TY + 12} width={72} height={20}
            fill="none" stroke={PAL.strokeLt} strokeWidth={0.7} rx={2}
            style={{ pointerEvents: 'none' }} />
        ))}
        {/* Terminal label */}
        <text x={TX + TW / 2} y={TY + TH / 2 + 4}
          textAnchor="middle" fill={PAL.text} fontSize={10}
          fontFamily="'JetBrains Mono', monospace" letterSpacing={3.5} fontWeight={700}
          style={{ pointerEvents: 'none' }}>
          TERMINAL CONCOURSE A
        </text>

        {/* ── 8. FINGER PIERS (A-gates) ──────────────────────── */}
        {PIERS.map(p => (
          <FingerPier key={p.label} x={p.x}
            topY={T_SOUTH} tipY={PIER_TIP_Y}
            label={p.label}
            onSelect={() => onSelectGate?.(p.label)} />
        ))}

        {/* ── 9. B-GATES (north face of terminal) ────────────── */}
        {B_GATES.map(g => (
          <g key={g.label} onClick={() => onSelectGate?.(g.label)} style={{ cursor: 'pointer' }}>
            <rect x={g.x - 6} y={TY - 4} width={12} height={8}
              fill={PAL.buildingDk} stroke={PAL.stroke} strokeWidth={0.8} rx={1.5} />
            <text x={g.x} y={TY - 9}
              textAnchor="middle" fill={PAL.textMd} fontSize={6.5}
              fontFamily="'JetBrains Mono', monospace" fontWeight={600}
              style={{ pointerEvents: 'none' }}>
              {g.label}
            </text>
          </g>
        ))}

        {/* ── 10. CARGO TERMINAL ─────────────────────────────── */}
        {/* Positioned bottom-right: x=705, y=378 — between mid-pax(358) and rwy2(572) */}
        <g onClick={onSelectCargo} style={{ cursor: 'pointer' }}>
          <rect x={CT_X} y={CT_Y} width={CT_W} height={CT_H}
            fill={PAL.building} stroke={PAL.stroke} strokeWidth={1.4} rx={7}
            filter="url(#sh)" />
          <rect x={CT_X + 4} y={CT_Y + 4} width={CT_W - 8} height={CT_H - 8}
            fill={PAL.interior} rx={5} style={{ pointerEvents: 'none' }} />
          {/* Interior rooms */}
          <rect x={CT_X + 12} y={CT_Y + 12} width={CT_W / 2 - 18} height={CT_H - 24}
            fill="none" stroke={PAL.strokeLt} strokeWidth={0.7} rx={2}
            style={{ pointerEvents: 'none' }} />
          <rect x={CT_X + CT_W / 2 + 4} y={CT_Y + 12} width={CT_W / 2 - 18} height={CT_H - 24}
            fill="none" stroke={PAL.strokeLt} strokeWidth={0.7} rx={2}
            style={{ pointerEvents: 'none' }} />
          <text x={CT_X + CT_W / 2} y={CT_Y + CT_H / 2}
            textAnchor="middle" fill={PAL.text} fontSize={8.5}
            fontFamily="'JetBrains Mono', monospace" letterSpacing={2} fontWeight={700}
            style={{ pointerEvents: 'none' }}>
            CARGO
          </text>
          <text x={CT_X + CT_W / 2} y={CT_Y + CT_H / 2 + 13}
            textAnchor="middle" fill={PAL.text} fontSize={8.5}
            fontFamily="'JetBrains Mono', monospace" letterSpacing={2} fontWeight={700}
            style={{ pointerEvents: 'none' }}>
            TERMINAL
          </text>
        </g>
        {/* (cargo access stub already drawn in taxiway network section) */}

        {/* ── 11. CARGO BAYS ─────────────────────────────────── */}
        {C.cargoBays.map(b => (
          <g key={b.id} onClick={onSelectCargo} style={{ cursor: 'pointer' }}>
            <rect x={b.x - 7} y={b.y - 7} width={14} height={14}
              fill={PAL.buildingDk} stroke={PAL.stroke} strokeWidth={1} rx={2.5} />
            <line x1={b.x} y1={b.y + 7} x2={b.x} y2={b.y + 16}
              stroke={PAL.yellow} strokeWidth={1.3} />
            <text x={b.x} y={b.y + 26}
              textAnchor="middle" fill={PAL.textMd} fontSize={6.5}
              fontFamily="'JetBrains Mono', monospace" fontWeight={600}
              style={{ pointerEvents: 'none' }}>
              {b.label}
            </text>
          </g>
        ))}


        {/* ── 13. CONTROL TOWER ──────────────────────────────── */}
        <g onClick={onSelectTower} style={{ cursor: 'pointer' }}>
          {/* Shaft */}
          <rect x={tw.x - 5} y={tw.y + 18} width={10} height={40}
            fill={PAL.buildingDk} stroke={PAL.stroke} strokeWidth={0.8} />
          {/* Cab */}
          <rect x={tw.x - 14} y={tw.y - 2} width={28} height={24}
            fill={PAL.buildingDk} stroke={PAL.stroke} strokeWidth={1} rx={3} />
          {/* Overhang */}
          <rect x={tw.x - 18} y={tw.y - 9} width={36} height={8}
            fill={PAL.stroke} rx={1.5} />
          {/* Windows */}
          {[-7, 0, 7].map(ox => (
            <rect key={ox} x={tw.x + ox - 3} y={tw.y + 2} width={5} height={11}
              fill={PAL.window} rx={1} opacity={0.75}
              style={{ pointerEvents: 'none' }} />
          ))}
          {/* Antenna */}
          <line x1={tw.x} y1={tw.y - 9} x2={tw.x} y2={tw.y - 28}
            stroke={PAL.strokeMd} strokeWidth={1} />
          {/* Rotating radar dish */}
          <circle cx={tw.x} cy={tw.y - 30} r={6}
            fill="none" stroke={PAL.strokeMd} strokeWidth={1}
            strokeDasharray="3 2" opacity={0.65}>
            <animateTransform attributeName="transform" type="rotate"
              from={`0 ${tw.x} ${tw.y - 30}`} to={`360 ${tw.x} ${tw.y - 30}`}
              dur="4s" repeatCount="indefinite" />
          </circle>
          <text x={tw.x} y={tw.y + 72} fill={PAL.textMd} fontSize={7}
            fontFamily="'JetBrains Mono', monospace" textAnchor="middle"
            letterSpacing={2} style={{ pointerEvents: 'none' }}>
            TWR
          </text>
        </g>

        {/* ── 14. NORTH COMPASS ──────────────────────────────── */}
        <g style={{ pointerEvents: 'none' }}>
          <circle cx={42} cy={42} r={24}
            fill={PAL.paper} stroke={PAL.stroke} strokeWidth={1.4} opacity={0.92} />
          <circle cx={42} cy={42} r={18}
            fill="none" stroke={PAL.strokeLt} strokeWidth={0.6} opacity={0.7} />
          {/* N-arrow: solid north half, outlined south half */}
          <path d="M 42,24 L 38,46 L 42,42 L 46,46 Z"
            fill={PAL.stroke} opacity={0.85} />
          <path d="M 42,60 L 38,46 L 42,50 L 46,46 Z"
            fill="none" stroke={PAL.stroke} strokeWidth={1} opacity={0.5} />
          <text x={42} y={22} textAnchor="middle" fill={PAL.stroke}
            fontSize={9} fontFamily="'JetBrains Mono', monospace" fontWeight={800}>N</text>
        </g>

        {/* ── 15. AX BADGE ───────────────────────────────────── */}
        <g style={{ pointerEvents: 'none' }}>
          <circle cx={944} cy={222} r={40}
            fill={PAL.paper} stroke={PAL.stroke} strokeWidth={1.8} />
          <circle cx={944} cy={222} r={34}
            fill="none" stroke={PAL.stroke} strokeWidth={0.7} />
          <text x={944} y={218} textAnchor="middle"
            fill={PAL.text} fontSize={20} fontFamily="'JetBrains Mono', monospace"
            fontWeight={800} letterSpacing={2}>AX</text>
          <text x={944} y={234} textAnchor="middle"
            fill={PAL.textMd} fontSize={5.5}
            fontFamily="'JetBrains Mono', monospace" letterSpacing={2.5}>
            AIRPORT OPERATIONS
          </text>
        </g>

        {/* ── 16. PERIMETER ──────────────────────────────────── */}
        <rect x={5} y={5} width={990} height={690}
          fill="none" stroke="#c4c0bc" strokeWidth={0.7}
          strokeDasharray="8 5" opacity={0.5} />

        {/* ── AIRCRAFT LAYER (always on top) ─────────────────── */}
        <AircraftLayer flights={flights} simRef={simRef} onSelectFlight={onSelectFlight} />
      </svg>
    </div>
  )
}

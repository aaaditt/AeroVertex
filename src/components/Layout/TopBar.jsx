// Maps sim seconds (0–86400) to a clock string "06:00"–"22:00"
function simSecondToTime(s) {
  const totalMinutes = Math.floor((s / 86400) * (22 * 60 - 6 * 60)) + 6 * 60
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const m = (totalMinutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

const SPEED_OPTIONS = [
  { label: '⏸', value: 0 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
]

export default function TopBar({ currentSimSecond = 0, flightCount = 0, simSpeed = 1, onSetSpeed }) {
  const timeStr = simSecondToTime(currentSimSecond)

  return (
    <header style={{
      height: 48,
      background: '#0a1628',
      borderBottom: '1px solid #1e3a5f',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 24,
      flexShrink: 0,
    }}>
      {/* Brand */}
      <span style={{
        fontFamily: 'monospace',
        fontWeight: 800,
        fontSize: 15,
        color: '#60a5fa',
        letterSpacing: '2px',
        userSelect: 'none',
      }}>
        ✈ AEROVERTEX
      </span>

      <div style={{ width: 1, height: 24, background: '#1e3a5f' }} />

      {/* Sim clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#4b7fbd', letterSpacing: 1 }}>SIM TIME</span>
        <span style={{
          fontFamily: 'monospace',
          fontSize: 18,
          fontWeight: 700,
          color: '#e2e8f0',
          letterSpacing: 2,
          minWidth: 54,
        }}>
          {timeStr}
        </span>
      </div>

      <div style={{ width: 1, height: 24, background: '#1e3a5f' }} />

      {/* Flight count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#4b7fbd', letterSpacing: 1 }}>FLIGHTS</span>
        <span style={{
          fontFamily: 'monospace',
          fontSize: 16,
          fontWeight: 700,
          color: '#4ade80',
          minWidth: 24,
        }}>
          {flightCount}
        </span>
      </div>

      {/* Speed controls — pushed to right */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
        {SPEED_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSetSpeed?.(opt.value)}
            style={{
              padding: '4px 12px',
              background: simSpeed === opt.value ? '#1e3a5f' : 'transparent',
              border: '1px solid',
              borderColor: simSpeed === opt.value ? '#60a5fa' : '#1e3a5f',
              color: simSpeed === opt.value ? '#60a5fa' : '#4b7fbd',
              fontFamily: 'monospace',
              fontSize: 12,
              cursor: 'pointer',
              borderRadius: 3,
              transition: 'all 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </header>
  )
}

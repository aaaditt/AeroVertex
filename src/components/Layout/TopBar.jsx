// sim-second 0 = 06:00, sim-second 1800 = 22:00  (16 real hours compressed)
function simSecondToTime(s) {
  const totalMinutes = Math.floor((s / 1800) * (16 * 60)) + 6 * 60
  const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0')
  const m = (totalMinutes % 60).toString().padStart(2, '0')
  return `${h}:${m}`
}

const SPEED_OPTIONS = [
  { label: '⏸',  value: 0  },
  { label: '3×',  value: 3  },
  { label: '6×',  value: 6  },
  { label: '12×', value: 12 },
]

export default function TopBar({ currentSimSecond = 0, flightCount = 0, simSpeed = 6, onSetSpeed }) {
  const timeStr = simSecondToTime(currentSimSecond)
  const progress = Math.round((currentSimSecond / 1800) * 100)

  return (
    <header style={{
      height: 48,
      background: '#0a1628',
      borderBottom: '1px solid #1e3a5f',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 20,
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Brand */}
      <span style={{
        fontFamily: 'monospace',
        fontWeight: 800,
        fontSize: 15,
        color: '#60a5fa',
        letterSpacing: '2px',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}>
        ✈ AEROVERTEX
      </span>

      <div style={{ width: 1, height: 24, background: '#1e3a5f', flexShrink: 0 }} />

      {/* Sim clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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

      {/* Progress bar */}
      <div style={{
        flex: 1,
        height: 3,
        background: '#1e3a5f',
        borderRadius: 2,
        overflow: 'hidden',
        maxWidth: 200,
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
          borderRadius: 2,
          transition: 'width 0.8s linear',
        }} />
      </div>

      <div style={{ width: 1, height: 24, background: '#1e3a5f', flexShrink: 0 }} />

      {/* Flight count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
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

      {/* Speed controls */}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexShrink: 0 }}>
        {SPEED_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => onSetSpeed?.(opt.value)}
            style={{
              padding: '4px 10px',
              background: simSpeed === opt.value ? '#1e3a5f' : 'transparent',
              border: '1px solid',
              borderColor: simSpeed === opt.value ? '#60a5fa' : '#1e3a5f',
              color: simSpeed === opt.value ? '#60a5fa' : '#4b7fbd',
              fontFamily: 'monospace',
              fontSize: 11,
              cursor: 'pointer',
              borderRadius: 3,
              transition: 'all 0.15s',
              minWidth: 36,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </header>
  )
}

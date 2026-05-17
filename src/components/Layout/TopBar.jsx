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
      background: '#f0f0eb',
      borderBottom: '1px solid #c8c8c0',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 20,
      flexShrink: 0,
    }}>
      {/* Brand */}
      <span style={{
        fontFamily: 'monospace',
        fontWeight: 800,
        fontSize: 15,
        color: '#e67e22',
        letterSpacing: '2px',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}>
        ✈ AEROVERTEX
      </span>

      <div style={{ width: 1, height: 24, background: '#c8c8c0', flexShrink: 0 }} />

      {/* Sim clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#666660', letterSpacing: 1 }}>SIM TIME</span>
        <span style={{
          fontFamily: 'monospace',
          fontSize: 18,
          fontWeight: 700,
          color: '#1a1a1a',
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
        background: '#e8e8e2',
        borderRadius: 2,
        overflow: 'hidden',
        maxWidth: 200,
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: 'linear-gradient(90deg, #e67e22, #d35400)',
          borderRadius: 2,
          transition: 'width 0.8s linear',
        }} />
      </div>

      <div style={{ width: 1, height: 24, background: '#c8c8c0', flexShrink: 0 }} />

      {/* Flight count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#666660', letterSpacing: 1 }}>FLIGHTS</span>
        <span style={{
          fontFamily: 'monospace',
          fontSize: 16,
          fontWeight: 700,
          color: '#27ae60',
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
              background: simSpeed === opt.value ? '#fff5ee' : 'transparent',
              border: '1px solid',
              borderColor: simSpeed === opt.value ? '#e67e22' : '#c8c8c0',
              color: simSpeed === opt.value ? '#e67e22' : '#666660',
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

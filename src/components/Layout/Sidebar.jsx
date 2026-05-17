import { useState, useEffect } from 'react'

const NAV_ITEMS = [
  { id: 'map',     icon: '◈', label: 'Map' },
  { id: 'atc',     icon: '📡', label: 'ATC' },
  { id: 'cargo',   icon: '📦', label: 'Cargo' },
  { id: 'airport', icon: '🏢', label: 'Airport' },
  { id: 'boards',  icon: '📋', label: 'Boards' },
  { id: 'stats',   icon: '📊', label: 'Stats' },
]

export default function Sidebar({ activeModule, onNavigate }) {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 900)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)')
    const handler = e => setNarrow(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <nav style={{
      width: narrow ? 48 : 72,
      background: '#0a1628',
      borderRight: '1px solid #1e3a5f',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: 8,
      flexShrink: 0,
      transition: 'width 0.2s ease',
    }}>
      {NAV_ITEMS.map(item => {
        const active = activeModule === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            title={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: narrow ? '12px 0' : '12px 0',
              background: 'none',
              border: 'none',
              borderLeft: active ? '3px solid #60a5fa' : '3px solid transparent',
              color: active ? '#60a5fa' : '#4b7fbd',
              cursor: 'pointer',
              fontSize: narrow ? 20 : 18,
              transition: 'color 0.15s, border-color 0.15s',
              width: '100%',
            }}
          >
            <span style={{ lineHeight: 1 }}>{item.icon}</span>
            {!narrow && (
              <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}>
                {item.label}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

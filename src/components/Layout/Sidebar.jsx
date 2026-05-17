const NAV_ITEMS = [
  { id: 'map',     icon: '◈', label: 'Map' },
  { id: 'atc',     icon: '📡', label: 'ATC' },
  { id: 'cargo',   icon: '📦', label: 'Cargo' },
  { id: 'airport', icon: '🏢', label: 'Airport' },
  { id: 'boards',  icon: '📋', label: 'Boards' },
  { id: 'stats',   icon: '📊', label: 'Stats' },
]

export default function Sidebar({ activeModule, onNavigate }) {
  return (
    <nav style={{
      width: 72,
      background: '#0a1628',
      borderRight: '1px solid #1e3a5f',
      display: 'flex',
      flexDirection: 'column',
      paddingTop: 8,
      flexShrink: 0,
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
              padding: '12px 0',
              background: 'none',
              border: 'none',
              borderLeft: active ? '3px solid #60a5fa' : '3px solid transparent',
              color: active ? '#60a5fa' : '#4b7fbd',
              cursor: 'pointer',
              fontSize: 18,
              transition: 'color 0.15s, border-color 0.15s',
              width: '100%',
            }}
          >
            <span style={{ lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, textTransform: 'uppercase' }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

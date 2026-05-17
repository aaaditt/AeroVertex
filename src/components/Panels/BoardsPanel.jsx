import { useState, useEffect } from 'react'

const STATUS_COLORS = {
  Inbound:   '#60a5fa',
  Taxiing:   '#4ade80',
  At_Gate:   '#fbbf24',
  Boarding:  '#c084fc',
  Pushback:  '#f87171',
  Departed:  '#a78bfa',
  Delayed:   '#f87171',
  default:   '#94a3b8',
}

function statusColor(s) { return STATUS_COLORS[s] ?? STATUS_COLORS.default }

function fmtSecs(secs) {
  if (secs == null) return '—:——'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── FIDS row ────────────────────────────────────────────────────────────────
function BoardRow({ flight, type, even }) {
  const sc = statusColor(flight.status)
  const isDelayed = flight.status === 'Delayed'
  return (
    <tr style={{
      background: even ? '#060e1a' : '#080f1e',
      borderBottom: '1px solid #0d1628',
    }}>
      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: '#e2e8f0', letterSpacing: 1 }}>
        {flight.flight_number}
      </td>
      <td style={{ ...td, color: '#94a3b8' }}>
        {type === 'arrivals' ? (flight.origin_airport ?? '—') : (flight.destination_airport ?? '—')}
      </td>
      <td style={{ ...td, fontFamily: 'monospace', color: '#60a5fa' }}>
        {fmtSecs(type === 'arrivals' ? flight.sim_arrival_sec : flight.sim_departure_sec)}
      </td>
      <td style={td}>
        <span style={{
          background: sc + '22',
          color: sc,
          fontSize: 10,
          fontFamily: 'monospace',
          padding: '2px 8px',
          borderRadius: 10,
          border: `1px solid ${sc}44`,
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
          fontWeight: isDelayed ? 700 : 400,
        }}>
          {flight.status?.replace('_', ' ').toUpperCase() ?? '—'}
        </span>
      </td>
      <td style={{ ...td, fontFamily: 'monospace', color: '#64748b', textAlign: 'right' }}>
        {flight.gate_label ?? flight.bay_label ?? '—'}
      </td>
    </tr>
  )
}

const td = { padding: '9px 12px', fontSize: 13, verticalAlign: 'middle' }

const thStyle = {
  padding: '9px 12px',
  textAlign: 'left',
  color: '#475569',
  fontFamily: 'monospace',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  borderBottom: '2px solid #1e3a5f',
  background: '#0a1628',
  whiteSpace: 'nowrap',
}

// ── Board table ─────────────────────────────────────────────────────────────
function Board({ rows, type }) {
  const sorted = [...rows].sort((a, b) => {
    const ta = type === 'arrivals' ? (a.sim_arrival_sec ?? 0) : (a.sim_departure_sec ?? 0)
    const tb = type === 'arrivals' ? (b.sim_arrival_sec ?? 0) : (b.sim_departure_sec ?? 0)
    return ta - tb
  })

  const headers = type === 'arrivals'
    ? ['Flight', 'From', 'Scheduled', 'Status', 'Gate']
    : ['Flight', 'To', 'Scheduled', 'Status', 'Gate']

  return (
    <div style={{ overflowX: 'auto' }}>
      {sorted.length === 0 ? (
        <div style={{ color: '#334155', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: '32px' }}>
          No {type} scheduled
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={h} style={i === headers.length - 1 ? { ...thStyle, textAlign: 'right' } : thStyle}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => (
              <BoardRow key={f.flight_id ?? f.flight_number ?? i} flight={f} type={type} even={i % 2 === 0} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function BoardsPanel() {
  const [tab, setTab] = useState('arrivals')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  function fetchData() {
    fetch('/api/boards')
      .then(r => r.json())
      .then(d => { setData(d); setError(null); setLastRefresh(new Date()) })
      .catch(() => setError('Failed to load boards data.'))
  }

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 5000)
    return () => clearInterval(id)
  }, [])

  const arrivals   = data?.arrivals ?? []
  const departures = data?.departures ?? []

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: '#060e1a',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid #1e3a5f',
        background: '#0a1628',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <h2 style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 14, letterSpacing: 2, fontWeight: 700 }}>
          FLIGHT INFORMATION DISPLAY
        </h2>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastRefresh && (
            <span style={{ color: '#334155', fontFamily: 'monospace', fontSize: 10 }}>
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <span style={{
            background: '#1c3a1c',
            color: '#4ade80',
            fontSize: 10,
            fontFamily: 'monospace',
            padding: '2px 8px',
            borderRadius: 10,
            border: '1px solid #4ade8044',
            letterSpacing: 0.5,
          }}>
            AUTO · 5s
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #1e3a5f',
        background: '#0a1628',
        flexShrink: 0,
      }}>
        {[
          { id: 'arrivals',   label: `ARRIVALS   (${arrivals.length})`,   accent: '#60a5fa' },
          { id: 'departures', label: `DEPARTURES (${departures.length})`, accent: '#4ade80' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? `2px solid ${t.accent}` : '2px solid transparent',
              color: tab === t.id ? t.accent : '#475569',
              fontFamily: 'monospace',
              fontSize: 11,
              letterSpacing: 1.5,
              padding: '10px 20px',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ color: '#f87171', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: '12px' }}>
          {error}
        </div>
      )}

      {/* Board content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'arrivals'
          ? <Board rows={arrivals} type="arrivals" />
          : <Board rows={departures} type="departures" />
        }
      </div>
    </div>
  )
}

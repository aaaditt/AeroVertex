import { useState, useEffect } from 'react'

const STATUS_COLORS = {
  Inbound:   '#27ae60',
  Taxiing:   '#27ae60',
  At_Gate:   '#e67e22',
  Boarding:  '#e67e22',
  Pushback:  '#c0392b',
  Departed:  '#666660',
  Delayed:   '#c0392b',
  default:   '#666660',
}

function statusColor(s) { return STATUS_COLORS[s] ?? STATUS_COLORS.default }

function fmtSecs(secs) {
  if (secs == null) return '—:——'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function BoardRow({ flight, type, even }) {
  const sc = statusColor(flight.status)
  const isDelayed = flight.status === 'Delayed'
  return (
    <tr style={{
      background: even ? '#ffffff' : '#f8f8f4',
      borderBottom: '1px solid #f0f0eb',
    }}>
      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700, color: '#1a1a1a', letterSpacing: 1 }}>
        {flight.flight_number}
      </td>
      <td style={{ ...td, color: '#666660' }}>
        {type === 'arrivals' ? (flight.origin_airport ?? '—') : (flight.destination_airport ?? '—')}
      </td>
      <td style={{ ...td, fontFamily: 'monospace', color: '#e67e22' }}>
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
      <td style={{ ...td, fontFamily: 'monospace', color: '#666660', textAlign: 'right' }}>
        {flight.gate_label ?? flight.bay_label ?? '—'}
      </td>
    </tr>
  )
}

const td = { padding: '9px 12px', fontSize: 13, verticalAlign: 'middle' }

const thStyle = {
  padding: '9px 12px',
  textAlign: 'left',
  color: '#666660',
  fontFamily: 'monospace',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  borderBottom: '2px solid #c8c8c0',
  background: '#f0f0eb',
  whiteSpace: 'nowrap',
}

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
        <div style={{ color: '#c8c8c0', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: '32px' }}>
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

export default function BoardsPanel({ simSecond = 0 }) {
  const [tab, setTab] = useState('arrivals')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const bucketSec = Math.floor(simSecond / 5) * 5

  useEffect(() => {
    function fetchData() {
      fetch(`/api/boards?sec=${bucketSec}`)
        .then(r => r.json())
        .then(d => { setData(d); setError(null); setLastRefresh(new Date()) })
        .catch(() => setError('Failed to load boards data.'))
    }
    fetchData()
    const id = setInterval(fetchData, 3000)
    return () => clearInterval(id)
  }, [bucketSec])

  const arrivals   = data?.arrivals ?? []
  const departures = data?.departures ?? []

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f5f5f0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderBottom: '1px solid #c8c8c0',
        background: '#f0f0eb',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <h2 style={{ color: '#1a1a1a', fontFamily: 'monospace', fontSize: 14, letterSpacing: 2, fontWeight: 700 }}>
          FLIGHT INFORMATION DISPLAY
        </h2>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastRefresh && (
            <span style={{ color: '#c8c8c0', fontFamily: 'monospace', fontSize: 10 }}>
              {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <span style={{
            background: 'rgba(39,174,96,0.12)',
            color: '#27ae60',
            fontSize: 10,
            fontFamily: 'monospace',
            padding: '2px 8px',
            borderRadius: 10,
            border: '1px solid rgba(39,174,96,0.3)',
            letterSpacing: 0.5,
          }}>
            AUTO · 5s
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #c8c8c0', background: '#f0f0eb', flexShrink: 0 }}>
        {[
          { id: 'arrivals',   label: `ARRIVALS   (${arrivals.length})`,   accent: '#e67e22' },
          { id: 'departures', label: `DEPARTURES (${departures.length})`, accent: '#27ae60' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? `2px solid ${t.accent}` : '2px solid transparent',
              color: tab === t.id ? t.accent : '#666660',
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
        <div style={{ color: '#c0392b', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', padding: '12px' }}>
          {error}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'arrivals'
          ? <Board rows={arrivals} type="arrivals" />
          : <Board rows={departures} type="departures" />
        }
      </div>
    </div>
  )
}

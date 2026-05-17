import { useState, useEffect } from 'react'

const STATUS_COLORS = {
  Inbound:   { bg: '#1e3a5f', text: '#60a5fa' },
  Taxiing:   { bg: '#1c2e1c', text: '#4ade80' },
  At_Gate:   { bg: '#2a2a1c', text: '#fbbf24' },
  Boarding:  { bg: '#2a1c2a', text: '#c084fc' },
  Pushback:  { bg: '#2a1c1c', text: '#f87171' },
  Departed:  { bg: '#1a1a2a', text: '#a78bfa' },
  default:   { bg: '#1e2535', text: '#94a3b8' },
}

function statusStyle(status) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.default
}

function fmtSecs(secs) {
  if (secs == null) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ── Single flight row ───────────────────────────────────────────────────────
function FlightRow({ flight }) {
  const sc = statusStyle(flight.status)
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr auto',
      gap: '4px 8px',
      alignItems: 'center',
      padding: '8px 10px',
      borderBottom: '1px solid #0d1e38',
      background: '#0a1628',
    }}>
      <span style={{
        fontFamily: 'monospace',
        fontWeight: 700,
        fontSize: 13,
        color: '#e2e8f0',
        letterSpacing: 1,
      }}>
        {flight.flight_number}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace' }}>
          {flight.airline_iata ?? flight.airline_name ?? ''}
        </span>
        <span style={{ color: '#94a3b8', fontSize: 11 }}>
          {flight.aircraft_model ?? flight.aircraft_type ?? '—'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <span style={{ color: '#64748b', fontSize: 10, fontFamily: 'monospace' }}>
          {fmtSecs(flight.sim_arrival_sec ?? flight.sim_departure_sec)}
        </span>
        <span style={{
          background: sc.bg,
          color: sc.text,
          fontSize: 9,
          fontFamily: 'monospace',
          padding: '1px 6px',
          borderRadius: 10,
          letterSpacing: 0.5,
          border: `1px solid ${sc.text}33`,
          whiteSpace: 'nowrap',
        }}>
          {flight.status?.replace('_', ' ').toUpperCase()}
        </span>
      </div>
    </div>
  )
}

// ── Queue column ────────────────────────────────────────────────────────────
function QueueColumn({ title, accent, flights, emptyMsg }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: '#0d1e38',
      border: '1px solid #1e3a5f',
      borderRadius: 6,
      overflow: 'hidden',
      minHeight: 0,
    }}>
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid #1e3a5f',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#0a1628',
        flexShrink: 0,
      }}>
        <span style={{ color: accent, fontSize: 10, fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: 700 }}>
          {title}
        </span>
        <span style={{
          marginLeft: 'auto',
          background: accent + '22',
          color: accent,
          fontSize: 10,
          fontFamily: 'monospace',
          padding: '1px 7px',
          borderRadius: 10,
          border: `1px solid ${accent}44`,
        }}>
          {flights.length}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {flights.length === 0 ? (
          <div style={{ color: '#334155', fontFamily: 'monospace', fontSize: 11, textAlign: 'center', padding: '20px 12px' }}>
            {emptyMsg}
          </div>
        ) : (
          flights.map(f => <FlightRow key={f.flight_id ?? f.id} flight={f} />)
        )}
      </div>
    </div>
  )
}

// ── Event log row ───────────────────────────────────────────────────────────
function EventRow({ event }) {
  const oldSc = statusStyle(event.old_status)
  const newSc = statusStyle(event.new_status)
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto auto 1fr auto',
      gap: '0 10px',
      alignItems: 'center',
      padding: '6px 14px',
      borderBottom: '1px solid #0d1e38',
      fontSize: 11,
    }}>
      <span style={{ fontFamily: 'monospace', color: '#60a5fa', fontWeight: 600, fontSize: 12 }}>
        {event.flight_number ?? '—'}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ background: oldSc.bg, color: oldSc.text, padding: '1px 5px', borderRadius: 4, fontSize: 9, fontFamily: 'monospace' }}>
          {event.old_status?.replace('_', ' ') ?? '—'}
        </span>
        <span style={{ color: '#334155', fontSize: 12 }}>→</span>
        <span style={{ background: newSc.bg, color: newSc.text, padding: '1px 5px', borderRadius: 4, fontSize: 9, fontFamily: 'monospace' }}>
          {event.new_status?.replace('_', ' ') ?? '—'}
        </span>
      </div>
      <span /> {/* spacer */}
      <span style={{ color: '#475569', fontFamily: 'monospace', fontSize: 10, whiteSpace: 'nowrap' }}>
        {fmtSecs(event.sim_second)}
      </span>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ATCConsole() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  function fetchData() {
    fetch('/api/atc')
      .then(r => r.json())
      .then(d => { setData(d); setError(null) })
      .catch(() => setError('Failed to load ATC data.'))
  }

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 3000)
    return () => clearInterval(id)
  }, [])

  const flights = data?.flights ?? []
  const events  = data?.events ?? []

  const inbound   = flights.filter(f => f.status === 'Inbound' || f.status === 'Taxiing')
    .sort((a, b) => (a.sim_arrival_sec ?? 0) - (b.sim_arrival_sec ?? 0))
  const onGround  = flights.filter(f => f.status === 'At_Gate' || f.status === 'Boarding')
  const departure = flights.filter(f => f.status === 'Pushback')
    .sort((a, b) => (a.sim_departure_sec ?? 0) - (b.sim_departure_sec ?? 0))

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      gap: 16,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 11, letterSpacing: 3 }}>
          ◈
        </span>
        <h2 style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 14, letterSpacing: 2, fontWeight: 700 }}>
          ATC TOWER CONSOLE
        </h2>
        <div style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }}>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
          </span>
          <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 }}>
            LIVE · 3s
          </span>
        </div>
      </div>

      {error && (
        <div style={{ color: '#f87171', fontFamily: 'monospace', fontSize: 12, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Three queue columns */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 12,
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}>
        <QueueColumn
          title="INBOUND QUEUE"
          accent="#60a5fa"
          flights={inbound}
          emptyMsg="No inbound traffic"
        />
        <QueueColumn
          title="ON GROUND"
          accent="#fbbf24"
          flights={onGround}
          emptyMsg="No aircraft on ground"
        />
        <QueueColumn
          title="DEPARTURE QUEUE"
          accent="#f87171"
          flights={departure}
          emptyMsg="No departures pending"
        />
      </div>

      {/* Event Log */}
      <div style={{
        background: '#0d1e38',
        border: '1px solid #1e3a5f',
        borderRadius: 6,
        overflow: 'hidden',
        flexShrink: 0,
        maxHeight: 180,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '8px 14px',
          borderBottom: '1px solid #1e3a5f',
          background: '#0a1628',
          color: '#64748b',
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: 1.5,
          flexShrink: 0,
        }}>
          EVENT LOG
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {events.length === 0 ? (
            <div style={{ color: '#334155', fontFamily: 'monospace', fontSize: 11, textAlign: 'center', padding: '14px' }}>
              No recent events
            </div>
          ) : (
            events.map((ev, i) => <EventRow key={i} event={ev} />)
          )}
        </div>
      </div>
    </div>
  )
}

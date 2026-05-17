import { useState, useEffect } from 'react'

function StatCard({ label, value, accent = '#e67e22', sub }) {
  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${accent}44`,
      borderRadius: 6,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ color: '#666660', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 }}>
        {label.toUpperCase()}
      </span>
      <span style={{ color: accent, fontFamily: 'monospace', fontSize: 26, fontWeight: 700, lineHeight: 1 }}>
        {value ?? '—'}
      </span>
      {sub && <span style={{ color: '#666660', fontSize: 11 }}>{sub}</span>}
    </div>
  )
}

function TerminalCard({ terminal, flights }) {
  const isPax = terminal.terminal_type === 'Passenger' || terminal.terminal_name?.toLowerCase().includes('passenger')
  const accent = isPax ? '#e67e22' : '#27ae60'
  return (
    <div style={{
      background: '#ffffff',
      border: `1px solid ${accent}33`,
      borderRadius: 6,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: accent, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
          {terminal.terminal_name?.toUpperCase()}
        </span>
        <span style={{
          background: accent + '22', color: accent,
          fontSize: 9, fontFamily: 'monospace', padding: '1px 7px',
          borderRadius: 10, border: `1px solid ${accent}44`, letterSpacing: 0.5,
        }}>
          {isPax ? 'PASSENGER' : 'CARGO'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
        {terminal.gate_count != null && (
          <>
            <span style={{ color: '#666660', fontSize: 11, fontFamily: 'monospace' }}>GATES</span>
            <span style={{ color: '#1a1a1a', fontSize: 12, textAlign: 'right' }}>{terminal.gate_count}</span>
          </>
        )}
        {terminal.bay_count != null && (
          <>
            <span style={{ color: '#666660', fontSize: 11, fontFamily: 'monospace' }}>BAYS</span>
            <span style={{ color: '#1a1a1a', fontSize: 12, textAlign: 'right' }}>{terminal.bay_count}</span>
          </>
        )}
        {flights != null && (
          <>
            <span style={{ color: '#666660', fontSize: 11, fontFamily: 'monospace' }}>ACTIVE FLIGHTS</span>
            <span style={{ color: accent, fontSize: 12, textAlign: 'right', fontWeight: 600 }}>{flights}</span>
          </>
        )}
      </div>
    </div>
  )
}

function RunwayBar({ label, utilization }) {
  const pct = Number(utilization ?? 0)
  const color = pct > 75 ? '#c0392b' : pct > 50 ? '#e67e22' : '#27ae60'
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ color: '#666660', fontFamily: 'monospace', fontSize: 11, letterSpacing: 1 }}>{label}</span>
        <span style={{ color, fontFamily: 'monospace', fontSize: 11, fontWeight: 700 }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ width: '100%', height: 6, background: '#f0f0eb', borderRadius: 3, overflow: 'hidden', border: '1px solid #c8c8c0' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

export default function AirportPanel({ simSecond = 0 }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const bucketSec = Math.floor(simSecond / 5) * 5

  useEffect(() => {
    fetch(`/api/airport?sec=${bucketSec}`)
      .then(r => r.json())
      .then(d => { setData(d); setError(null) })
      .catch(() => setError('Failed to load airport data.'))
  }, [bucketSec])

  const terminals    = data?.terminals ?? []
  const runways      = data?.runways ?? []
  const util         = data?.runway_utilization ?? {}
  const freeGates    = data?.free_gates
  const flightCounts = data?.flight_counts ?? []

  const totalFlights = flightCounts.reduce((s, r) => s + Number(r.count), 0)
  const delayedCount = flightCounts.find(r => r.status === 'Delayed')?.count ?? 0
  const inboundCount = flightCounts.find(r => r.status === 'Inbound')?.count ?? 0

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18 }}>🏢</span>
        <h2 style={{ color: '#1a1a1a', fontFamily: 'monospace', fontSize: 14, letterSpacing: 2, fontWeight: 700 }}>
          AIRPORT OVERVIEW
        </h2>
      </div>

      {error && (
        <div style={{ color: '#c0392b', fontFamily: 'monospace', fontSize: 12, textAlign: 'center' }}>{error}</div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        <StatCard label="Free Gates"    value={freeGates}    accent="#e67e22" />
        <StatCard label="Total Flights" value={totalFlights} accent="#1a1a1a" />
        <StatCard label="Inbound"       value={inboundCount} accent="#27ae60" />
        <StatCard label="Delayed"       value={delayedCount} accent="#c0392b" />
      </div>

      {/* Terminals */}
      <div>
        <div style={{ color: '#666660', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, marginBottom: 10 }}>
          TERMINALS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {terminals.map(t => <TerminalCard key={t.terminal_id} terminal={t} />)}
          {terminals.length === 0 && (
            <div style={{ color: '#c8c8c0', fontFamily: 'monospace', fontSize: 11 }}>No terminal data</div>
          )}
        </div>
      </div>

      {/* Runway utilization */}
      <div style={{ background: '#ffffff', border: '1px solid #c8c8c0', borderRadius: 6, padding: '14px 16px' }}>
        <div style={{ color: '#666660', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, marginBottom: 14 }}>
          RUNWAY UTILIZATION
        </div>
        {runways.length > 0 ? (
          runways.map((rwy, i) => (
            <RunwayBar
              key={rwy.runway_id ?? i}
              label={rwy.runway_name ?? `Runway ${i + 1}`}
              utilization={util[`runway_${rwy.runway_id ?? i + 1}`] ?? (i === 0 ? util.runway_1 : util.runway_2)}
            />
          ))
        ) : (
          <>
            <RunwayBar label="Runway 1 (09R/27L)" utilization={util.runway_1} />
            <RunwayBar label="Runway 2 (09L/27R)" utilization={util.runway_2} />
          </>
        )}
      </div>

      {/* Flight status breakdown */}
      {flightCounts.length > 0 && (
        <div style={{ background: '#ffffff', border: '1px solid #c8c8c0', borderRadius: 6, padding: '14px 16px' }}>
          <div style={{ color: '#666660', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, marginBottom: 12 }}>
            FLIGHT STATUS BREAKDOWN
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {flightCounts.map(fc => (
              <div key={fc.status} style={{
                background: '#f0f0eb',
                border: '1px solid #c8c8c0',
                borderRadius: 4,
                padding: '6px 12px',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}>
                <span style={{ color: '#666660', fontFamily: 'monospace', fontSize: 10 }}>
                  {fc.status?.replace('_', ' ')}
                </span>
                <span style={{ color: '#1a1a1a', fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
                  {fc.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

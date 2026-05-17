import { useState, useEffect } from 'react'

const HANDLING_STATUS = {
  Received: { bg: '#1e2535', text: '#94a3b8', label: 'RECEIVED' },
  In_Bay:   { bg: '#1e3a5f', text: '#60a5fa', label: 'IN BAY'   },
  Loaded:   { bg: '#1c3a1c', text: '#4ade80', label: 'LOADED'   },
  Cleared:  { bg: '#0d2210', text: '#22c55e', label: 'CLEARED'  },
  default:  { bg: '#1e2535', text: '#64748b', label: '—'         },
}

function handlingStyle(status) {
  return HANDLING_STATUS[status] ?? HANDLING_STATUS.default
}

function fmtKg(val) {
  if (val == null) return '—'
  return `${Number(val).toLocaleString()} kg`
}

// ── Cargo bay card ──────────────────────────────────────────────────────────
function BayCard({ bay }) {
  const occupied = bay.flight_number != null
  return (
    <div style={{
      background: occupied ? '#0d1e38' : '#080f1e',
      border: `1px solid ${occupied ? '#1e3a5f' : '#0d1628'}`,
      borderRadius: 6,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontFamily: 'monospace',
          fontWeight: 700,
          fontSize: 13,
          color: occupied ? '#60a5fa' : '#334155',
          letterSpacing: 1,
        }}>
          {bay.label ?? bay.bay_label}
        </span>
        <span style={{
          fontSize: 9,
          fontFamily: 'monospace',
          color: '#475569',
          background: '#0a1628',
          padding: '1px 6px',
          borderRadius: 4,
          border: '1px solid #1e3a5f',
          letterSpacing: 0.5,
        }}>
          {bay.size_category?.toUpperCase() ?? '—'}
        </span>
      </div>

      {occupied ? (
        <>
          <div style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 12, letterSpacing: 0.5 }}>
            {bay.flight_number}
          </div>
          {bay.cargo_type && (
            <div style={{ color: '#64748b', fontSize: 11 }}>
              {bay.cargo_type}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: '#334155', fontFamily: 'monospace', fontSize: 11, letterSpacing: 1 }}>
          EMPTY
        </div>
      )}
    </div>
  )
}

// ── Shipment table row ──────────────────────────────────────────────────────
function ShipmentRow({ shipment, even }) {
  const hs = handlingStyle(shipment.handling_status)
  return (
    <tr style={{ background: even ? '#080f1e' : '#0a1628' }}>
      <td style={tdStyle}>{shipment.shipment_id ?? shipment.id}</td>
      <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#60a5fa' }}>
        {shipment.flight_number ?? '—'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: '#94a3b8' }}>
        {fmtKg(shipment.weight_kg)}
      </td>
      <td style={{ ...tdStyle, color: '#64748b' }}>
        {shipment.cargo_type ?? '—'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right' }}>
        <span style={{
          background: hs.bg,
          color: hs.text,
          fontSize: 9,
          fontFamily: 'monospace',
          padding: '2px 7px',
          borderRadius: 10,
          letterSpacing: 0.5,
          border: `1px solid ${hs.text}44`,
          whiteSpace: 'nowrap',
        }}>
          {hs.label}
        </span>
      </td>
    </tr>
  )
}

const tdStyle = {
  padding: '8px 12px',
  borderBottom: '1px solid #0d1e38',
  fontSize: 12,
  color: '#e2e8f0',
  verticalAlign: 'middle',
}

const thStyle = {
  padding: '8px 12px',
  textAlign: 'left',
  color: '#475569',
  fontFamily: 'monospace',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 1,
  borderBottom: '1px solid #1e3a5f',
  background: '#0a1628',
  whiteSpace: 'nowrap',
}

// ── Main component ──────────────────────────────────────────────────────────
export default function CargoModule() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/cargo')
      .then(r => r.json())
      .then(d => { setData(d); setError(null) })
      .catch(() => setError('Failed to load cargo data.'))
  }, [])

  const bays      = data?.bays ?? []
  const shipments = data?.shipments ?? []

  const statusCounts = shipments.reduce((acc, s) => {
    acc[s.handling_status] = (acc[s.handling_status] ?? 0) + 1
    return acc
  }, {})

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px',
      gap: 16,
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ color: '#4ade80', fontFamily: 'monospace', fontSize: 16 }}>📦</span>
        <h2 style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 14, letterSpacing: 2, fontWeight: 700 }}>
          CARGO OPERATIONS
        </h2>
        {/* Summary pills */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {Object.entries(statusCounts).map(([status, count]) => {
            const hs = handlingStyle(status)
            return (
              <span key={status} style={{
                background: hs.bg,
                color: hs.text,
                fontSize: 10,
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: 10,
                border: `1px solid ${hs.text}44`,
                letterSpacing: 0.5,
              }}>
                {hs.label} {count}
              </span>
            )
          })}
        </div>
      </div>

      {error && (
        <div style={{ color: '#f87171', fontFamily: 'monospace', fontSize: 12, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {/* Bay grid */}
      <div>
        <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, marginBottom: 10 }}>
          CARGO BAYS
        </div>
        {bays.length === 0 ? (
          <div style={{ color: '#334155', fontFamily: 'monospace', fontSize: 11, textAlign: 'center', padding: '20px' }}>
            No bay data
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}>
            {bays.map((bay, i) => (
              <BayCard key={bay.bay_id ?? bay.id ?? i} bay={bay} />
            ))}
          </div>
        )}
      </div>

      {/* Shipment table */}
      <div style={{
        background: '#0d1e38',
        border: '1px solid #1e3a5f',
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid #1e3a5f',
          background: '#0a1628',
          color: '#64748b',
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>SHIPMENTS</span>
          <span style={{ color: '#334155' }}>{shipments.length} total</span>
        </div>
        {shipments.length === 0 ? (
          <div style={{ color: '#334155', fontFamily: 'monospace', fontSize: 11, textAlign: 'center', padding: '20px' }}>
            No shipments found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['ID', 'Flight', 'Weight', 'Type', 'Status'].map(h => (
                    <th key={h} style={h === 'Weight' || h === 'Status' ? { ...thStyle, textAlign: 'right' } : thStyle}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipments.map((s, i) => (
                  <ShipmentRow key={s.shipment_id ?? s.id ?? i} shipment={s} even={i % 2 === 0} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

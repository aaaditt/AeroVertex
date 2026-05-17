import { useState, useEffect } from 'react'

const HANDLING_STATUS = {
  Received: { bg: 'rgba(102,102,96,0.12)', text: '#666660', label: 'RECEIVED' },
  In_Bay:   { bg: 'rgba(230,126,34,0.12)', text: '#e67e22', label: 'IN BAY'   },
  Loaded:   { bg: 'rgba(39,174,96,0.12)',  text: '#27ae60', label: 'LOADED'   },
  Cleared:  { bg: 'rgba(39,174,96,0.12)',  text: '#27ae60', label: 'CLEARED'  },
  default:  { bg: 'rgba(102,102,96,0.12)', text: '#666660', label: '—'         },
}

function handlingStyle(status) {
  return HANDLING_STATUS[status] ?? HANDLING_STATUS.default
}

function fmtKg(val) {
  if (val == null) return '—'
  return `${Number(val).toLocaleString()} kg`
}

function BayCard({ bay }) {
  const occupied = bay.flight_number != null
  return (
    <div style={{
      background: occupied ? '#fff8f2' : '#f8f8f4',
      border: `1px solid ${occupied ? '#e67e22' : '#c8c8c0'}`,
      borderRadius: 6,
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: occupied ? '#e67e22' : '#c8c8c0', letterSpacing: 1 }}>
          {bay.label ?? bay.bay_label}
        </span>
        <span style={{
          fontSize: 9, fontFamily: 'monospace', color: '#666660',
          background: '#f0f0eb', padding: '1px 6px', borderRadius: 4,
          border: '1px solid #c8c8c0', letterSpacing: 0.5,
        }}>
          {bay.size_category?.toUpperCase() ?? '—'}
        </span>
      </div>
      {occupied ? (
        <>
          <div style={{ color: '#1a1a1a', fontFamily: 'monospace', fontSize: 12, letterSpacing: 0.5 }}>
            {bay.flight_number}
          </div>
          {bay.cargo_type && (
            <div style={{ color: '#666660', fontSize: 11 }}>{bay.cargo_type}</div>
          )}
        </>
      ) : (
        <div style={{ color: '#c8c8c0', fontFamily: 'monospace', fontSize: 11, letterSpacing: 1 }}>EMPTY</div>
      )}
    </div>
  )
}

function ShipmentRow({ shipment, even }) {
  const hs = handlingStyle(shipment.handling_status)
  return (
    <tr style={{ background: even ? '#ffffff' : '#f8f8f4' }}>
      <td style={tdStyle}>{shipment.shipment_id ?? shipment.id}</td>
      <td style={{ ...tdStyle, fontFamily: 'monospace', color: '#e67e22' }}>
        {shipment.flight_number ?? '—'}
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', color: '#666660' }}>
        {fmtKg(shipment.weight_kg)}
      </td>
      <td style={{ ...tdStyle, color: '#666660' }}>{shipment.cargo_type ?? '—'}</td>
      <td style={{ ...tdStyle, textAlign: 'right' }}>
        <span style={{
          background: hs.bg, color: hs.text,
          fontSize: 9, fontFamily: 'monospace', padding: '2px 7px',
          borderRadius: 10, letterSpacing: 0.5,
          border: `1px solid ${hs.text}44`, whiteSpace: 'nowrap',
        }}>
          {hs.label}
        </span>
      </td>
    </tr>
  )
}

const tdStyle = {
  padding: '8px 12px',
  borderBottom: '1px solid #f0f0eb',
  fontSize: 12,
  color: '#1a1a1a',
  verticalAlign: 'middle',
}

const thStyle = {
  padding: '8px 12px',
  textAlign: 'left',
  color: '#666660',
  fontFamily: 'monospace',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 1,
  borderBottom: '1px solid #c8c8c0',
  background: '#f0f0eb',
  whiteSpace: 'nowrap',
}

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px', gap: 16, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span style={{ color: '#27ae60', fontFamily: 'monospace', fontSize: 16 }}>📦</span>
        <h2 style={{ color: '#1a1a1a', fontFamily: 'monospace', fontSize: 14, letterSpacing: 2, fontWeight: 700 }}>
          CARGO OPERATIONS
        </h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {Object.entries(statusCounts).map(([status, count]) => {
            const hs = handlingStyle(status)
            return (
              <span key={status} style={{
                background: hs.bg, color: hs.text,
                fontSize: 10, fontFamily: 'monospace', padding: '2px 8px',
                borderRadius: 10, border: `1px solid ${hs.text}44`, letterSpacing: 0.5,
              }}>
                {hs.label} {count}
              </span>
            )
          })}
        </div>
      </div>

      {error && (
        <div style={{ color: '#c0392b', fontFamily: 'monospace', fontSize: 12, textAlign: 'center' }}>{error}</div>
      )}

      {/* Bay grid */}
      <div>
        <div style={{ color: '#666660', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, marginBottom: 10 }}>
          CARGO BAYS
        </div>
        {bays.length === 0 ? (
          <div style={{ color: '#c8c8c0', fontFamily: 'monospace', fontSize: 11, textAlign: 'center', padding: '20px' }}>
            No bay data
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {bays.map((bay, i) => <BayCard key={bay.bay_id ?? bay.id ?? i} bay={bay} />)}
          </div>
        )}
      </div>

      {/* Shipment table */}
      <div style={{ background: '#ffffff', border: '1px solid #c8c8c0', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{
          padding: '10px 14px',
          borderBottom: '1px solid #c8c8c0',
          background: '#f0f0eb',
          color: '#666660',
          fontFamily: 'monospace',
          fontSize: 10,
          letterSpacing: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>SHIPMENTS</span>
          <span style={{ color: '#c8c8c0' }}>{shipments.length} total</span>
        </div>
        {shipments.length === 0 ? (
          <div style={{ color: '#c8c8c0', fontFamily: 'monospace', fontSize: 11, textAlign: 'center', padding: '20px' }}>
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

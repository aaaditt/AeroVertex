import { useState, useEffect, useCallback } from 'react'
import { getFlightStatus } from '../../utils/interpolation'

const STATUS_COLORS = {
  Approaching: { bg: 'rgba(52,152,219,0.12)',  text: '#2980b9' },
  Taxiing:     { bg: 'rgba(39,174,96,0.12)',   text: '#27ae60' },
  At_Gate:     { bg: 'rgba(230,126,34,0.12)',  text: '#e67e22' },
  Boarding:    { bg: 'rgba(230,126,34,0.12)',  text: '#e67e22' },
  Pushback:    { bg: 'rgba(155,89,182,0.12)',  text: '#8e44ad' },
  Departed:    { bg: 'rgba(102,102,96,0.12)',  text: '#666660' },
  Delayed:     { bg: 'rgba(192,57,43,0.12)',   text: '#c0392b' },
  Cancelled:   { bg: 'rgba(192,57,43,0.12)',   text: '#c0392b' },
  default:     { bg: 'rgba(102,102,96,0.12)',  text: '#666660' },
}

// Turnaround steps as fixed fractions of gate time.
// fractions must sum to 1.
const TURNAROUND_STEPS = [
  { label: 'Deboarding',  frac: 0.20 },
  { label: 'Cleaning',    frac: 0.15 },
  { label: 'Catering',    frac: 0.20 },
  { label: 'Fueling',     frac: 0.25 },
  { label: 'Boarding',    frac: 0.15 },
  { label: 'Pushback Ready', frac: 0.05 },
]

function buildTurnaround(gateInSec, gateOutSec) {
  const dur = gateOutSec - gateInSec
  const steps = []
  let cursor = gateInSec
  for (const s of TURNAROUND_STEPS) {
    const start = cursor
    const end   = cursor + dur * s.frac
    steps.push({ ...s, start, end })
    cursor = end
  }
  return steps
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

function Row({ label, value }) {
  return (
    <div style={{ display: 'contents' }}>
      <span style={{ color: '#666660', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1 }}>
        {label.toUpperCase()}
      </span>
      <span style={{ color: '#1a1a1a', fontSize: 13, textAlign: 'right' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

export default function FlightDetail({ flightId, simSecond, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const isOpen = flightId != null

  const fetchData = useCallback(() => {
    if (!flightId) return
    fetch(`/api/flight/${flightId}`)
      .then(r => r.json())
      .then(d => { setData(d); setError(null); setLoading(false) })
      .catch(() => { setError('Failed to load flight data.'); setLoading(false) })
  }, [flightId])

  useEffect(() => {
    if (!flightId) return
    setLoading(true)
    setData(null)
    fetchData()
  }, [flightId, fetchData])

  const liveStatus = data && simSecond != null ? getFlightStatus(data, simSecond) : data?.status
  const sc = statusStyle(liveStatus ?? 'default')

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.12)',
          zIndex: 99,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 360,
        background: '#ffffff',
        borderLeft: '1px solid #c8c8c0',
        zIndex: 100,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid #c8c8c0',
          background: '#f0f0eb',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 16, color: '#e67e22', letterSpacing: 2 }}>
            {data?.flight_number ?? (loading ? '…' : '—')}
          </span>
          {data?.airline_name && (
            <span style={{ color: '#666660', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.airline_name}
            </span>
          )}
          {liveStatus && (
            <span style={{
              background: sc.bg,
              color: sc.text,
              fontSize: 10,
              fontFamily: 'monospace',
              padding: '2px 8px',
              borderRadius: 12,
              letterSpacing: 1,
              border: `1px solid ${sc.text}44`,
              whiteSpace: 'nowrap',
            }}>
              {liveStatus.toUpperCase()}
            </span>
          )}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#666660', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 2px', marginLeft: 4 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading && (
            <div style={{ color: '#666660', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>
              Loading…
            </div>
          )}
          {error && (
            <div style={{ color: '#c0392b', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Detail grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px', marginBottom: 16 }}>
                <Row label="Origin"      value={data.origin_airport} />
                <Row label="Destination" value={data.destination_airport} />
                <Row label="Aircraft"    value={data.model_name ?? data.aircraft_type} />
                <Row label="Tail #"      value={data.tail_number} />
                <Row label="Gate/Bay"    value={data.gate_label ?? data.bay_label} />
                <Row label="Arrival"     value={fmtSecs(data.sim_arrival_sec)} />
                <Row label="Departure"   value={fmtSecs(data.sim_departure_sec)} />
              </div>

              {/* Passengers / cargo */}
              <div style={{
                background: '#f0f0eb',
                border: '1px solid #c8c8c0',
                borderRadius: 6,
                padding: '10px 12px',
                marginBottom: 16,
                fontSize: 12,
                fontFamily: 'monospace',
              }}>
                {data.is_cargo ? (
                  <div>
                    <span style={{ color: '#27ae60', letterSpacing: 1 }}>CARGO FLIGHT</span>
                    {data.shipment_count != null && (
                      <span style={{ color: '#666660', marginLeft: 10 }}>{data.shipment_count} shipments</span>
                    )}
                  </div>
                ) : (
                  <div>
                    <span style={{ color: '#e67e22', letterSpacing: 1 }}>PAX</span>
                    <span style={{ color: '#1a1a1a', marginLeft: 10 }}>{data.passenger_count ?? '—'}</span>
                  </div>
                )}
              </div>

              {/* Turnaround procedure timeline (non-cargo only) */}
              {!data.is_cargo && data.sim_gate_in_sec != null && data.sim_gate_out_sec != null && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666660', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>
                    TURNAROUND PROCEDURE
                  </div>
                  {buildTurnaround(data.sim_gate_in_sec, data.sim_gate_out_sec).map((step, i) => {
                    const sec = simSecond ?? 0
                    const done   = sec >= step.end
                    const active = !done && sec >= step.start
                    const pct    = active
                      ? Math.round(((sec - step.start) / (step.end - step.start)) * 100)
                      : done ? 100 : 0
                    const color  = done ? '#27ae60' : active ? '#e67e22' : '#c8c8c0'
                    return (
                      <div key={i} style={{ marginBottom: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: done ? '#27ae60' : active ? '#e67e22' : '#999990' }}>
                            {done ? '✓ ' : active ? '▶ ' : '○ '}{step.label}
                          </span>
                          <span style={{ fontSize: 10, fontFamily: 'monospace', color }}>
                            {done ? 'DONE' : active ? `${pct}%` : fmtSecs(step.start)}
                          </span>
                        </div>
                        <div style={{ height: 3, background: '#f0f0eb', borderRadius: 2 }}>
                          <div style={{ height: 3, width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Service logs */}
              {Array.isArray(data.service_logs) && data.service_logs.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#666660', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>
                    SERVICE LOGS
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Type', 'Qty', 'Charge'].map(h => (
                          <th key={h} style={{
                            textAlign: 'left',
                            color: '#666660',
                            fontFamily: 'monospace',
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: 1,
                            paddingBottom: 6,
                            borderBottom: '1px solid #c8c8c0',
                          }}>
                            {h.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.service_logs.map((log, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8f8f4', borderBottom: '1px solid #f0f0eb' }}>
                          <td style={{ padding: '6px 0', color: '#666660' }}>{log.service_type}</td>
                          <td style={{ padding: '6px 0', color: '#1a1a1a', textAlign: 'center' }}>{log.quantity}</td>
                          <td style={{ padding: '6px 0', color: '#27ae60', textAlign: 'right' }}>
                            {log.charge_amount != null ? `$${Number(log.charge_amount).toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </>
          )}
        </div>
      </div>
    </>
  )
}

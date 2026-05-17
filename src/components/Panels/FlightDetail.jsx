import { useState, useEffect, useCallback } from 'react'

const STATUS_COLORS = {
  Inbound:   { bg: 'rgba(39,174,96,0.12)',  text: '#27ae60' },
  Taxiing:   { bg: 'rgba(39,174,96,0.12)',  text: '#27ae60' },
  Boarding:  { bg: 'rgba(230,126,34,0.12)', text: '#e67e22' },
  At_Gate:   { bg: 'rgba(230,126,34,0.12)', text: '#e67e22' },
  Departed:  { bg: 'rgba(102,102,96,0.12)', text: '#666660' },
  Delayed:   { bg: 'rgba(192,57,43,0.12)',  text: '#c0392b' },
  Cancelled: { bg: 'rgba(192,57,43,0.12)',  text: '#c0392b' },
  default:   { bg: 'rgba(102,102,96,0.12)', text: '#666660' },
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

// ── Assign Equipment action ─────────────────────────────────────────────────
function AssignEquipment({ flightId, onDone }) {
  const [equipment, setEquipment] = useState([])
  const [selected, setSelected] = useState('')
  const [status, setStatus] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/equipment?available=true')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setEquipment(data) })
      .catch(() => {})
  }, [])

  async function assign() {
    if (!selected) return
    setStatus('loading')
    try {
      const res = await fetch('/api/assign-equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flight_id: flightId, equipment_id: Number(selected) }),
      })
      const data = await res.json()
      if (res.ok) { setStatus('ok'); setMsg(data.message ?? 'Equipment assigned.'); onDone?.() }
      else         { setStatus('err'); setMsg(data.error ?? 'Assignment failed.') }
    } catch {
      setStatus('err'); setMsg('Network error.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select value={selected} onChange={e => setSelected(e.target.value)} style={selectStyle}>
        <option value="">— Select equipment —</option>
        {equipment.map(eq => (
          <option key={eq.equipment_id ?? eq.id} value={eq.equipment_id ?? eq.id}>
            {eq.equipment_type} #{eq.equipment_id ?? eq.id}
          </option>
        ))}
      </select>
      <button onClick={assign} disabled={!selected || status === 'loading'} style={primaryBtn}>
        {status === 'loading' ? 'Assigning…' : 'Confirm Assignment'}
      </button>
      {status === 'ok'  && <Feedback ok msg={msg} />}
      {status === 'err' && <Feedback msg={msg} />}
    </div>
  )
}

// ── Delay Flight action ─────────────────────────────────────────────────────
function DelayFlight({ flightId, onRefresh }) {
  const [secs, setSecs] = useState(60)
  const [status, setStatus] = useState(null)
  const [msg, setMsg] = useState('')

  async function delay() {
    setStatus('loading')
    try {
      const res = await fetch('/api/delay-flight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flight_id: flightId, delay_seconds: Number(secs) }),
      })
      const data = await res.json()
      if (res.ok) { setStatus('ok'); setMsg(data.message ?? `Flight delayed by ${secs}s.`); onRefresh?.() }
      else         { setStatus('err'); setMsg(data.error ?? 'Delay failed.') }
    } catch {
      setStatus('err'); setMsg('Network error.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ color: '#666660', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, whiteSpace: 'nowrap' }}>
          DELAY (SEC)
        </label>
        <input
          type="number"
          min={60}
          value={secs}
          onChange={e => setSecs(e.target.value)}
          style={{ ...selectStyle, flex: 1 }}
        />
      </div>
      <button onClick={delay} disabled={secs < 60 || status === 'loading'} style={primaryBtn}>
        {status === 'loading' ? 'Applying…' : 'Confirm Delay'}
      </button>
      {status === 'ok'  && <Feedback ok msg={msg} />}
      {status === 'err' && <Feedback msg={msg} />}
    </div>
  )
}

// ── Summary action ──────────────────────────────────────────────────────────
function GenerateSummary({ flightId }) {
  const [status, setStatus] = useState(null)
  const [summary, setSummary] = useState(null)
  const [msg, setMsg] = useState('')

  async function generate() {
    setStatus('loading'); setSummary(null)
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flight_id: flightId }),
      })
      const data = await res.json()
      if (res.ok) { setStatus('ok'); setSummary(data) }
      else         { setStatus('err'); setMsg(data.error ?? 'Summary failed.') }
    } catch {
      setStatus('err'); setMsg('Network error.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button onClick={generate} disabled={status === 'loading'} style={primaryBtn}>
        {status === 'loading' ? 'Generating…' : 'Generate Summary'}
      </button>
      {status === 'err' && <Feedback msg={msg} />}
      {status === 'ok' && summary && (
        <div style={{
          background: 'rgba(39,174,96,0.08)',
          border: '1px solid rgba(39,174,96,0.3)',
          borderRadius: 6,
          padding: '10px 12px',
          fontSize: 12,
          fontFamily: 'monospace',
          color: '#27ae60',
          lineHeight: 1.7,
        }}>
          {summary.total_charge != null && (
            <div style={{ marginBottom: 4, fontWeight: 700 }}>
              TOTAL: ${Number(summary.total_charge).toFixed(2)}
            </div>
          )}
          {summary.breakdown && Object.entries(summary.breakdown).map(([k, v]) => (
            <div key={k} style={{ color: '#1a7a4a' }}>{k}: ${Number(v).toFixed(2)}</div>
          ))}
          {summary.message && <div style={{ color: '#666660', marginTop: 4 }}>{summary.message}</div>}
        </div>
      )}
    </div>
  )
}

function Feedback({ ok, msg }) {
  return (
    <div style={{
      fontSize: 12,
      fontFamily: 'monospace',
      padding: '6px 10px',
      borderRadius: 4,
      background: ok ? 'rgba(39,174,96,0.1)' : 'rgba(192,57,43,0.1)',
      color: ok ? '#27ae60' : '#c0392b',
      border: `1px solid ${ok ? 'rgba(39,174,96,0.3)' : 'rgba(192,57,43,0.3)'}`,
    }}>
      {msg}
    </div>
  )
}

const selectStyle = {
  background: '#ffffff',
  border: '1px solid #c8c8c0',
  borderRadius: 4,
  color: '#1a1a1a',
  padding: '6px 10px',
  fontSize: 12,
  width: '100%',
  outline: 'none',
}

const primaryBtn = {
  background: '#e67e22',
  border: 'none',
  borderRadius: 4,
  color: '#ffffff',
  padding: '7px 12px',
  fontSize: 12,
  fontFamily: 'monospace',
  cursor: 'pointer',
  letterSpacing: 1,
  transition: 'opacity 0.15s',
}

function ActionSection({ label, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderTop: '1px solid #c8c8c0' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '10px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          color: '#e67e22',
          fontFamily: 'monospace',
          fontSize: 12,
          letterSpacing: 1,
        }}
      >
        <span>{label}</span>
        <span style={{ opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ paddingBottom: 12 }}>{children}</div>}
    </div>
  )
}

export default function FlightDetail({ flightId, onClose }) {
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
    fetchData()
  }, [flightId, fetchData])

  const sc = data ? statusStyle(data.status) : statusStyle('default')

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
          {data?.status && (
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
              {data.status.toUpperCase()}
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
                <Row label="Origin"      value={data.origin_code} />
                <Row label="Destination" value={data.destination_code} />
                <Row label="Aircraft"    value={data.aircraft_type} />
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

              <div style={{ borderTop: '1px solid #c8c8c0', marginBottom: 4 }} />

              <ActionSection label="ASSIGN EQUIPMENT">
                <AssignEquipment flightId={flightId} onDone={fetchData} />
              </ActionSection>
              <ActionSection label="GENERATE SUMMARY">
                <GenerateSummary flightId={flightId} />
              </ActionSection>
              <ActionSection label="DELAY FLIGHT">
                <DelayFlight flightId={flightId} onRefresh={fetchData} />
              </ActionSection>
            </>
          )}
        </div>
      </div>
    </>
  )
}

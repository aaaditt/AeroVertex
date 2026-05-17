import { useState, useEffect, useCallback } from 'react'

const STATUS_COLORS = {
  Inbound:   { bg: '#1e3a5f', text: '#60a5fa' },
  Taxiing:   { bg: '#1c3a1c', text: '#4ade80' },
  Boarding:  { bg: '#3a2a1c', text: '#fbbf24' },
  Departed:  { bg: '#1a1a3a', text: '#a78bfa' },
  Delayed:   { bg: '#3a1c1c', text: '#f87171' },
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

function Row({ label, value }) {
  return (
    <div style={{ display: 'contents' }}>
      <span style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1 }}>
        {label.toUpperCase()}
      </span>
      <span style={{ color: '#e2e8f0', fontSize: 13, textAlign: 'right' }}>
        {value ?? '—'}
      </span>
    </div>
  )
}

// ── Assign Equipment action ─────────────────────────────────────────────────
function AssignEquipment({ flightId, onDone }) {
  const [equipment, setEquipment] = useState([])
  const [selected, setSelected] = useState('')
  const [status, setStatus] = useState(null) // null | 'loading' | 'ok' | 'err'
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/equipment?available=true')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEquipment(data)
      })
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
      if (res.ok) {
        setStatus('ok')
        setMsg(data.message ?? 'Equipment assigned.')
        onDone?.()
      } else {
        setStatus('err')
        setMsg(data.error ?? 'Assignment failed.')
      }
    } catch {
      setStatus('err')
      setMsg('Network error.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select
        value={selected}
        onChange={e => setSelected(e.target.value)}
        style={selectStyle}
      >
        <option value="">— Select equipment —</option>
        {equipment.map(eq => (
          <option key={eq.equipment_id ?? eq.id} value={eq.equipment_id ?? eq.id}>
            {eq.equipment_type} #{eq.equipment_id ?? eq.id}
          </option>
        ))}
      </select>
      <button
        onClick={assign}
        disabled={!selected || status === 'loading'}
        style={actionBtnStyle('#1e3a5f', '#60a5fa')}
      >
        {status === 'loading' ? 'Assigning…' : 'Confirm Assignment'}
      </button>
      {status === 'ok' && <Feedback ok msg={msg} />}
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
      if (res.ok) {
        setStatus('ok')
        setMsg(data.message ?? `Flight delayed by ${secs}s.`)
        onRefresh?.()
      } else {
        setStatus('err')
        setMsg(data.error ?? 'Delay failed.')
      }
    } catch {
      setStatus('err')
      setMsg('Network error.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, whiteSpace: 'nowrap' }}>
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
      <button
        onClick={delay}
        disabled={secs < 60 || status === 'loading'}
        style={actionBtnStyle('#3a1c1c', '#f87171')}
      >
        {status === 'loading' ? 'Applying…' : 'Confirm Delay'}
      </button>
      {status === 'ok' && <Feedback ok msg={msg} />}
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
    setStatus('loading')
    setSummary(null)
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flight_id: flightId }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('ok')
        setSummary(data)
      } else {
        setStatus('err')
        setMsg(data.error ?? 'Summary failed.')
      }
    } catch {
      setStatus('err')
      setMsg('Network error.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <button
        onClick={generate}
        disabled={status === 'loading'}
        style={actionBtnStyle('#1c2e1c', '#4ade80')}
      >
        {status === 'loading' ? 'Generating…' : 'Generate Summary'}
      </button>
      {status === 'err' && <Feedback msg={msg} />}
      {status === 'ok' && summary && (
        <div style={{
          background: '#0d1e10',
          border: '1px solid #166534',
          borderRadius: 6,
          padding: '10px 12px',
          fontSize: 12,
          fontFamily: 'monospace',
          color: '#4ade80',
          lineHeight: 1.7,
        }}>
          {summary.total_charge != null && (
            <div style={{ marginBottom: 4, color: '#86efac' }}>
              TOTAL: ${Number(summary.total_charge).toFixed(2)}
            </div>
          )}
          {summary.breakdown && Object.entries(summary.breakdown).map(([k, v]) => (
            <div key={k} style={{ color: '#6ee7a0' }}>{k}: ${Number(v).toFixed(2)}</div>
          ))}
          {summary.message && <div style={{ color: '#94a3b8', marginTop: 4 }}>{summary.message}</div>}
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
      background: ok ? '#0d2210' : '#200d0d',
      color: ok ? '#4ade80' : '#f87171',
      border: `1px solid ${ok ? '#166534' : '#7f1d1d'}`,
    }}>
      {msg}
    </div>
  )
}

// ── Shared styles ───────────────────────────────────────────────────────────
const selectStyle = {
  background: '#0d1628',
  border: '1px solid #1e3a5f',
  borderRadius: 4,
  color: '#e2e8f0',
  padding: '6px 10px',
  fontSize: 12,
  width: '100%',
  outline: 'none',
}

function actionBtnStyle(bg, border) {
  return {
    background: bg,
    border: `1px solid ${border}`,
    borderRadius: 4,
    color: border,
    padding: '7px 12px',
    fontSize: 12,
    fontFamily: 'monospace',
    cursor: 'pointer',
    letterSpacing: 1,
    transition: 'opacity 0.15s',
  }
}

// ── Expandable action section ───────────────────────────────────────────────
function ActionSection({ label, accent, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderTop: '1px solid #1e3a5f' }}>
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
          color: accent,
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

// ── Main component ──────────────────────────────────────────────────────────
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
          background: 'rgba(0,0,0,0.45)',
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
        background: '#0a1628',
        borderLeft: '1px solid #1e3a5f',
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
          borderBottom: '1px solid #1e3a5f',
          background: '#0d1e38',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: 16,
            color: '#60a5fa',
            letterSpacing: 2,
          }}>
            {data?.flight_number ?? (loading ? '…' : '—')}
          </span>
          {data?.airline_name && (
            <span style={{ color: '#94a3b8', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
              border: `1px solid ${sc.text}33`,
              whiteSpace: 'nowrap',
            }}>
              {data.status.toUpperCase()}
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              fontSize: 18,
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0 2px',
              marginLeft: 4,
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {loading && (
            <div style={{ color: '#64748b', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>
              Loading…
            </div>
          )}
          {error && (
            <div style={{ color: '#f87171', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Detail grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px 12px',
                marginBottom: 16,
              }}>
                <Row label="Origin" value={data.origin_code} />
                <Row label="Destination" value={data.destination_code} />
                <Row label="Aircraft" value={data.aircraft_type} />
                <Row label="Tail #" value={data.tail_number} />
                <Row label="Gate/Bay" value={data.gate_label ?? data.bay_label} />
                <Row label="Arrival" value={fmtSecs(data.sim_arrival_sec)} />
                <Row label="Departure" value={fmtSecs(data.sim_departure_sec)} />
              </div>

              {/* Passengers / cargo */}
              <div style={{
                background: '#0d1e38',
                border: '1px solid #1e3a5f',
                borderRadius: 6,
                padding: '10px 12px',
                marginBottom: 16,
                fontSize: 12,
                fontFamily: 'monospace',
              }}>
                {data.is_cargo ? (
                  <div>
                    <span style={{ color: '#4ade80', letterSpacing: 1 }}>CARGO FLIGHT</span>
                    {data.shipment_count != null && (
                      <span style={{ color: '#94a3b8', marginLeft: 10 }}>
                        {data.shipment_count} shipments
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    <span style={{ color: '#60a5fa', letterSpacing: 1 }}>PAX</span>
                    <span style={{ color: '#e2e8f0', marginLeft: 10 }}>
                      {data.passenger_count ?? '—'}
                    </span>
                  </div>
                )}
              </div>

              {/* Service logs table */}
              {Array.isArray(data.service_logs) && data.service_logs.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#64748b', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 8 }}>
                    SERVICE LOGS
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr>
                        {['Type', 'Qty', 'Charge'].map(h => (
                          <th key={h} style={{
                            textAlign: 'left',
                            color: '#475569',
                            fontFamily: 'monospace',
                            fontSize: 10,
                            fontWeight: 600,
                            letterSpacing: 1,
                            paddingBottom: 6,
                            borderBottom: '1px solid #1e3a5f',
                          }}>
                            {h.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.service_logs.map((log, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #0d1e38' }}>
                          <td style={{ padding: '6px 0', color: '#94a3b8' }}>{log.service_type}</td>
                          <td style={{ padding: '6px 0', color: '#e2e8f0', textAlign: 'center' }}>{log.quantity}</td>
                          <td style={{ padding: '6px 0', color: '#4ade80', textAlign: 'right' }}>
                            {log.charge_amount != null ? `$${Number(log.charge_amount).toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Divider */}
              <div style={{ borderTop: '1px solid #1e3a5f', marginBottom: 4 }} />

              {/* Action sections */}
              <ActionSection label="ASSIGN EQUIPMENT" accent="#60a5fa">
                <AssignEquipment flightId={flightId} onDone={fetchData} />
              </ActionSection>

              <ActionSection label="GENERATE SUMMARY" accent="#4ade80">
                <GenerateSummary flightId={flightId} />
              </ActionSection>

              <ActionSection label="DELAY FLIGHT" accent="#f87171">
                <DelayFlight flightId={flightId} onRefresh={fetchData} />
              </ActionSection>
            </>
          )}
        </div>
      </div>
    </>
  )
}

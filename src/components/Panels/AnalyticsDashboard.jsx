import { useState, useEffect } from 'react'

const thBase = {
  padding: '7px 12px',
  textAlign: 'left',
  color: '#666660',
  fontFamily: 'monospace',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1,
  borderBottom: '1px solid #c8c8c0',
  background: '#f0f0eb',
  whiteSpace: 'nowrap',
}
const tdBase = {
  padding: '7px 12px',
  fontSize: 12,
  verticalAlign: 'middle',
  borderBottom: '1px solid #f0f0eb',
  color: '#1a1a1a',
}

function Th({ right, children }) {
  return <th style={right ? { ...thBase, textAlign: 'right' } : thBase}>{children}</th>
}
function Td({ right, accent, children }) {
  return (
    <td style={{
      ...tdBase,
      textAlign: right ? 'right' : 'left',
      color: accent ?? '#1a1a1a',
      fontFamily: accent ? 'monospace' : undefined,
    }}>
      {children}
    </td>
  )
}

function Section({ title, accent = '#e67e22', badge, error, children }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #c8c8c0', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid #c8c8c0',
        background: '#f0f0eb',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ color: accent, fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, fontWeight: 700 }}>
          {title}
        </span>
        {badge && (
          <span style={{
            marginLeft: 'auto',
            background: accent + '22',
            color: accent,
            fontSize: 9,
            fontFamily: 'monospace',
            padding: '1px 7px',
            borderRadius: 10,
            border: `1px solid ${accent}44`,
          }}>
            {badge}
          </span>
        )}
      </div>
      {error ? (
        <div style={{ color: '#c0392b', fontFamily: 'monospace', fontSize: 11, padding: '12px 14px' }}>{error}</div>
      ) : children}
    </div>
  )
}

function rowBg(i) { return i % 2 === 0 ? '#ffffff' : '#f8f8f4' }

function BottleneckTable({ result }) {
  if (!result?.ok) return null
  const rows = result.data ?? []
  return (
    <div style={{ overflowX: 'auto' }}>
      {rows.length === 0 ? (
        <p style={{ color: '#c8c8c0', fontFamily: 'monospace', fontSize: 11, padding: '12px 14px' }}>
          No bottleneck flights found
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><Th>Flight</Th><Th>Airline</Th><Th right>Turnaround (sec)</Th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: rowBg(i) }}>
                <Td accent="#1a1a1a">{r.flight_number}</Td>
                <Td>{r.airline_name}</Td>
                <Td right accent="#c0392b">{Number(r.turnaround_sec ?? 0).toLocaleString()}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function UnusedGatesTable({ result }) {
  if (!result?.ok) return null
  const rows = result.data ?? []
  return (
    <div style={{ overflowX: 'auto' }}>
      {rows.length === 0 ? (
        <p style={{ color: '#27ae60', fontFamily: 'monospace', fontSize: 11, padding: '12px 14px' }}>
          All large gates are fully utilized
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><Th>Gate</Th><Th right>Max Size Category</Th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: rowBg(i) }}>
                <Td accent="#e67e22">{r.gate_label}</Td>
                <Td right accent="#666660">{r.max_size_category}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function BusiestGatesTable({ result }) {
  if (!result?.ok) return null
  const rows = result.data ?? []
  const max = Math.max(...rows.map(r => Number(r.flight_count)), 1)
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><Th>Gate</Th><Th>Utilization</Th><Th right>Flights</Th></tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const pct = (Number(r.flight_count) / max) * 100
            const color = pct > 75 ? '#c0392b' : pct > 40 ? '#e67e22' : '#27ae60'
            return (
              <tr key={i} style={{ background: rowBg(i) }}>
                <Td accent="#e67e22">{r.gate_label}</Td>
                <td style={{ ...tdBase, width: '50%' }}>
                  <div style={{ height: 5, background: '#f0f0eb', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
                  </div>
                </td>
                <Td right accent={color}>{r.flight_count}</Td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EquipmentTable({ result }) {
  if (!result?.ok) return null
  const rows = result.data ?? []
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><Th>Equipment</Th><Th>ID</Th><Th right>Assignments</Th><Th right>Total (sec)</Th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: rowBg(i) }}>
              <Td accent="#666660">{r.equipment_type}</Td>
              <Td accent="#c8c8c0">#{r.equipment_id}</Td>
              <Td right accent="#e67e22">{r.assignment_count}</Td>
              <Td right accent="#27ae60">{Number(r.total_duration_sec ?? 0).toLocaleString()}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PassengerTable({ result }) {
  if (!result?.ok) return null
  const rows = result.data ?? []
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><Th>Zone</Th><Th>Terminal</Th><Th right>Peak PAX</Th><Th right>Avg PAX</Th><Th right>Log Entries</Th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: rowBg(i) }}>
              <Td accent="#d35400">{r.zone_name}</Td>
              <Td>{r.terminal_name}</Td>
              <Td right accent="#e67e22">{Number(r.peak_count ?? 0).toLocaleString()}</Td>
              <Td right accent="#666660">{Math.round(r.avg_count ?? 0).toLocaleString()}</Td>
              <Td right accent="#c8c8c0">{r.log_entries}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function AnalyticsDashboard({ simSecond = 0 }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setError(null) })
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 16 }}>📊</span>
        <h2 style={{ color: '#1a1a1a', fontFamily: 'monospace', fontSize: 14, letterSpacing: 2, fontWeight: 700 }}>
          ANALYTICS DASHBOARD
        </h2>
        <span style={{ marginLeft: 'auto', color: '#c8c8c0', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1 }}>
          SECTION 13.5 QUERIES
        </span>
      </div>

      {error && (
        <div style={{ color: '#c0392b', fontFamily: 'monospace', fontSize: 12, textAlign: 'center' }}>{error}</div>
      )}
      {loading && (
        <div style={{ color: '#666660', fontFamily: 'monospace', fontSize: 12, textAlign: 'center', paddingTop: 40 }}>
          Running queries…
        </div>
      )}

      {data && !loading && (
        <>
          <Section title="BOTTLENECK FLIGHTS"    accent="#c0392b" badge="CORRELATED SUBQUERY"
            error={!data.bottleneck_flights?.ok ? data.bottleneck_flights?.error : null}>
            <BottleneckTable result={data.bottleneck_flights} />
          </Section>

          <Section title="UNDER-USED LARGE GATES" accent="#e67e22" badge="NESTED QUERY"
            error={!data.unused_large_gates?.ok ? data.unused_large_gates?.error : null}>
            <UnusedGatesTable result={data.unused_large_gates} />
          </Section>

          <Section title="BUSIEST GATES" accent="#e67e22"
            error={!data.busiest_gates?.ok ? data.busiest_gates?.error : null}>
            <BusiestGatesTable result={data.busiest_gates} />
          </Section>

          <Section title="EQUIPMENT USAGE" accent="#27ae60"
            error={!data.equipment_usage?.ok ? data.equipment_usage?.error : null}>
            <EquipmentTable result={data.equipment_usage} />
          </Section>

          <Section title="PASSENGER FLOW PEAKS" accent="#d35400"
            error={!data.passenger_peaks?.ok ? data.passenger_peaks?.error : null}>
            <PassengerTable result={data.passenger_peaks} />
          </Section>
        </>
      )}
    </div>
  )
}

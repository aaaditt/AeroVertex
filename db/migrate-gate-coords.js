// Migration: update Gate.map_x/map_y and CargoBay.map_x/map_y to new layout.
// Run once: node db/migrate-gate-coords.js
import pool from './connection.js'

const conn = await pool.getConnection()

// New gate coordinates — match mapConfig.js exactly
// A-gates: finger pier tips (y=305)
// B-gates: terminal north apron (y=162)
const GATES = [
  { label: 'A1', x: 155, y: 305 },
  { label: 'A2', x: 255, y: 305 },
  { label: 'A3', x: 360, y: 305 },
  { label: 'A4', x: 465, y: 305 },
  { label: 'A5', x: 565, y: 305 },
  { label: 'A6', x: 565, y: 305 }, // A6 → remap to A5 position (removed in new layout)
  { label: 'A7', x: 565, y: 305 }, // A7 → remap to A5 position (removed in new layout)
  { label: 'B1', x: 175, y: 162 },
  { label: 'B2', x: 265, y: 162 },
  { label: 'B3', x: 355, y: 162 },
  { label: 'B4', x: 445, y: 162 },
  { label: 'B5', x: 535, y: 162 },
  { label: 'B6', x: 615, y: 162 },
  { label: 'B7', x: 615, y: 162 }, // B7 → remap to B6 position (removed in new layout)
]

// New cargo bay coordinates
const BAYS = [
  { label: 'C1', x: 285, y: 495 },
  { label: 'C2', x: 365, y: 495 },
  { label: 'C3', x: 445, y: 495 },
  { label: 'C4', x: 525, y: 495 },
  { label: 'C5', x: 605, y: 495 },
  { label: 'C6', x: 685, y: 495 },
]

try {
  console.log('Updating gate coordinates...')
  for (const g of GATES) {
    const [r] = await conn.query(
      'UPDATE Gate SET map_x = ?, map_y = ? WHERE gate_label = ?',
      [g.x, g.y, g.label]
    )
    console.log(`  ${g.label}: ${r.affectedRows} row(s) → (${g.x}, ${g.y})`)
  }

  console.log('Updating cargo bay coordinates...')
  for (const b of BAYS) {
    const [r] = await conn.query(
      'UPDATE CargoBay SET map_x = ?, map_y = ? WHERE bay_label = ?',
      [b.x, b.y, b.label]
    )
    console.log(`  ${b.label}: ${r.affectedRows} row(s) → (${b.x}, ${b.y})`)
  }

  console.log('Refreshing live_map_cache...')
  await conn.query('CALL sp_refresh_live_map()')
  const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM live_map_cache')
  console.log(`✓ Done — ${cnt} rows in live_map_cache`)
} finally {
  conn.release()
  await pool.end()
}

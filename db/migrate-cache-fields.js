// Migration: add origin_airport, destination_airport, delay_seconds to live_map_cache
// Run once: node db/migrate-cache-fields.js
import pool from './connection.js'

const conn = await pool.getConnection()

async function addColumnIfMissing(table, column, definition) {
  const [[{ cnt }]] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  )
  if (cnt === 0) {
    await conn.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
    console.log(`  ✓ Added ${column}`)
  } else {
    console.log(`  · ${column} already exists`)
  }
}

try {
  await addColumnIfMissing('live_map_cache', 'origin_airport',      'CHAR(3) NULL AFTER status')
  await addColumnIfMissing('live_map_cache', 'destination_airport', 'CHAR(3) NULL AFTER origin_airport')
  await addColumnIfMissing('live_map_cache', 'delay_seconds',       'INT NOT NULL DEFAULT 0 AFTER destination_airport')

  await conn.query('CALL sp_refresh_live_map()')
  const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM live_map_cache')
  console.log(`✓ Cache refreshed — ${cnt} rows`)
} finally {
  conn.release()
  await pool.end()
}

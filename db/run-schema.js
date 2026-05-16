import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');

// Split on semicolons, filter empty statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

let conn;
try {
  conn = await pool.getConnection();
  for (const stmt of statements) {
    await conn.query(stmt);
  }

  const [rows] = await conn.query('SHOW TABLES');
  console.log(`\nSchema applied. Tables created (${rows.length}):`);
  rows.forEach(r => console.log(' ', Object.values(r)[0]));
} catch (err) {
  console.error('Schema failed:', err.message);
  process.exit(1);
} finally {
  if (conn) conn.release();
  await pool.end();
}

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, 'indexes.sql'), 'utf8');

const statements = sql
  .split('\n')
  .filter(line => !line.trimStart().startsWith('--'))
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

let conn;
try {
  conn = await pool.getConnection();
  for (const stmt of statements) {
    await conn.query(stmt);
    console.log('Applied:', stmt.split('\n')[0]);
  }
  console.log('\nAll indexes created.');
} catch (err) {
  console.error('Index creation failed:', err.message);
  process.exit(1);
} finally {
  if (conn) conn.release();
  await pool.end();
}

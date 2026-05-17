/**
 * run-explain.js  —  prints EXPLAIN output for the report's optimisation story.
 *
 * Usage:  node db/run-explain.js
 *
 * Two queries are compared:
 *   Q1  raw join   : Flight JOIN Airline LEFT JOIN Gate  (no cache, no indexes)
 *   Q2  live_map_cache view                              (materialized + indexed)
 */
import pool from '../api/_db.js';
import { writeFileSync } from 'fs';

const SEC = 500;   // representative sim-second for the WHERE clause

const Q1 = `
EXPLAIN SELECT f.*, a.airline_name, g.map_x, g.map_y
FROM Flight f
JOIN Airline a ON a.airline_id = f.airline_id
LEFT JOIN Gate g ON g.gate_id = f.gate_id
WHERE f.sim_arrival_sec <= ${SEC} AND f.sim_departure_sec >= ${SEC}
`;

const Q2 = `
EXPLAIN SELECT * FROM live_map_cache
WHERE sim_arrival_sec <= ${SEC} AND sim_departure_sec >= ${SEC}
`;

function pretty(rows) {
  if (!rows.length) return '(no rows)';
  const keys = Object.keys(rows[0]);
  const widths = keys.map(k =>
    Math.max(k.length, ...rows.map(r => String(r[k] ?? 'NULL').length))
  );
  const hr  = '+' + widths.map(w => '-'.repeat(w + 2)).join('+') + '+';
  const hdr = '|' + keys.map((k, i) => ` ${k.padEnd(widths[i])} `).join('|') + '|';
  const body = rows.map(r =>
    '|' + keys.map((k, i) => ` ${String(r[k] ?? 'NULL').padEnd(widths[i])} `).join('|') + '|'
  ).join('\n');
  return [hr, hdr, hr, body, hr].join('\n');
}

async function main() {
  let out = '';
  const log = s => { console.log(s); out += s + '\n'; };

  log('='.repeat(72));
  log('AEROVERTEX  —  EXPLAIN Optimisation Report');
  log('='.repeat(72));

  try {
    log('\n── Q1: Raw join (Flight ⋈ Airline ⋈ Gate) ──────────────────────────\n');
    log(Q1.trim());
    const [rows1] = await pool.query(Q1);
    log('\n' + pretty(rows1));
  } catch (e) {
    log(`\nQ1 ERROR: ${e.message}`);
  }

  try {
    log('\n\n── Q2: live_map_cache view ──────────────────────────────────────────\n');
    log(Q2.trim());
    const [rows2] = await pool.query(Q2);
    log('\n' + pretty(rows2));
  } catch (e) {
    log(`\nQ2 ERROR: ${e.message}`);
  }

  log('\n' + '='.repeat(72));

  writeFileSync('db/explain-output.txt', out);
  console.log('\nSaved to db/explain-output.txt');
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSql(filename) {
  return readFileSync(join(__dirname, filename), 'utf8');
}

// For schema / indexes / views — plain semicolon-separated statements
async function runBySemicolon(conn, sql, label) {
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  for (const stmt of statements) {
    await conn.query(stmt);
  }
  console.log(`✓ ${label} (${statements.length} statements)`);
}

// For triggers / functions / procedures — DELIMITER // files.
// Strategy: anything before the first "DELIMITER //" line is preamble and is
// run as semicolon-delimited statements; the remaining body is stripped of all
// DELIMITER lines and split on "//" to get individual CREATE bodies.
async function runByDelimiter(conn, sql, label) {
  const firstDelimIdx = sql.search(/^DELIMITER\s+\/\//m);

  let preamble = '';
  let body = sql;
  if (firstDelimIdx !== -1) {
    preamble = sql.slice(0, firstDelimIdx).trim();
    body = sql.slice(firstDelimIdx);
  }

  // Execute preamble (e.g. SET @@max_sp_recursion_depth)
  if (preamble) {
    const preambleStmts = preamble
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    for (const stmt of preambleStmts) {
      await conn.query(stmt);
    }
  }

  // Strip all DELIMITER lines then split on //
  const stripped = body
    .split('\n')
    .filter(line => !/^\s*DELIMITER\b/.test(line))
    .join('\n');

  const objects = stripped
    .split('//')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const obj of objects) {
    await conn.query(obj);
  }
  console.log(`✓ ${label} (${objects.length} objects)`);
}

// Objects to drop before recreating (tables are handled by schema.sql)
const DROP_TRIGGERS   = ['gate_buffer_check','gate_size_check','log_flight_status','release_equipment'];
const DROP_FUNCTIONS  = ['fn_turnaround_sec','fn_free_gates','fn_runway_utilization'];
const DROP_PROCEDURES = ['sp_propagate_delay','sp_assign_equipment','sp_generate_turnaround_summary','sp_refresh_live_map'];

let conn;
try {
  conn = await pool.getConnection();

  console.log('Running AeroVertex full setup…\n');

  // Drop programmable objects so re-runs are idempotent
  for (const t of DROP_TRIGGERS)   await conn.query(`DROP TRIGGER   IF EXISTS ${t}`).catch(() => {});
  for (const f of DROP_FUNCTIONS)  await conn.query(`DROP FUNCTION  IF EXISTS ${f}`).catch(() => {});
  for (const p of DROP_PROCEDURES) await conn.query(`DROP PROCEDURE IF EXISTS ${p}`).catch(() => {});

  await runBySemicolon(conn, loadSql('schema.sql'),     'Schema  (17 tables)');
  await runBySemicolon(conn, loadSql('indexes.sql'),    'Indexes');
  await runBySemicolon(conn, loadSql('views.sql'),      'Views');
  await runByDelimiter(conn, loadSql('triggers.sql'),   'Triggers');
  await runByDelimiter(conn, loadSql('functions.sql'),  'Functions');
  await runByDelimiter(conn, loadSql('procedures.sql'), 'Stored procedures');

  const [tables] = await conn.query('SHOW TABLES');
  console.log(`\n✅  Setup complete — ${tables.length} tables in database.`);
} catch (err) {
  console.error('\n✗ Setup failed:', err.message);
  process.exit(1);
} finally {
  if (conn) conn.release();
  await pool.end();
}

import pool from './connection.js';

try {
  const [rows] = await pool.query('SELECT 1 AS ok');
  if (rows[0].ok === 1) {
    console.log('Connected!');
  }
} catch (err) {
  console.error('Connection failed:', err.message);
} finally {
  await pool.end();
}

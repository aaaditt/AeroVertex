import pool from './_db.js';

export default async function handler(req, res) {
  try {
    const [arrivals] = await pool.query('SELECT * FROM v_arrivals_board');
    const [departures] = await pool.query('SELECT * FROM v_departures_board');
    res.status(200).json({ arrivals, departures });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

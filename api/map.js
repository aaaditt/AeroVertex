import pool from './_db.js';

export default async function handler(req, res) {
  const sec = Number(req.query.sec ?? 0);
  try {
    const [rows] = await pool.query(
      'SELECT * FROM live_map_cache WHERE sim_arrival_sec <= ? AND sim_departure_sec >= ?',
      [sec, sec]
    );
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

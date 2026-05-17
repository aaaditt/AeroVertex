import pool from './_db.js';

export default async function handler(req, res) {
  const sec = Number(req.query.sec ?? 0);
  // Fetch flights active now OR arriving within the next 200 sim-seconds.
  // 200 s covers the full off-screen approach segment so planes enter the DOM
  // before they cross the viewBox edge, eliminating "pop into existence" glitches.
  const LOOKAHEAD = 200;
  try {
    const [rows] = await pool.query(
      `SELECT * FROM live_map_cache
       WHERE sim_arrival_sec <= ? AND sim_departure_sec >= ?`,
      [sec + LOOKAHEAD, sec]
    );
    res.status(200).json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

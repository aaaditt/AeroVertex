import pool from './_db.js';

export default async function handler(req, res) {
  const from = Number(req.query.from ?? 0);
  const to   = Number(req.query.to   ?? 86400);

  try {
    const [terminals]  = await pool.query('SELECT * FROM Terminal');
    const [runways]    = await pool.query('SELECT * FROM Runway');

    const [[{ free_gates }]] = await pool.query(
      'SELECT fn_free_gates(?, ?) AS free_gates', [from, to]
    );

    const [[{ util_1, util_2 }]] = await pool.query(
      'SELECT fn_runway_utilization(1) AS util_1, fn_runway_utilization(2) AS util_2'
    );

    const [flightCounts] = await pool.query(
      'SELECT status, COUNT(*) AS count FROM Flight GROUP BY status'
    );

    res.status(200).json({
      terminals,
      runways,
      free_gates,
      runway_utilization: { runway_1: util_1, runway_2: util_2 },
      flight_counts: flightCounts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

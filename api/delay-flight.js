import pool from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { flight_id, delay_sec } = req.body ?? {};
  if (!flight_id || delay_sec == null) {
    return res.status(400).json({ error: 'flight_id and delay_sec required' });
  }

  try {
    const conn = await pool.getConnection();
    try {
      await conn.query('SET @@max_sp_recursion_depth = 50');
      await conn.query('CALL sp_propagate_delay(?, ?)', [flight_id, delay_sec]);
    } finally {
      conn.release();
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

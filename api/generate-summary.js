import pool from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { flight_id } = req.body ?? {};
  if (!flight_id) return res.status(400).json({ error: 'flight_id required' });

  try {
    await pool.query('CALL sp_generate_turnaround_summary(?)', [flight_id]);
    const [charges] = await pool.query(
      'SELECT * FROM TurnaroundCharge WHERE flight_id = ? ORDER BY charge_id DESC',
      [flight_id]
    );
    res.status(200).json({ charges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

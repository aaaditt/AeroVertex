import pool from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { flight_id, equipment_id } = req.body ?? {};
  if (!flight_id || !equipment_id) {
    return res.status(400).json({ error: 'flight_id and equipment_id required' });
  }

  try {
    await pool.query('CALL sp_assign_equipment(?, ?)', [flight_id, equipment_id]);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

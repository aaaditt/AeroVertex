import pool from './_db.js';

export default async function handler(req, res) {
  try {
    const [bays] = await pool.query(`
      SELECT cb.*, f.flight_number, f.status AS flight_status, f.flight_id AS current_flight_id
      FROM CargoBay cb
      LEFT JOIN Flight f ON f.bay_id = cb.bay_id
    `);

    const [shipments] = await pool.query(`
      SELECT cs.*, f.flight_number
      FROM CargoShipment cs
      LEFT JOIN Flight f ON cs.flight_id = f.flight_id
      ORDER BY cs.shipment_id DESC
    `);

    res.status(200).json({ bays, shipments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

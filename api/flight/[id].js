import pool from '../_db.js';

export default async function handler(req, res) {
  const { id } = req.query;
  try {
    const [flights] = await pool.query(`
      SELECT f.*,
             al.airline_name, al.iata_code AS airline_iata,
             af.tail_number, af.year_built,
             at2.model_name, at2.manufacturer, at2.size_category,
             g.gate_label, g.map_x AS gate_x, g.map_y AS gate_y
      FROM Flight f
      LEFT JOIN Airline al       ON f.airline_id   = al.airline_id
      LEFT JOIN AircraftFleet af ON f.aircraft_id  = af.aircraft_id
      LEFT JOIN AircraftType at2 ON af.type_id     = at2.type_id
      LEFT JOIN Gate g           ON f.gate_id      = g.gate_id
      WHERE f.flight_id = ?
    `, [id]);

    if (!flights.length) return res.status(404).json({ error: 'Flight not found' });

    const flight = flights[0];
    const [logs] = await pool.query(
      'SELECT * FROM ServiceLog WHERE flight_id = ? ORDER BY logged_at DESC',
      [id]
    );
    flight.service_logs = logs;

    res.status(200).json(flight);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

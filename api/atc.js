import pool from './_db.js';

export default async function handler(req, res) {
  try {
    const [flights] = await pool.query(`
      SELECT f.flight_id, f.flight_number, f.status,
             al.iata_code AS airline_iata,
             af.tail_number,
             g.gate_label
      FROM Flight f
      LEFT JOIN Airline al ON f.airline_id = al.airline_id
      LEFT JOIN AircraftFleet af ON f.aircraft_id = af.aircraft_id
      LEFT JOIN Gate g ON f.gate_id = g.gate_id
      WHERE f.status IN ('Inbound','Taxiing','At_Gate','Pushback')
      ORDER BY f.status, f.flight_id
    `);

    const [events] = await pool.query(
      'SELECT * FROM EventLog ORDER BY sim_logged_sec DESC LIMIT 20'
    );

    const grouped = {};
    for (const f of flights) {
      if (!grouped[f.status]) grouped[f.status] = [];
      grouped[f.status].push(f);
    }

    res.status(200).json({ flights: grouped, recent_events: events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

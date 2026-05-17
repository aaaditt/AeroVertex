import pool from './_db.js';

export default async function handler(req, res) {
  try {
    const [flights] = await pool.query(`
      SELECT f.flight_id, f.flight_number, f.status,
             f.sim_arrival_sec, f.sim_departure_sec,
             al.iata_code AS airline_iata, al.airline_name,
             af.tail_number,
             at2.model_name AS aircraft_model,
             g.gate_label
      FROM Flight f
      LEFT JOIN Airline al ON f.airline_id = al.airline_id
      LEFT JOIN AircraftFleet af ON f.aircraft_id = af.aircraft_id
      LEFT JOIN AircraftType at2 ON at2.type_id = af.type_id
      LEFT JOIN Gate g ON f.gate_id = g.gate_id
      WHERE f.status IN ('Inbound','Taxiing','At_Gate','Boarding','Pushback')
      ORDER BY f.status, f.flight_id
    `);

    const [events] = await pool.query(`
      SELECT el.*, f.flight_number
      FROM EventLog el
      LEFT JOIN Flight f ON f.flight_id = el.flight_id
      ORDER BY el.sim_logged_sec DESC LIMIT 20
    `);

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

import pool from './_db.js';

// Derive status from sim timestamps (same logic as frontend interpolation.js)
function deriveStatus(f, sec) {
  if (sec < f.sim_arrival_sec)     return 'Scheduled';
  if (sec < f.sim_gate_in_sec)     return 'Taxiing';
  if (sec < f.sim_gate_out_sec)    return 'At_Gate';
  if (sec < f.sim_departure_sec)   return 'Pushback';
  return 'Departed';
}

export default async function handler(req, res) {
  const sec = Number(req.query.sec ?? 0);

  try {
    const [flights] = await pool.query(`
      SELECT f.flight_id, f.flight_number, f.is_cargo,
             f.sim_arrival_sec, f.sim_gate_in_sec,
             f.sim_gate_out_sec, f.sim_departure_sec,
             f.delay_seconds,
             al.iata_code AS airline_iata, al.airline_name,
             af.tail_number,
             at2.model_name AS aircraft_model,
             g.gate_label
      FROM Flight f
      LEFT JOIN Airline al ON f.airline_id = al.airline_id
      LEFT JOIN AircraftFleet af ON f.aircraft_id = af.aircraft_id
      LEFT JOIN AircraftType at2 ON at2.type_id = af.type_id
      LEFT JOIN Gate g ON f.gate_id = g.gate_id
      WHERE f.sim_arrival_sec <= ? AND f.sim_departure_sec >= ?
    `, [sec + 300, sec - 300]);

    // Derive live status for each flight
    const enriched = flights.map(f => ({
      ...f,
      status: f.delay_seconds > 0 ? 'Delayed' : deriveStatus(f, sec),
    }));

    const grouped = {};
    for (const f of enriched) {
      if (!grouped[f.status]) grouped[f.status] = [];
      grouped[f.status].push(f);
    }

    const [events] = await pool.query(`
      SELECT el.*, f.flight_number
      FROM EventLog el
      LEFT JOIN Flight f ON f.flight_id = el.flight_id
      ORDER BY el.sim_logged_sec DESC LIMIT 20
    `);

    res.status(200).json({ flights: grouped, recent_events: events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

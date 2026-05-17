import pool from './_db.js';

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
             f.origin_airport, f.destination_airport,
             al.airline_name,
             g.gate_label,
             cb.bay_label
      FROM Flight f
      LEFT JOIN Airline al ON f.airline_id = al.airline_id
      LEFT JOIN Gate g ON f.gate_id = g.gate_id
      LEFT JOIN CargoBay cb ON f.bay_id = cb.bay_id
      ORDER BY f.sim_arrival_sec
    `);

    const enriched = flights.map(f => ({
      ...f,
      status: f.delay_seconds > 0 ? 'Delayed' : deriveStatus(f, sec),
    }));

    const arrivals = enriched.filter(f =>
      ['Scheduled','Taxiing','At_Gate','Delayed'].includes(f.status) ||
      f.sim_arrival_sec >= sec - 600
    ).filter(f => f.sim_arrival_sec <= sec + 3600);

    const departures = enriched.filter(f =>
      ['Pushback','Departed','At_Gate','Delayed'].includes(f.status) ||
      f.sim_departure_sec >= sec - 600
    ).filter(f => f.sim_departure_sec <= sec + 3600);

    res.status(200).json({ arrivals, departures });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

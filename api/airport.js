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
    const [terminals]  = await pool.query('SELECT * FROM Terminal');
    const [runways]    = await pool.query('SELECT * FROM Runway');

    // Count free gates at this sim second
    let free_gates = 0;
    try {
      const [[row]] = await pool.query(
        'SELECT fn_free_gates(?, ?) AS free_gates', [sec, sec]
      );
      free_gates = row?.free_gates ?? 0;
    } catch { free_gates = '—'; }

    // Runway utilization
    let util_1 = 0, util_2 = 0;
    try {
      const [[row]] = await pool.query(
        'SELECT fn_runway_utilization(1) AS util_1, fn_runway_utilization(2) AS util_2'
      );
      util_1 = row?.util_1 ?? 0;
      util_2 = row?.util_2 ?? 0;
    } catch { /* ignore */ }

    // Derive live status counts from timestamps
    const [allFlights] = await pool.query(`
      SELECT f.flight_id, f.sim_arrival_sec, f.sim_gate_in_sec,
             f.sim_gate_out_sec, f.sim_departure_sec,
             f.delay_seconds
      FROM Flight f
    `);

    const statusCounts = {};
    let inbound = 0, delayed = 0;
    for (const f of allFlights) {
      const st = f.delay_seconds > 0 ? 'Delayed' : deriveStatus(f, sec);
      statusCounts[st] = (statusCounts[st] || 0) + 1;
      if (st === 'Taxiing') inbound++;
      if (st === 'Delayed') delayed++;
    }

    const flight_counts = Object.entries(statusCounts).map(([status, count]) => ({
      status, count,
    }));

    res.status(200).json({
      terminals,
      runways,
      free_gates,
      runway_utilization: { runway_1: util_1, runway_2: util_2 },
      flight_counts,
      inbound,
      delayed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

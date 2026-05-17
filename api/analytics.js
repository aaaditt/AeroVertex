import pool from './_db.js';

async function safeQuery(label, fn) {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return { ok: false, error: `${label}: ${err.message}` };
  }
}

export default async function handler(req, res) {
  const [bottleneckResult, unusedGatesResult, busiestGatesResult,
         equipmentResult, passengerResult] = await Promise.all([

    // 1. Correlated subquery — bottleneck flights
    safeQuery('bottleneck', async () => {
      const [rows] = await pool.query(`
        SELECT f.flight_number, a.airline_name,
               fn_turnaround_sec(f.flight_id) AS turnaround_sec
        FROM Flight f
        JOIN Airline a ON a.airline_id = f.airline_id
        WHERE fn_turnaround_sec(f.flight_id) >
              (SELECT AVG(fn_turnaround_sec(f2.flight_id))
                 FROM Flight f2
                WHERE f2.airline_id = f.airline_id)
        ORDER BY turnaround_sec DESC
        LIMIT 20
      `);
      return rows;
    }),

    // 2. Nested query — under-used large gates
    safeQuery('unused_gates', async () => {
      const [rows] = await pool.query(`
        SELECT g.gate_label, g.max_size_category
        FROM Gate g
        WHERE g.max_size_category >= 4
          AND g.gate_id NOT IN (
              SELECT f.gate_id FROM Flight f
              JOIN AircraftFleet af ON af.aircraft_id = f.aircraft_id
              JOIN AircraftType at ON at.type_id = af.type_id
              WHERE at.size_category >= 4 AND f.gate_id IS NOT NULL)
        ORDER BY g.max_size_category DESC
      `);
      return rows;
    }),

    // 3. Busiest gates by flight count
    safeQuery('busiest_gates', async () => {
      const [rows] = await pool.query(`
        SELECT g.gate_label, COUNT(f.flight_id) AS flight_count
        FROM Gate g
        LEFT JOIN Flight f ON f.gate_id = g.gate_id
        GROUP BY g.gate_id, g.gate_label
        ORDER BY flight_count DESC
        LIMIT 15
      `);
      return rows;
    }),

    // 4. Equipment usage by total assignment duration (seconds)
    safeQuery('equipment_usage', async () => {
      const [rows] = await pool.query(`
        SELECT ge.equipment_type,
               ge.equipment_id,
               COUNT(gsa.assignment_id) AS assignment_count,
               SUM(TIMESTAMPDIFF(SECOND, gsa.assigned_at,
                   IFNULL(gsa.released_at, NOW()))) AS total_duration_sec
        FROM GroundEquipment ge
        LEFT JOIN GroundServiceAssignment gsa ON gsa.equipment_id = ge.equipment_id
        GROUP BY ge.equipment_id, ge.equipment_type
        ORDER BY total_duration_sec DESC
        LIMIT 15
      `);
      return rows;
    }),

    // 5. Passenger flow peaks per zone
    safeQuery('passenger_peaks', async () => {
      const [rows] = await pool.query(`
        SELECT pfl.zone_name, t.terminal_name,
               MAX(pfl.passenger_count) AS peak_count,
               AVG(pfl.passenger_count) AS avg_count,
               COUNT(*) AS log_entries
        FROM PassengerFlowLog pfl
        JOIN Terminal t ON t.terminal_id = pfl.terminal_id
        GROUP BY pfl.zone_name, pfl.terminal_id, t.terminal_name
        ORDER BY peak_count DESC
      `);
      return rows;
    }),
  ]);

  res.status(200).json({
    bottleneck_flights: bottleneckResult,
    unused_large_gates: unusedGatesResult,
    busiest_gates:      busiestGatesResult,
    equipment_usage:    equipmentResult,
    passenger_peaks:    passengerResult,
  });
}

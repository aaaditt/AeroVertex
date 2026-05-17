-- AeroVertex views (Section 13.6)

CREATE OR REPLACE VIEW v_arrivals_board AS
  SELECT flight_number, origin_airport, sim_arrival_sec, status, gate_id
  FROM Flight WHERE flight_kind = 'Arrival';

CREATE OR REPLACE VIEW v_departures_board AS
  SELECT flight_number, destination_airport, sim_departure_sec,
         status, gate_id
  FROM Flight WHERE flight_kind = 'Departure';

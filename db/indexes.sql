-- AeroVertex — performance indexes
-- These speed up the map query, status filters, and join paths.
-- PKs are already indexed — these cover the non-PK query hotspots.

CREATE INDEX idx_flight_gate_id        ON Flight (gate_id);
CREATE INDEX idx_flight_status         ON Flight (status);
CREATE INDEX idx_flight_sim_arrival    ON Flight (sim_arrival_sec);
CREATE INDEX idx_flight_aircraft_id    ON Flight (aircraft_id);
CREATE INDEX idx_flight_bay_id         ON Flight (bay_id);

-- Composite: runway slot queries filter by runway then time window
CREATE INDEX idx_runwayslot_runway_time
  ON RunwaySlot (runway_id, sim_slot_start_sec);

CREATE INDEX idx_servicelog_flight     ON ServiceLog (flight_id);
CREATE INDEX idx_eventlog_flight       ON EventLog (flight_id);
CREATE INDEX idx_cargoshipment_flight  ON CargoShipment (flight_id);
CREATE INDEX idx_gsa_flight            ON GroundServiceAssignment (flight_id);

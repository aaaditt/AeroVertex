-- AeroVertex triggers (Section 13.1)
-- DELIMITER markers are stripped by the JS runner which splits on the delimiter token.

DELIMITER //
CREATE TRIGGER gate_buffer_check
BEFORE INSERT ON Flight
FOR EACH ROW
BEGIN
  IF NEW.gate_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM Flight f
      WHERE f.gate_id = NEW.gate_id
        AND f.status <> 'Cancelled'
        AND NEW.sim_arrival_sec  < f.sim_departure_sec + 900
        AND NEW.sim_departure_sec > f.sim_arrival_sec  - 900
    ) THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
          'Gate occupied within the 15-minute turnaround buffer.';
    END IF;
  END IF;
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER gate_size_check
BEFORE INSERT ON Flight
FOR EACH ROW
BEGIN
  DECLARE ac_size INT;
  DECLARE gate_max INT;
  IF NEW.gate_id IS NOT NULL THEN
    SELECT at.size_category INTO ac_size
      FROM AircraftFleet af
      JOIN AircraftType at ON at.type_id = af.type_id
      WHERE af.aircraft_id = NEW.aircraft_id;
    SELECT g.max_size_category INTO gate_max
      FROM Gate g WHERE g.gate_id = NEW.gate_id;
    IF ac_size > gate_max THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
          'Aircraft size class exceeds gate capacity.';
    END IF;
  END IF;
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER log_flight_status
AFTER UPDATE ON Flight
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO EventLog(flight_id, old_status, new_status,
                         sim_logged_sec, note)
    VALUES (NEW.flight_id, OLD.status, NEW.status,
            NEW.sim_arrival_sec, 'Automatic status transition');
  END IF;
END //
DELIMITER ;

DELIMITER //
CREATE TRIGGER release_equipment
AFTER UPDATE ON GroundServiceAssignment
FOR EACH ROW
BEGIN
  IF NEW.released_at IS NOT NULL AND OLD.released_at IS NULL THEN
    UPDATE GroundEquipment
       SET status = 'Available'
     WHERE equipment_id = NEW.equipment_id;
  END IF;
END //
DELIMITER ;

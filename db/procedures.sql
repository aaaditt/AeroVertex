-- AeroVertex stored procedures (Sections 13.2 + 13.4)
-- The SET below is preamble executed before the DELIMITER // body.

SET @@max_sp_recursion_depth = 50;

DELIMITER //
CREATE PROCEDURE sp_propagate_delay(IN p_flight_id INT,
                                    IN p_delay_sec INT)
BEGIN
  DECLARE v_aircraft INT;
  DECLARE v_basetime INT;
  DECLARE v_next INT;

  UPDATE Flight
     SET delay_seconds = delay_seconds + p_delay_sec,
         sim_departure_sec = sim_departure_sec + p_delay_sec,
         status = 'Delayed'
   WHERE flight_id = p_flight_id;

  SELECT aircraft_id, sim_departure_sec
    INTO v_aircraft, v_basetime
    FROM Flight WHERE flight_id = p_flight_id;

  SELECT flight_id INTO v_next
    FROM Flight
   WHERE aircraft_id = v_aircraft
     AND sim_departure_sec > v_basetime
     AND status NOT IN ('Departed','Cancelled')
   ORDER BY sim_departure_sec
   LIMIT 1;

  IF v_next IS NOT NULL THEN
    CALL sp_propagate_delay(v_next, p_delay_sec);
  END IF;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_assign_equipment(IN p_flight_id INT,
                                     IN p_equipment_id INT)
BEGIN
  DECLARE v_status VARCHAR(20);

  START TRANSACTION;
  SELECT status INTO v_status
    FROM GroundEquipment
   WHERE equipment_id = p_equipment_id
   FOR UPDATE;

  IF v_status <> 'Available' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Equipment is already in use.';
  END IF;

  INSERT INTO GroundServiceAssignment(flight_id, equipment_id, assigned_at)
  VALUES (p_flight_id, p_equipment_id, NOW());

  UPDATE GroundEquipment SET status = 'In_Use'
   WHERE equipment_id = p_equipment_id;
  COMMIT;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_generate_turnaround_summary(IN p_flight_id INT)
BEGIN
  DECLARE v_mtow    DECIMAL(10,2);
  DECLARE v_sec     INT;
  DECLARE v_landing DECIMAL(10,2);
  DECLARE v_parking DECIMAL(10,2);
  DECLARE v_services DECIMAL(10,2);

  SELECT at.mtow_tonnes INTO v_mtow
    FROM Flight f
    JOIN AircraftFleet af ON af.aircraft_id = f.aircraft_id
    JOIN AircraftType at ON at.type_id = af.type_id
   WHERE f.flight_id = p_flight_id;

  SET v_landing  = IFNULL(v_mtow, 0) * 8.50;
  SET v_sec      = IFNULL(fn_turnaround_sec(p_flight_id), 0);
  SET v_parking  = (v_sec / 60) * 1.20;

  SELECT IFNULL(SUM(charge_amount), 0) INTO v_services
    FROM ServiceLog WHERE flight_id = p_flight_id;

  INSERT INTO TurnaroundCharge(flight_id, landing_fee, parking_fee,
                               service_fee, total, generated_at)
  VALUES (p_flight_id, v_landing, v_parking, v_services,
          v_landing + v_parking + v_services, NOW());

  UPDATE Airline
     SET ledger_balance = ledger_balance
                        + v_landing + v_parking + v_services
   WHERE airline_id = (SELECT airline_id FROM Flight
                        WHERE flight_id = p_flight_id);
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_refresh_live_map()
BEGIN
  DELETE FROM live_map_cache;
  INSERT INTO live_map_cache
  SELECT f.flight_id, f.flight_number, a.airline_name, f.status,
         f.origin_airport, f.destination_airport, f.delay_seconds,
         g.map_x, g.map_y, b.map_x, b.map_y,
         f.sim_arrival_sec, f.sim_gate_in_sec,
         f.sim_gate_out_sec, f.sim_departure_sec
  FROM Flight f
  JOIN Airline a ON a.airline_id = f.airline_id
  LEFT JOIN Gate g ON g.gate_id = f.gate_id
  LEFT JOIN CargoBay b ON b.bay_id = f.bay_id;
END //
DELIMITER ;

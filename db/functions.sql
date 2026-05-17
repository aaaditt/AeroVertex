-- AeroVertex functions (Section 13.3)

DELIMITER //
CREATE FUNCTION fn_turnaround_sec(p_flight_id INT)
RETURNS INT DETERMINISTIC
BEGIN
  DECLARE v_sec INT;
  SELECT (sim_gate_out_sec - sim_gate_in_sec) INTO v_sec
    FROM Flight WHERE flight_id = p_flight_id;
  RETURN v_sec;
END //
DELIMITER ;

DELIMITER //
CREATE FUNCTION fn_free_gates(p_from INT, p_to INT)
RETURNS INT DETERMINISTIC
BEGIN
  DECLARE v_count INT;
  SELECT COUNT(*) INTO v_count FROM Gate g
  WHERE NOT EXISTS (
    SELECT 1 FROM Flight f
    WHERE f.gate_id = g.gate_id
      AND p_from < f.sim_departure_sec
      AND p_to   > f.sim_arrival_sec);
  RETURN v_count;
END //
DELIMITER ;

DELIMITER //
CREATE FUNCTION fn_runway_utilization(p_runway_id INT)
RETURNS DECIMAL(5,1) DETERMINISTIC
BEGIN
  DECLARE v_pct DECIMAL(5,1);
  SELECT ROUND(100.0 *
           SUM(slot_status <> 'Open') / NULLIF(COUNT(*),0), 1)
    INTO v_pct
    FROM RunwaySlot WHERE runway_id = p_runway_id;
  RETURN v_pct;
END //
DELIMITER ;

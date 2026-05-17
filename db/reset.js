// db/reset.js — full database reset + reseed
// Usage: node db/reset.js
//
// Drops all tables, procedures, functions, and triggers, then rebuilds the
// schema and seeds fresh data with corrected timing so no flight is ever
// pre-fetched already-parked at sim second 0.

import { faker } from '@faker-js/faker'
import pool from './connection.js'

const conn = await pool.getConnection()

// ─── Step 1: drop everything ─────────────────────────────────────────────────
console.log('Step 1/4  Dropping existing objects…')

await conn.query('SET FOREIGN_KEY_CHECKS = 0')
for (const tbl of [
  'live_map_cache','TurnaroundCharge','CargoShipment','EventLog',
  'PassengerFlowLog','ServiceLog','GroundServiceAssignment','Flight',
  'GroundEquipment','CargoBay','Gate','RunwaySlot','Runway',
  'AircraftFleet','AircraftType','Airline','Terminal',
]) {
  await conn.query(`DROP TABLE IF EXISTS ${tbl}`)
}
for (const name of [
  'gate_buffer_check','gate_size_check','log_flight_status','release_equipment',
]) {
  await conn.query(`DROP TRIGGER IF EXISTS ${name}`)
}
for (const name of [
  'sp_propagate_delay','sp_assign_equipment','sp_generate_turnaround_summary','sp_refresh_live_map',
]) {
  await conn.query(`DROP PROCEDURE IF EXISTS ${name}`)
}
for (const name of ['fn_turnaround_sec','fn_free_gates','fn_runway_utilization']) {
  await conn.query(`DROP FUNCTION IF EXISTS ${name}`)
}
await conn.query('SET FOREIGN_KEY_CHECKS = 1')
console.log('  ✓ All objects dropped')

// ─── Step 2: recreate schema ──────────────────────────────────────────────────
console.log('Step 2/4  Recreating schema…')

await conn.query(`
CREATE TABLE Terminal (
  terminal_id   INT          NOT NULL AUTO_INCREMENT,
  terminal_name VARCHAR(100) NOT NULL,
  terminal_type VARCHAR(50)  NOT NULL,
  map_x         DECIMAL(8,2) NOT NULL DEFAULT 0,
  map_y         DECIMAL(8,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (terminal_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE Airline (
  airline_id      INT           NOT NULL AUTO_INCREMENT,
  airline_name    VARCHAR(100)  NOT NULL,
  iata_code       CHAR(2)       NOT NULL,
  country         VARCHAR(100)  NOT NULL,
  ledger_balance  DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (airline_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE AircraftType (
  type_id            INT           NOT NULL AUTO_INCREMENT,
  manufacturer       VARCHAR(100)  NOT NULL,
  model_name         VARCHAR(100)  NOT NULL,
  mtow_tonnes        DECIMAL(8,2)  NOT NULL,
  wingspan_m         DECIMAL(6,2)  NOT NULL,
  size_category      INT           NOT NULL,
  passenger_capacity INT           NOT NULL,
  PRIMARY KEY (type_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE AircraftFleet (
  aircraft_id INT         NOT NULL AUTO_INCREMENT,
  tail_number VARCHAR(20) NOT NULL,
  airline_id  INT         NOT NULL,
  type_id     INT         NOT NULL,
  year_built  INT         NOT NULL,
  PRIMARY KEY (aircraft_id),
  UNIQUE KEY uq_tail (tail_number),
  CONSTRAINT fk_fleet_airline FOREIGN KEY (airline_id) REFERENCES Airline (airline_id),
  CONSTRAINT fk_fleet_type    FOREIGN KEY (type_id)    REFERENCES AircraftType (type_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE Runway (
  runway_id   INT          NOT NULL AUTO_INCREMENT,
  runway_name VARCHAR(20)  NOT NULL,
  length_m    INT          NOT NULL,
  map_x1      DECIMAL(8,2) NOT NULL DEFAULT 0,
  map_y1      DECIMAL(8,2) NOT NULL DEFAULT 0,
  map_x2      DECIMAL(8,2) NOT NULL DEFAULT 0,
  map_y2      DECIMAL(8,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (runway_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE RunwaySlot (
  slot_id            INT         NOT NULL AUTO_INCREMENT,
  runway_id          INT         NOT NULL,
  sim_slot_start_sec INT         NOT NULL,
  sim_slot_end_sec   INT         NOT NULL,
  slot_status        VARCHAR(10) NOT NULL DEFAULT 'Open',
  PRIMARY KEY (slot_id),
  CONSTRAINT fk_slot_runway FOREIGN KEY (runway_id) REFERENCES Runway (runway_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE Gate (
  gate_id           INT          NOT NULL AUTO_INCREMENT,
  gate_label        VARCHAR(20)  NOT NULL,
  terminal_id       INT          NOT NULL,
  max_size_category INT          NOT NULL,
  map_x             DECIMAL(8,2) NOT NULL DEFAULT 0,
  map_y             DECIMAL(8,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (gate_id),
  CONSTRAINT fk_gate_terminal FOREIGN KEY (terminal_id) REFERENCES Terminal (terminal_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE CargoBay (
  bay_id            INT          NOT NULL AUTO_INCREMENT,
  bay_label         VARCHAR(20)  NOT NULL,
  terminal_id       INT          NOT NULL,
  max_size_category INT          NOT NULL,
  map_x             DECIMAL(8,2) NOT NULL DEFAULT 0,
  map_y             DECIMAL(8,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (bay_id),
  CONSTRAINT fk_bay_terminal FOREIGN KEY (terminal_id) REFERENCES Terminal (terminal_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE GroundEquipment (
  equipment_id    INT          NOT NULL AUTO_INCREMENT,
  equipment_type  VARCHAR(50)  NOT NULL,
  equipment_label VARCHAR(100) NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'Available',
  PRIMARY KEY (equipment_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE Flight (
  flight_id           INT          NOT NULL AUTO_INCREMENT,
  flight_number       VARCHAR(20)  NOT NULL,
  airline_id          INT          NOT NULL,
  aircraft_id         INT          NOT NULL,
  flight_kind         VARCHAR(20)  NOT NULL,
  is_cargo            BOOLEAN      NOT NULL DEFAULT FALSE,
  origin_airport      VARCHAR(10)  NOT NULL,
  destination_airport VARCHAR(10)  NOT NULL,
  sim_arrival_sec     INT          NOT NULL,
  sim_gate_in_sec     INT          NOT NULL,
  sim_gate_out_sec    INT          NOT NULL,
  sim_departure_sec   INT          NOT NULL,
  gate_id             INT          NULL,
  bay_id              INT          NULL,
  runway_slot_id      INT          NULL,
  status              VARCHAR(20)  NOT NULL DEFAULT 'Scheduled',
  delay_seconds       INT          NOT NULL DEFAULT 0,
  passenger_count     INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (flight_id),
  CONSTRAINT fk_flight_airline  FOREIGN KEY (airline_id)     REFERENCES Airline (airline_id),
  CONSTRAINT fk_flight_aircraft FOREIGN KEY (aircraft_id)    REFERENCES AircraftFleet (aircraft_id),
  CONSTRAINT fk_flight_gate     FOREIGN KEY (gate_id)        REFERENCES Gate (gate_id),
  CONSTRAINT fk_flight_bay      FOREIGN KEY (bay_id)         REFERENCES CargoBay (bay_id),
  CONSTRAINT fk_flight_slot     FOREIGN KEY (runway_slot_id) REFERENCES RunwaySlot (slot_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE GroundServiceAssignment (
  assignment_id INT      NOT NULL AUTO_INCREMENT,
  flight_id     INT      NOT NULL,
  equipment_id  INT      NOT NULL,
  assigned_at   DATETIME NOT NULL,
  released_at   DATETIME NULL,
  PRIMARY KEY (assignment_id),
  CONSTRAINT fk_gsa_flight    FOREIGN KEY (flight_id)    REFERENCES Flight (flight_id),
  CONSTRAINT fk_gsa_equipment FOREIGN KEY (equipment_id) REFERENCES GroundEquipment (equipment_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE ServiceLog (
  log_id        INT           NOT NULL AUTO_INCREMENT,
  flight_id     INT           NOT NULL,
  service_type  VARCHAR(50)   NOT NULL,
  quantity      DECIMAL(10,2) NOT NULL,
  charge_amount DECIMAL(10,2) NOT NULL,
  logged_at     DATETIME      NOT NULL,
  PRIMARY KEY (log_id),
  CONSTRAINT fk_svclog_flight FOREIGN KEY (flight_id) REFERENCES Flight (flight_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE PassengerFlowLog (
  flow_id          INT         NOT NULL AUTO_INCREMENT,
  terminal_id      INT         NOT NULL,
  zone_name        VARCHAR(50) NOT NULL,
  passenger_count  INT         NOT NULL,
  sim_recorded_sec INT         NOT NULL,
  PRIMARY KEY (flow_id),
  CONSTRAINT fk_flowlog_terminal FOREIGN KEY (terminal_id) REFERENCES Terminal (terminal_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE EventLog (
  event_id       INT          NOT NULL AUTO_INCREMENT,
  flight_id      INT          NOT NULL,
  old_status     VARCHAR(20)  NULL,
  new_status     VARCHAR(20)  NOT NULL,
  sim_logged_sec INT          NOT NULL,
  note           VARCHAR(255) NULL,
  PRIMARY KEY (event_id),
  CONSTRAINT fk_eventlog_flight FOREIGN KEY (flight_id) REFERENCES Flight (flight_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE CargoShipment (
  shipment_id     INT           NOT NULL AUTO_INCREMENT,
  flight_id       INT           NOT NULL,
  bay_id          INT           NOT NULL,
  weight_kg       DECIMAL(10,2) NOT NULL,
  cargo_type      VARCHAR(50)   NOT NULL,
  handling_status VARCHAR(20)   NOT NULL DEFAULT 'Received',
  PRIMARY KEY (shipment_id),
  CONSTRAINT fk_cargo_flight FOREIGN KEY (flight_id) REFERENCES Flight (flight_id),
  CONSTRAINT fk_cargo_bay    FOREIGN KEY (bay_id)    REFERENCES CargoBay (bay_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE TurnaroundCharge (
  charge_id    INT           NOT NULL AUTO_INCREMENT,
  flight_id    INT           NOT NULL,
  landing_fee  DECIMAL(10,2) NOT NULL,
  parking_fee  DECIMAL(10,2) NOT NULL,
  service_fee  DECIMAL(10,2) NOT NULL,
  total        DECIMAL(10,2) NOT NULL,
  generated_at DATETIME      NOT NULL,
  PRIMARY KEY (charge_id),
  CONSTRAINT fk_charge_flight FOREIGN KEY (flight_id) REFERENCES Flight (flight_id)
) ENGINE=InnoDB`)

await conn.query(`
CREATE TABLE live_map_cache (
  flight_id           INT          NOT NULL,
  flight_number       VARCHAR(20)  NOT NULL,
  airline_name        VARCHAR(100) NOT NULL,
  status              VARCHAR(20)  NOT NULL,
  origin_airport      CHAR(3)      NULL,
  destination_airport CHAR(3)      NULL,
  delay_seconds       INT          NOT NULL DEFAULT 0,
  gate_x              DECIMAL(8,2) NULL,
  gate_y              DECIMAL(8,2) NULL,
  bay_x               DECIMAL(8,2) NULL,
  bay_y               DECIMAL(8,2) NULL,
  sim_arrival_sec     INT          NOT NULL,
  sim_gate_in_sec     INT          NOT NULL,
  sim_gate_out_sec    INT          NOT NULL,
  sim_departure_sec   INT          NOT NULL,
  PRIMARY KEY (flight_id)
) ENGINE=InnoDB`)

console.log('  ✓ Tables created')

// ─── Step 3: recreate routines ────────────────────────────────────────────────
console.log('Step 3/4  Recreating triggers, functions, and procedures…')

await conn.query(`SET @@max_sp_recursion_depth = 50`)

await conn.query(`
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
        SET MESSAGE_TEXT = 'Gate occupied within the 15-minute turnaround buffer.';
    END IF;
  END IF;
END`)

await conn.query(`
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
        SET MESSAGE_TEXT = 'Aircraft size class exceeds gate capacity.';
    END IF;
  END IF;
END`)

await conn.query(`
CREATE TRIGGER log_flight_status
AFTER UPDATE ON Flight
FOR EACH ROW
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO EventLog(flight_id, old_status, new_status, sim_logged_sec, note)
    VALUES (NEW.flight_id, OLD.status, NEW.status, NEW.sim_arrival_sec, 'Automatic status transition');
  END IF;
END`)

await conn.query(`
CREATE TRIGGER release_equipment
AFTER UPDATE ON GroundServiceAssignment
FOR EACH ROW
BEGIN
  IF NEW.released_at IS NOT NULL AND OLD.released_at IS NULL THEN
    UPDATE GroundEquipment SET status = 'Available'
    WHERE equipment_id = NEW.equipment_id;
  END IF;
END`)

await conn.query(`
CREATE FUNCTION fn_turnaround_sec(p_flight_id INT)
RETURNS INT DETERMINISTIC
BEGIN
  DECLARE v_sec INT;
  SELECT (sim_gate_out_sec - sim_gate_in_sec) INTO v_sec
    FROM Flight WHERE flight_id = p_flight_id;
  RETURN v_sec;
END`)

await conn.query(`
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
END`)

await conn.query(`
CREATE FUNCTION fn_runway_utilization(p_runway_id INT)
RETURNS DECIMAL(5,1) DETERMINISTIC
BEGIN
  DECLARE v_pct DECIMAL(5,1);
  SELECT ROUND(100.0 * SUM(slot_status <> 'Open') / NULLIF(COUNT(*),0), 1)
    INTO v_pct
    FROM RunwaySlot WHERE runway_id = p_runway_id;
  RETURN v_pct;
END`)

await conn.query(`
CREATE PROCEDURE sp_propagate_delay(IN p_flight_id INT, IN p_delay_sec INT)
BEGIN
  DECLARE v_aircraft INT;
  DECLARE v_basetime INT;
  DECLARE v_next INT;
  UPDATE Flight
     SET delay_seconds = delay_seconds + p_delay_sec,
         sim_departure_sec = sim_departure_sec + p_delay_sec,
         status = 'Delayed'
   WHERE flight_id = p_flight_id;
  SELECT aircraft_id, sim_departure_sec INTO v_aircraft, v_basetime
    FROM Flight WHERE flight_id = p_flight_id;
  SELECT flight_id INTO v_next
    FROM Flight
   WHERE aircraft_id = v_aircraft
     AND sim_departure_sec > v_basetime
     AND status NOT IN ('Departed','Cancelled')
   ORDER BY sim_departure_sec LIMIT 1;
  IF v_next IS NOT NULL THEN
    CALL sp_propagate_delay(v_next, p_delay_sec);
  END IF;
END`)

await conn.query(`
CREATE PROCEDURE sp_assign_equipment(IN p_flight_id INT, IN p_equipment_id INT)
BEGIN
  DECLARE v_status VARCHAR(20);
  START TRANSACTION;
  SELECT status INTO v_status FROM GroundEquipment
  WHERE equipment_id = p_equipment_id FOR UPDATE;
  IF v_status <> 'Available' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Equipment is already in use.';
  END IF;
  INSERT INTO GroundServiceAssignment(flight_id, equipment_id, assigned_at)
  VALUES (p_flight_id, p_equipment_id, NOW());
  UPDATE GroundEquipment SET status = 'In_Use' WHERE equipment_id = p_equipment_id;
  COMMIT;
END`)

await conn.query(`
CREATE PROCEDURE sp_generate_turnaround_summary(IN p_flight_id INT)
BEGIN
  DECLARE v_mtow     DECIMAL(10,2);
  DECLARE v_sec      INT;
  DECLARE v_landing  DECIMAL(10,2);
  DECLARE v_parking  DECIMAL(10,2);
  DECLARE v_services DECIMAL(10,2);
  SELECT at.mtow_tonnes INTO v_mtow
    FROM Flight f
    JOIN AircraftFleet af ON af.aircraft_id = f.aircraft_id
    JOIN AircraftType at  ON at.type_id     = af.type_id
   WHERE f.flight_id = p_flight_id;
  SET v_landing  = IFNULL(v_mtow, 0) * 8.50;
  SET v_sec      = IFNULL(fn_turnaround_sec(p_flight_id), 0);
  SET v_parking  = (v_sec / 60) * 1.20;
  SELECT IFNULL(SUM(charge_amount), 0) INTO v_services
    FROM ServiceLog WHERE flight_id = p_flight_id;
  INSERT INTO TurnaroundCharge(flight_id, landing_fee, parking_fee, service_fee, total, generated_at)
  VALUES (p_flight_id, v_landing, v_parking, v_services, v_landing + v_parking + v_services, NOW());
  UPDATE Airline
     SET ledger_balance = ledger_balance + v_landing + v_parking + v_services
   WHERE airline_id = (SELECT airline_id FROM Flight WHERE flight_id = p_flight_id);
END`)

await conn.query(`
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
END`)

console.log('  ✓ Triggers, functions, and procedures created')

// ─── Step 4: seed data ────────────────────────────────────────────────────────
console.log('Step 4/4  Seeding data…')

// ── Static reference pools ────────────────────────────────────────────────────
const AIRPORTS = [
  'JFK','LAX','ORD','DFW','ATL','DEN','SFO','SEA','LAS','MCO',
  'MIA','BOS','PHX','EWR','MSP','DTW','FLL','SLC','PDX','STL',
  'AUS','BNA','RDU','TPA','IAD','PHL','CLT','MDW','OAK','BWI',
]
const HUB = 'AXV'

const CARGO_TYPES = [
  'Electronics','Pharmaceuticals','Perishables','Machinery',
  'Textiles','Automotive Parts','Mail','Hazardous (Cat B)',
]

const SERVICE_SPECS = [
  { type: 'Fueling',          rate: 0.85  },
  { type: 'Catering',         rate: 12.00 },
  { type: 'Cleaning',         rate: 45.00 },
  { type: 'Baggage Handling', rate: 2.50  },
  { type: 'Ground Power',     rate: 0.22  },
]

function rndAirport() { return faker.helpers.arrayElement(AIRPORTS) }

function claimAircraft(pool, maxSize, arrivalSec) {
  return pool.find(ac => ac.size <= maxSize && ac.lastDep < arrivalSec) ?? null
}

function claimSlot(slotsByRw, rwIds, rwIdx, simSec) {
  const slots = slotsByRw[rwIds[rwIdx]]
  const near = slots.find(s => s.start <= simSec && s.start >= simSec - 60 && s.status === 'Open')
            ?? slots.find(s => s.status === 'Open')
  if (near) { near.status = 'Booked'; return near.id }
  return null
}

// ── Terminals ──────────────────────────────────────────────────────────────────
const [{ insertId: paxTermId }] = await conn.query(
  'INSERT INTO Terminal (terminal_name, terminal_type, map_x, map_y) VALUES (?,?,?,?)',
  ['Passenger Terminal A', 'Passenger', 500, 200]
)
const [{ insertId: cargoTermId }] = await conn.query(
  'INSERT INTO Terminal (terminal_name, terminal_type, map_x, map_y) VALUES (?,?,?,?)',
  ['Cargo Terminal B', 'Cargo', 500, 480]
)
console.log('  ✓ 2 terminals')

// ── Airlines ───────────────────────────────────────────────────────────────────
const AIRLINES = [
  { airline_name: 'American Airlines',  iata_code: 'AA', country: 'USA' },
  { airline_name: 'United Airlines',    iata_code: 'UA', country: 'USA' },
  { airline_name: 'Delta Air Lines',    iata_code: 'DL', country: 'USA' },
  { airline_name: 'Southwest Airlines', iata_code: 'WN', country: 'USA' },
  { airline_name: 'FedEx Express',      iata_code: 'FX', country: 'USA' },
  { airline_name: 'UPS Airlines',       iata_code: '5X', country: 'USA' },
]
const airlineIds = []
for (const a of AIRLINES) {
  const [r] = await conn.query(
    'INSERT INTO Airline (airline_name, iata_code, country) VALUES (?,?,?)',
    [a.airline_name, a.iata_code, a.country]
  )
  airlineIds.push(r.insertId)
}
const airlineCode = {}
AIRLINES.forEach((a, i) => { airlineCode[airlineIds[i]] = a.iata_code })
console.log('  ✓ 6 airlines')

// ── Aircraft types ─────────────────────────────────────────────────────────────
const AIRCRAFT_TYPES = [
  { manufacturer: 'Embraer', model_name: 'E170',     mtow_tonnes:  36.7, wingspan_m: 26.0, size_category: 1, passenger_capacity:  70 },
  { manufacturer: 'Embraer', model_name: 'E190',     mtow_tonnes:  47.8, wingspan_m: 28.7, size_category: 2, passenger_capacity: 100 },
  { manufacturer: 'Boeing',  model_name: '737-700',  mtow_tonnes:  70.1, wingspan_m: 34.3, size_category: 2, passenger_capacity: 128 },
  { manufacturer: 'Boeing',  model_name: '737-800',  mtow_tonnes:  79.0, wingspan_m: 35.8, size_category: 3, passenger_capacity: 162 },
  { manufacturer: 'Airbus',  model_name: 'A320',     mtow_tonnes:  78.0, wingspan_m: 35.8, size_category: 3, passenger_capacity: 150 },
  { manufacturer: 'Boeing',  model_name: '757-200',  mtow_tonnes: 115.7, wingspan_m: 38.1, size_category: 3, passenger_capacity: 200 },
  { manufacturer: 'Boeing',  model_name: '767-300',  mtow_tonnes: 159.0, wingspan_m: 47.6, size_category: 4, passenger_capacity: 218 },
  { manufacturer: 'Boeing',  model_name: '777-200',  mtow_tonnes: 247.2, wingspan_m: 60.9, size_category: 4, passenger_capacity: 305 },
  { manufacturer: 'Boeing',  model_name: '747-400F', mtow_tonnes: 412.8, wingspan_m: 64.4, size_category: 5, passenger_capacity:   0 },
  { manufacturer: 'Airbus',  model_name: 'A300F',    mtow_tonnes: 170.5, wingspan_m: 44.8, size_category: 4, passenger_capacity:   0 },
]
const typeIds = []
const typeCapacity = {}
for (const t of AIRCRAFT_TYPES) {
  const [r] = await conn.query(
    'INSERT INTO AircraftType (manufacturer, model_name, mtow_tonnes, wingspan_m, size_category, passenger_capacity) VALUES (?,?,?,?,?,?)',
    [t.manufacturer, t.model_name, t.mtow_tonnes, t.wingspan_m, t.size_category, t.passenger_capacity]
  )
  typeIds.push(r.insertId)
  typeCapacity[r.insertId] = t.passenger_capacity
}
console.log('  ✓ 10 aircraft types')

// ── Fleet ──────────────────────────────────────────────────────────────────────
const AIRLINE_FLEET = [
  { types: [0, 1, 2, 3, 4], tailPfx: 'N1', tailSfx: 'AA', cargo: false },
  { types: [2, 3, 4, 5, 6], tailPfx: 'N2', tailSfx: 'UA', cargo: false },
  { types: [3, 4, 5, 6, 7], tailPfx: 'N3', tailSfx: 'DL', cargo: false },
  { types: [2, 2, 3, 3, 4], tailPfx: 'N4', tailSfx: 'WN', cargo: false },
  { types: [8, 8, 9, 9, 9], tailPfx: 'N5', tailSfx: 'FX', cargo: true  },
  { types: [8, 9, 9, 9, 9], tailPfx: 'N6', tailSfx: 'UP', cargo: true  },
]
const allAircraft = []
for (let ai = 0; ai < AIRLINES.length; ai++) {
  const fleet = AIRLINE_FLEET[ai]
  for (let j = 0; j < 5; j++) {
    const typeIdx = fleet.types[j]
    const typeId  = typeIds[typeIdx]
    const tail    = `${fleet.tailPfx}${j}${fleet.tailSfx}`
    const [r] = await conn.query(
      'INSERT INTO AircraftFleet (tail_number, airline_id, type_id, year_built) VALUES (?,?,?,?)',
      [tail, airlineIds[ai], typeId, faker.number.int({ min: 2010, max: 2023 })]
    )
    allAircraft.push({
      id: r.insertId, airlineId: airlineIds[ai], typeId,
      size: AIRCRAFT_TYPES[typeIdx].size_category,
      lastDep: -1,
      isCargo: fleet.cargo,
    })
  }
}
const paxAircraft   = allAircraft.filter(a => !a.isCargo)
const cargoAircraft = allAircraft.filter(a =>  a.isCargo)
console.log(`  ✓ ${allAircraft.length} aircraft`)

// ── Runways + slots ────────────────────────────────────────────────────────────
const rwIds     = []
const slotsByRw = {}
for (const rw of [
  { runway_name: '09L/27R', length_m: 3500, map_x1: 50, map_y1: 82,  map_x2: 950, map_y2: 82  },
  { runway_name: '09R/27L', length_m: 3200, map_x1: 50, map_y1: 572, map_x2: 950, map_y2: 572 },
]) {
  const [r] = await conn.query(
    'INSERT INTO Runway (runway_name, length_m, map_x1, map_y1, map_x2, map_y2) VALUES (?,?,?,?,?,?)',
    [rw.runway_name, rw.length_m, rw.map_x1, rw.map_y1, rw.map_x2, rw.map_y2]
  )
  const rwId = r.insertId
  rwIds.push(rwId)
  slotsByRw[rwId] = []
  for (let t = 0; t < 1800; t += 60) {
    const [sr] = await conn.query(
      'INSERT INTO RunwaySlot (runway_id, sim_slot_start_sec, sim_slot_end_sec, slot_status) VALUES (?,?,?,?)',
      [rwId, t, t + 60, 'Open']
    )
    slotsByRw[rwId].push({ id: sr.insertId, start: t, end: t + 60, status: 'Open' })
  }
}
console.log('  ✓ 2 runways, 60 slots')

// ── Gates (coordinates match mapConfig.js exactly) ─────────────────────────────
// A-gates: finger pier tips (y=305).  B-gates: north apron of terminal (y=162).
const GATE_DATA = [
  { gate_label: 'A1', max_size_category: 2, map_x: 155, map_y: 305 },
  { gate_label: 'A2', max_size_category: 3, map_x: 255, map_y: 305 },
  { gate_label: 'A3', max_size_category: 3, map_x: 360, map_y: 305 },
  { gate_label: 'A4', max_size_category: 4, map_x: 465, map_y: 305 },
  { gate_label: 'A5', max_size_category: 4, map_x: 565, map_y: 305 },
  { gate_label: 'B1', max_size_category: 2, map_x: 175, map_y: 162 },
  { gate_label: 'B2', max_size_category: 3, map_x: 265, map_y: 162 },
  { gate_label: 'B3', max_size_category: 3, map_x: 355, map_y: 162 },
  { gate_label: 'B4', max_size_category: 4, map_x: 445, map_y: 162 },
  { gate_label: 'B5', max_size_category: 4, map_x: 535, map_y: 162 },
  { gate_label: 'B6', max_size_category: 5, map_x: 615, map_y: 162 },
]
const gates = []
for (const g of GATE_DATA) {
  const [r] = await conn.query(
    'INSERT INTO Gate (gate_label, terminal_id, max_size_category, map_x, map_y) VALUES (?,?,?,?,?)',
    [g.gate_label, paxTermId, g.max_size_category, g.map_x, g.map_y]
  )
  gates.push({ id: r.insertId, ...g })
}
console.log(`  ✓ ${gates.length} gates`)

// ── Cargo bays (coordinates match mapConfig.js exactly) ────────────────────────
const BAY_DATA = [
  { bay_label: 'C1', max_size_category: 4, map_x: 285, map_y: 495 },
  { bay_label: 'C2', max_size_category: 4, map_x: 365, map_y: 495 },
  { bay_label: 'C3', max_size_category: 4, map_x: 445, map_y: 495 },
  { bay_label: 'C4', max_size_category: 4, map_x: 525, map_y: 495 },
  { bay_label: 'C5', max_size_category: 5, map_x: 605, map_y: 495 },
  { bay_label: 'C6', max_size_category: 5, map_x: 685, map_y: 495 },
]
const bays = []
for (const b of BAY_DATA) {
  const [r] = await conn.query(
    'INSERT INTO CargoBay (bay_label, terminal_id, max_size_category, map_x, map_y) VALUES (?,?,?,?,?)',
    [b.bay_label, cargoTermId, b.max_size_category, b.map_x, b.map_y]
  )
  bays.push({ id: r.insertId, ...b })
}
console.log(`  ✓ ${bays.length} cargo bays`)

// ── Ground equipment ───────────────────────────────────────────────────────────
for (const e of [
  { equipment_type: 'Fuel Truck',        equipment_label: 'FT-01' },
  { equipment_type: 'Fuel Truck',        equipment_label: 'FT-02' },
  { equipment_type: 'Baggage Cart',      equipment_label: 'BC-01' },
  { equipment_type: 'Baggage Cart',      equipment_label: 'BC-02' },
  { equipment_type: 'Push-back Tug',     equipment_label: 'PT-01' },
  { equipment_type: 'Push-back Tug',     equipment_label: 'PT-02' },
  { equipment_type: 'Air Stairs',        equipment_label: 'AS-01' },
  { equipment_type: 'Ground Power Unit', equipment_label: 'GPU-01' },
]) {
  await conn.query(
    'INSERT INTO GroundEquipment (equipment_type, equipment_label, status) VALUES (?,?,?)',
    [e.equipment_type, e.equipment_label, 'Available']
  )
}
console.log('  ✓ 8 equipment pieces')

// ─────────────────────────────────────────────────────────────────────────────
// PASSENGER FLIGHTS
// Key timing invariant: sim_arrival_sec must be > LOOKAHEAD (200s) from sim=0
// so no flight is inside the pre-fetch window at startup.
//
// Schedule:
//   Batch A — arrivals every 40s starting at t=250. With 11 gates this spans
//             250 → 650s. gate_time=240-280s. Batch A dep range: 650→1050.
//   Batch B — arrivals starting 920s after Batch A dep (trigger buffer).
//             This lands Batch B at ~1570→1800, fully within the 1800s sim.
//
// Each plane: approach (off-screen) → land rwy1 → taxi → gate → pushback →
//             rwy2 → take off (off-screen).
// ─────────────────────────────────────────────────────────────────────────────
const TAXI   = 90   // sim-seconds: arrival → gate_in  (enough for full taxi animation)
const PUSHBK = 60   // sim-seconds: gate_out → departure
const BUFFER = 920  // trigger requires > 900s gap between flights at same gate

const paxFlightIds = []
let fnCounter = 1000

for (let gi = 0; gi < gates.length; gi++) {
  const gate  = gates[gi]
  const rwIdx = gi % 2

  // Batch A
  const arrA  = 250 + gi * 40          // 250, 290, 330 … 650 — well outside LOOKAHEAD
  const ginA  = arrA + TAXI             // 340, 380 …
  const goutA = ginA + 240 + (gi % 3) * 20   // 240–280 s gate time
  const depA  = goutA + PUSHBK

  const acA = claimAircraft(paxAircraft, gate.max_size_category, arrA)
  if (acA) {
    acA.lastDep = depA
    const slotId = claimSlot(slotsByRw, rwIds, rwIdx, arrA)
    const cap    = typeCapacity[acA.typeId] || 150
    const code   = airlineCode[acA.airlineId]
    const [r] = await conn.query(
      `INSERT INTO Flight
         (flight_number, airline_id, aircraft_id, flight_kind, is_cargo,
          origin_airport, destination_airport, sim_arrival_sec, sim_gate_in_sec,
          sim_gate_out_sec, sim_departure_sec, gate_id, runway_slot_id,
          status, passenger_count)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [`${code}${fnCounter++}`, acA.airlineId, acA.id, 'Arrival', false,
        rndAirport(), HUB, arrA, ginA, goutA, depA,
        gate.id, slotId, 'Scheduled',
        faker.number.int({ min: 40, max: cap })]
    )
    paxFlightIds.push(r.insertId)
  }

  // Batch B — only fits if dep time is within 1800s
  const arrB  = depA + BUFFER
  if (arrB >= 1800) continue          // skip if it falls outside the sim window
  const ginB  = arrB + TAXI
  const goutB = ginB + 200
  const depB  = goutB + PUSHBK
  if (depB > 1800) continue

  const acB = claimAircraft(paxAircraft, gate.max_size_category, arrB)
  if (acB) {
    acB.lastDep = depB
    const slotId2 = claimSlot(slotsByRw, rwIds, rwIdx, depB)
    const cap2    = typeCapacity[acB.typeId] || 150
    const code2   = airlineCode[acB.airlineId]
    const [r] = await conn.query(
      `INSERT INTO Flight
         (flight_number, airline_id, aircraft_id, flight_kind, is_cargo,
          origin_airport, destination_airport, sim_arrival_sec, sim_gate_in_sec,
          sim_gate_out_sec, sim_departure_sec, gate_id, runway_slot_id,
          status, passenger_count)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [`${code2}${fnCounter++}`, acB.airlineId, acB.id, 'Departure', false,
        HUB, rndAirport(), arrB, ginB, goutB, depB,
        gate.id, slotId2, 'Scheduled',
        faker.number.int({ min: 30, max: cap2 })]
    )
    paxFlightIds.push(r.insertId)
  }
}
console.log(`  ✓ ${paxFlightIds.length} passenger flights`)

// ─────────────────────────────────────────────────────────────────────────────
// CARGO FLIGHTS
// Also start outside LOOKAHEAD=200. Space bays 30s apart within each batch.
// ─────────────────────────────────────────────────────────────────────────────
const CARGO_BATCHES = [
  { base: 280,  gateTime: 300 },   // Batch 0: 280–430s arrivals
  { base: 900,  gateTime: 250 },   // Batch 1: 900–1050s
  { base: 1420, gateTime: 180 },   // Batch 2: 1420–1570s (fits within 1800s)
]

const cargoFlightIds = []
for (let bi = 0; bi < bays.length; bi++) {
  const bay = bays[bi]
  for (let batch = 0; batch < 3; batch++) {
    const arr  = CARGO_BATCHES[batch].base + bi * 30
    const gIn  = arr + 90
    const gOut = gIn + CARGO_BATCHES[batch].gateTime
    const dep  = gOut + 90
    if (dep > 1800) continue

    const rw   = (bi + batch) % 2
    const ac   = claimAircraft(cargoAircraft, bay.max_size_category, arr)
    if (!ac) continue
    ac.lastDep = dep

    const slotId = claimSlot(slotsByRw, rwIds, rw, arr)
    const code   = airlineCode[ac.airlineId]
    const [r] = await conn.query(
      `INSERT INTO Flight
         (flight_number, airline_id, aircraft_id, flight_kind, is_cargo,
          origin_airport, destination_airport, sim_arrival_sec, sim_gate_in_sec,
          sim_gate_out_sec, sim_departure_sec, bay_id, runway_slot_id,
          status, passenger_count)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [`${code}${fnCounter++}`, ac.airlineId, ac.id,
        batch === 0 ? 'Arrival' : 'Departure', true,
        batch === 0 ? rndAirport() : HUB,
        batch === 0 ? HUB : rndAirport(),
        arr, gIn, gOut, dep,
        bay.id, slotId, 'Scheduled', 0]
    )
    cargoFlightIds.push(r.insertId)
  }
}
console.log(`  ✓ ${cargoFlightIds.length} cargo flights`)

// ── Service logs (for first 20 pax flights) ────────────────────────────────────
let svcCount = 0
for (const fid of paxFlightIds.slice(0, 20)) {
  const n = faker.number.int({ min: 1, max: 3 })
  for (let s = 0; s < n; s++) {
    const svc = faker.helpers.arrayElement(SERVICE_SPECS)
    const qty = parseFloat(faker.number.float({ min: 1, max: 200, fractionDigits: 1 }).toFixed(1))
    await conn.query(
      'INSERT INTO ServiceLog (flight_id, service_type, quantity, charge_amount, logged_at) VALUES (?,?,?,?,NOW())',
      [fid, svc.type, qty, parseFloat((qty * svc.rate).toFixed(2))]
    )
    svcCount++
  }
}
console.log(`  ✓ ${svcCount} service log entries`)

// ── Passenger flow logs ────────────────────────────────────────────────────────
const ZONES = ['Check-in', 'Security', 'Departures', 'Arrivals', 'Baggage Claim']
let flowCount = 0
for (let t = 0; t <= 1800; t += 120) {
  for (const zone of ZONES) {
    await conn.query(
      'INSERT INTO PassengerFlowLog (terminal_id, zone_name, passenger_count, sim_recorded_sec) VALUES (?,?,?,?)',
      [paxTermId, zone, faker.number.int({ min: 15, max: 650 }), t]
    )
    flowCount++
  }
}
console.log(`  ✓ ${flowCount} passenger flow entries`)

// ── Cargo shipments ────────────────────────────────────────────────────────────
let shipCount = 0
for (const fid of cargoFlightIds) {
  const [[fl]] = await conn.query('SELECT bay_id FROM Flight WHERE flight_id = ?', [fid])
  if (!fl?.bay_id) continue
  const n = faker.number.int({ min: 1, max: 4 })
  for (let s = 0; s < n; s++) {
    await conn.query(
      'INSERT INTO CargoShipment (flight_id, bay_id, weight_kg, cargo_type, handling_status) VALUES (?,?,?,?,?)',
      [fid, fl.bay_id,
        parseFloat(faker.number.float({ min: 50, max: 8000, fractionDigits: 1 }).toFixed(1)),
        faker.helpers.arrayElement(CARGO_TYPES),
        faker.helpers.arrayElement(['Received', 'Loaded', 'Delivered'])]
    )
    shipCount++
  }
}
console.log(`  ✓ ${shipCount} cargo shipments`)

// ── Refresh live_map_cache ─────────────────────────────────────────────────────
await conn.query('CALL sp_refresh_live_map()')
const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM live_map_cache')

const total = paxFlightIds.length + cargoFlightIds.length
console.log(`\n✅  Reset complete — ${total} flights, ${cnt} rows in live_map_cache.`)
console.log(`   First arrival: sim second 250 (≈41 real-seconds at speed×6)`)
console.log(`   All flights start as 'Scheduled' — no pre-placed planes.`)

conn.release()
await pool.end()

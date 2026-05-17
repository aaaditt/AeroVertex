-- AeroVertex — complete schema
-- Drop in reverse dependency order so FK constraints don't block

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS live_map_cache;
DROP TABLE IF EXISTS TurnaroundCharge;
DROP TABLE IF EXISTS CargoShipment;
DROP TABLE IF EXISTS EventLog;
DROP TABLE IF EXISTS PassengerFlowLog;
DROP TABLE IF EXISTS ServiceLog;
DROP TABLE IF EXISTS GroundServiceAssignment;
DROP TABLE IF EXISTS Flight;
DROP TABLE IF EXISTS GroundEquipment;
DROP TABLE IF EXISTS CargoBay;
DROP TABLE IF EXISTS Gate;
DROP TABLE IF EXISTS RunwaySlot;
DROP TABLE IF EXISTS Runway;
DROP TABLE IF EXISTS AircraftFleet;
DROP TABLE IF EXISTS AircraftType;
DROP TABLE IF EXISTS Airline;
DROP TABLE IF EXISTS Terminal;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Terminal
CREATE TABLE Terminal (
  terminal_id   INT          NOT NULL AUTO_INCREMENT,
  terminal_name VARCHAR(100) NOT NULL,
  terminal_type VARCHAR(50)  NOT NULL,
  map_x         DECIMAL(8,2) NOT NULL DEFAULT 0,
  map_y         DECIMAL(8,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (terminal_id)
) ENGINE=InnoDB;

-- 2. Airline
CREATE TABLE Airline (
  airline_id      INT           NOT NULL AUTO_INCREMENT,
  airline_name    VARCHAR(100)  NOT NULL,
  iata_code       CHAR(2)       NOT NULL,
  country         VARCHAR(100)  NOT NULL,
  ledger_balance  DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (airline_id)
) ENGINE=InnoDB;

-- 3. AircraftType
CREATE TABLE AircraftType (
  type_id            INT           NOT NULL AUTO_INCREMENT,
  manufacturer       VARCHAR(100)  NOT NULL,
  model_name         VARCHAR(100)  NOT NULL,
  mtow_tonnes        DECIMAL(8,2)  NOT NULL,
  wingspan_m         DECIMAL(6,2)  NOT NULL,
  size_category      INT           NOT NULL,
  passenger_capacity INT           NOT NULL,
  PRIMARY KEY (type_id)
) ENGINE=InnoDB;

-- 4. AircraftFleet
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
) ENGINE=InnoDB;

-- 5. Runway
CREATE TABLE Runway (
  runway_id   INT          NOT NULL AUTO_INCREMENT,
  runway_name VARCHAR(20)  NOT NULL,
  length_m    INT          NOT NULL,
  map_x1      DECIMAL(8,2) NOT NULL DEFAULT 0,
  map_y1      DECIMAL(8,2) NOT NULL DEFAULT 0,
  map_x2      DECIMAL(8,2) NOT NULL DEFAULT 0,
  map_y2      DECIMAL(8,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (runway_id)
) ENGINE=InnoDB;

-- 6. RunwaySlot
CREATE TABLE RunwaySlot (
  slot_id            INT         NOT NULL AUTO_INCREMENT,
  runway_id          INT         NOT NULL,
  sim_slot_start_sec INT         NOT NULL,
  sim_slot_end_sec   INT         NOT NULL,
  slot_status        VARCHAR(10) NOT NULL DEFAULT 'Open',
  PRIMARY KEY (slot_id),
  CONSTRAINT fk_slot_runway FOREIGN KEY (runway_id) REFERENCES Runway (runway_id)
) ENGINE=InnoDB;

-- 7. Gate
CREATE TABLE Gate (
  gate_id           INT          NOT NULL AUTO_INCREMENT,
  gate_label        VARCHAR(20)  NOT NULL,
  terminal_id       INT          NOT NULL,
  max_size_category INT          NOT NULL,
  map_x             DECIMAL(8,2) NOT NULL DEFAULT 0,
  map_y             DECIMAL(8,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (gate_id),
  CONSTRAINT fk_gate_terminal FOREIGN KEY (terminal_id) REFERENCES Terminal (terminal_id)
) ENGINE=InnoDB;

-- 8. CargoBay
CREATE TABLE CargoBay (
  bay_id            INT          NOT NULL AUTO_INCREMENT,
  bay_label         VARCHAR(20)  NOT NULL,
  terminal_id       INT          NOT NULL,
  max_size_category INT          NOT NULL,
  map_x             DECIMAL(8,2) NOT NULL DEFAULT 0,
  map_y             DECIMAL(8,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (bay_id),
  CONSTRAINT fk_bay_terminal FOREIGN KEY (terminal_id) REFERENCES Terminal (terminal_id)
) ENGINE=InnoDB;

-- 9. GroundEquipment
CREATE TABLE GroundEquipment (
  equipment_id    INT          NOT NULL AUTO_INCREMENT,
  equipment_type  VARCHAR(50)  NOT NULL,
  equipment_label VARCHAR(100) NOT NULL,
  status          VARCHAR(20)  NOT NULL DEFAULT 'Available',
  PRIMARY KEY (equipment_id)
) ENGINE=InnoDB;

-- 10. Flight (central entity)
CREATE TABLE Flight (
  flight_id         INT          NOT NULL AUTO_INCREMENT,
  flight_number     VARCHAR(20)  NOT NULL,
  airline_id        INT          NOT NULL,
  aircraft_id       INT          NOT NULL,
  flight_kind       VARCHAR(20)  NOT NULL,
  is_cargo          BOOLEAN      NOT NULL DEFAULT FALSE,
  origin_airport    VARCHAR(10)  NOT NULL,
  destination_airport VARCHAR(10) NOT NULL,
  sim_arrival_sec   INT          NOT NULL,
  sim_gate_in_sec   INT          NOT NULL,
  sim_gate_out_sec  INT          NOT NULL,
  sim_departure_sec INT          NOT NULL,
  gate_id           INT          NULL,
  bay_id            INT          NULL,
  runway_slot_id    INT          NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'Scheduled',
  delay_seconds     INT          NOT NULL DEFAULT 0,
  passenger_count   INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (flight_id),
  CONSTRAINT fk_flight_airline  FOREIGN KEY (airline_id)     REFERENCES Airline (airline_id),
  CONSTRAINT fk_flight_aircraft FOREIGN KEY (aircraft_id)    REFERENCES AircraftFleet (aircraft_id),
  CONSTRAINT fk_flight_gate     FOREIGN KEY (gate_id)        REFERENCES Gate (gate_id),
  CONSTRAINT fk_flight_bay      FOREIGN KEY (bay_id)         REFERENCES CargoBay (bay_id),
  CONSTRAINT fk_flight_slot     FOREIGN KEY (runway_slot_id) REFERENCES RunwaySlot (slot_id)
) ENGINE=InnoDB;

-- 11. GroundServiceAssignment
CREATE TABLE GroundServiceAssignment (
  assignment_id INT      NOT NULL AUTO_INCREMENT,
  flight_id     INT      NOT NULL,
  equipment_id  INT      NOT NULL,
  assigned_at   DATETIME NOT NULL,
  released_at   DATETIME NULL,
  PRIMARY KEY (assignment_id),
  CONSTRAINT fk_gsa_flight    FOREIGN KEY (flight_id)    REFERENCES Flight (flight_id),
  CONSTRAINT fk_gsa_equipment FOREIGN KEY (equipment_id) REFERENCES GroundEquipment (equipment_id)
) ENGINE=InnoDB;

-- 12. ServiceLog
CREATE TABLE ServiceLog (
  log_id        INT           NOT NULL AUTO_INCREMENT,
  flight_id     INT           NOT NULL,
  service_type  VARCHAR(50)   NOT NULL,
  quantity      DECIMAL(10,2) NOT NULL,
  charge_amount DECIMAL(10,2) NOT NULL,
  logged_at     DATETIME      NOT NULL,
  PRIMARY KEY (log_id),
  CONSTRAINT fk_svclog_flight FOREIGN KEY (flight_id) REFERENCES Flight (flight_id)
) ENGINE=InnoDB;

-- 13. PassengerFlowLog
CREATE TABLE PassengerFlowLog (
  flow_id          INT         NOT NULL AUTO_INCREMENT,
  terminal_id      INT         NOT NULL,
  zone_name        VARCHAR(50) NOT NULL,
  passenger_count  INT         NOT NULL,
  sim_recorded_sec INT         NOT NULL,
  PRIMARY KEY (flow_id),
  CONSTRAINT fk_flowlog_terminal FOREIGN KEY (terminal_id) REFERENCES Terminal (terminal_id)
) ENGINE=InnoDB;

-- 14. EventLog
CREATE TABLE EventLog (
  event_id       INT          NOT NULL AUTO_INCREMENT,
  flight_id      INT          NOT NULL,
  old_status     VARCHAR(20)  NULL,
  new_status     VARCHAR(20)  NOT NULL,
  sim_logged_sec INT          NOT NULL,
  note           VARCHAR(255) NULL,
  PRIMARY KEY (event_id),
  CONSTRAINT fk_eventlog_flight FOREIGN KEY (flight_id) REFERENCES Flight (flight_id)
) ENGINE=InnoDB;

-- 15. CargoShipment
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
) ENGINE=InnoDB;

-- 16. TurnaroundCharge
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
) ENGINE=InnoDB;

-- 17. live_map_cache (hand-rolled materialized view, no FKs)
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
) ENGINE=InnoDB;

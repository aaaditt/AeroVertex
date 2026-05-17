import { faker } from '@faker-js/faker';
import pool from './connection.js';

// ─── Constant pools ──────────────────────────────────────────────────────────

const AIRPORTS = [
  'JFK','LAX','ORD','DFW','ATL','DEN','SFO','SEA','LAS','MCO',
  'MIA','BOS','PHX','EWR','MSP','DTW','FLL','SLC','PDX','STL',
  'AUS','BNA','RDU','TPA','IAD','PHL','CLT','MDW','OAK','BWI',
];
const HUB = 'AXV';

const CARGO_TYPES = [
  'Electronics','Pharmaceuticals','Perishables','Machinery',
  'Textiles','Automotive Parts','Mail','Hazardous (Cat B)',
  'Livestock Feed','Chemicals',
];

const SERVICE_SPECS = [
  { type: 'Fueling',          rate: 0.85  },
  { type: 'Catering',         rate: 12.00 },
  { type: 'Cleaning',         rate: 45.00 },
  { type: 'Baggage Handling', rate: 2.50  },
  { type: 'Ground Power',     rate: 0.22  },
];

// ─── Static reference data ────────────────────────────────────────────────────

const TERMINALS = [
  { terminal_name: 'Passenger Terminal A', terminal_type: 'Passenger', map_x: 500, map_y: 200 },
  { terminal_name: 'Cargo Terminal B',     terminal_type: 'Cargo',     map_x: 500, map_y: 480 },
];

const AIRLINES = [
  { airline_name: 'American Airlines',  iata_code: 'AA', country: 'USA' },
  { airline_name: 'United Airlines',    iata_code: 'UA', country: 'USA' },
  { airline_name: 'Delta Air Lines',    iata_code: 'DL', country: 'USA' },
  { airline_name: 'Southwest Airlines', iata_code: 'WN', country: 'USA' },
  { airline_name: 'FedEx Express',      iata_code: 'FX', country: 'USA' },
  { airline_name: 'UPS Airlines',       iata_code: '5X', country: 'USA' },
];

// 10 aircraft types indexed 0-9 (size_category 1-5)
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
];

// Per-airline: 5 type indices (0-based) and a tail prefix
const AIRLINE_FLEET = [
  { types: [0, 1, 2, 3, 4], tailPfx: 'N1', tailSfx: 'AA', cargo: false }, // AA
  { types: [2, 3, 4, 5, 6], tailPfx: 'N2', tailSfx: 'UA', cargo: false }, // UA
  { types: [3, 4, 5, 6, 7], tailPfx: 'N3', tailSfx: 'DL', cargo: false }, // DL
  { types: [2, 2, 3, 3, 4], tailPfx: 'N4', tailSfx: 'WN', cargo: false }, // WN
  { types: [8, 8, 9, 9, 9], tailPfx: 'N5', tailSfx: 'FX', cargo: true  }, // FX
  { types: [8, 9, 9, 9, 9], tailPfx: 'N6', tailSfx: 'UP', cargo: true  }, // UPS
];

// Gate coordinates must match mapConfig.js exactly.
// A-gates: finger pier tips (y=305). B-gates: terminal north apron (y=162).
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
];

const BAY_DATA = [
  { bay_label: 'C1', max_size_category: 4, map_x: 285, map_y: 495 },
  { bay_label: 'C2', max_size_category: 4, map_x: 365, map_y: 495 },
  { bay_label: 'C3', max_size_category: 4, map_x: 445, map_y: 495 },
  { bay_label: 'C4', max_size_category: 4, map_x: 525, map_y: 495 },
  { bay_label: 'C5', max_size_category: 5, map_x: 605, map_y: 495 },
  { bay_label: 'C6', max_size_category: 5, map_x: 685, map_y: 495 },
];

const EQUIPMENT_DATA = [
  { equipment_type: 'Fuel Truck',        equipment_label: 'FT-01' },
  { equipment_type: 'Fuel Truck',        equipment_label: 'FT-02' },
  { equipment_type: 'Baggage Cart',      equipment_label: 'BC-01' },
  { equipment_type: 'Baggage Cart',      equipment_label: 'BC-02' },
  { equipment_type: 'Push-back Tug',     equipment_label: 'PT-01' },
  { equipment_type: 'Push-back Tug',     equipment_label: 'PT-02' },
  { equipment_type: 'Air Stairs',        equipment_label: 'AS-01' },
  { equipment_type: 'Ground Power Unit', equipment_label: 'GPU-01' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rndAirport() {
  return faker.helpers.arrayElement(AIRPORTS);
}

// Find first aircraft with size <= maxSize whose last departure < arrivalSec
function claimAircraft(pool, maxSize, arrivalSec) {
  return pool.find(ac => ac.size <= maxSize && ac.lastDep < arrivalSec) ?? null;
}

// Mark the next open slot near simSec on runway rwIdx as Booked
function claimSlot(slotsByRw, rwIds, rwIdx, simSec) {
  const slots = slotsByRw[rwIds[rwIdx]];
  const near = slots.find(s => s.start <= simSec && s.start >= simSec - 60 && s.status === 'Open')
            ?? slots.find(s => s.status === 'Open');
  if (near) { near.status = 'Booked'; return near.id; }
  return null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let conn;
try {
  conn = await pool.getConnection();
  console.log('Seeding AeroVertex database…\n');

  // ── Terminals ────────────────────────────────────────────────────────────
  const termIds = [];
  for (const t of TERMINALS) {
    const [r] = await conn.query(
      'INSERT INTO Terminal (terminal_name, terminal_type, map_x, map_y) VALUES (?,?,?,?)',
      [t.terminal_name, t.terminal_type, t.map_x, t.map_y]
    );
    termIds.push(r.insertId);
  }
  const [paxTermId, cargoTermId] = termIds;
  console.log(`✓ ${termIds.length} terminals`);

  // ── Airlines ─────────────────────────────────────────────────────────────
  const airlineIds = [];
  for (const a of AIRLINES) {
    const [r] = await conn.query(
      'INSERT INTO Airline (airline_name, iata_code, country) VALUES (?,?,?)',
      [a.airline_name, a.iata_code, a.country]
    );
    airlineIds.push(r.insertId);
  }
  const airlineCode = {}; // airlineId -> iata_code
  AIRLINES.forEach((a, i) => { airlineCode[airlineIds[i]] = a.iata_code; });
  console.log(`✓ ${airlineIds.length} airlines`);

  // ── Aircraft Types ────────────────────────────────────────────────────────
  const typeIds = [];
  for (const t of AIRCRAFT_TYPES) {
    const [r] = await conn.query(
      `INSERT INTO AircraftType
         (manufacturer, model_name, mtow_tonnes, wingspan_m, size_category, passenger_capacity)
       VALUES (?,?,?,?,?,?)`,
      [t.manufacturer, t.model_name, t.mtow_tonnes, t.wingspan_m, t.size_category, t.passenger_capacity]
    );
    typeIds.push(r.insertId);
  }
  const typeCapacity = {}; // typeId -> passenger_capacity
  AIRCRAFT_TYPES.forEach((t, i) => { typeCapacity[typeIds[i]] = t.passenger_capacity; });
  console.log(`✓ ${typeIds.length} aircraft types`);

  // ── Aircraft Fleet (30 aircraft, 5 per airline) ───────────────────────────
  // Each entry: { id, airlineId, typeId, size, lastDep, isCargo }
  const allAircraft = [];
  for (let ai = 0; ai < AIRLINES.length; ai++) {
    const fleet = AIRLINE_FLEET[ai];
    for (let j = 0; j < 5; j++) {
      const typeIdx = fleet.types[j];
      const typeId  = typeIds[typeIdx];
      const tail    = `${fleet.tailPfx}${j}${fleet.tailSfx}`;
      const [r] = await conn.query(
        'INSERT INTO AircraftFleet (tail_number, airline_id, type_id, year_built) VALUES (?,?,?,?)',
        [tail, airlineIds[ai], typeId, faker.number.int({ min: 2010, max: 2023 })]
      );
      allAircraft.push({
        id: r.insertId,
        airlineId: airlineIds[ai],
        typeId,
        size: AIRCRAFT_TYPES[typeIdx].size_category,
        lastDep: -1,
        isCargo: fleet.cargo,
      });
    }
  }
  const paxAircraft   = allAircraft.filter(a => !a.isCargo);
  const cargoAircraft = allAircraft.filter(a =>  a.isCargo);
  console.log(`✓ ${allAircraft.length} aircraft (${paxAircraft.length} pax, ${cargoAircraft.length} cargo)`);

  // ── Runways + slots ───────────────────────────────────────────────────────
  const rwIds     = [];
  const slotsByRw = {}; // rwId -> [{id, start, end, status}]
  for (const rw of [
    { runway_name: '09L/27R', length_m: 3500, map_x1: 50, map_y1: 140, map_x2: 950, map_y2: 140 },
    { runway_name: '09R/27L', length_m: 3200, map_x1: 50, map_y1: 560, map_x2: 950, map_y2: 560 },
  ]) {
    const [r] = await conn.query(
      'INSERT INTO Runway (runway_name, length_m, map_x1, map_y1, map_x2, map_y2) VALUES (?,?,?,?,?,?)',
      [rw.runway_name, rw.length_m, rw.map_x1, rw.map_y1, rw.map_x2, rw.map_y2]
    );
    const rwId = r.insertId;
    rwIds.push(rwId);
    slotsByRw[rwId] = [];
    for (let t = 0; t < 1800; t += 60) {
      const [sr] = await conn.query(
        'INSERT INTO RunwaySlot (runway_id, sim_slot_start_sec, sim_slot_end_sec, slot_status) VALUES (?,?,?,?)',
        [rwId, t, t + 60, 'Open']
      );
      slotsByRw[rwId].push({ id: sr.insertId, start: t, end: t + 60, status: 'Open' });
    }
  }
  console.log(`✓ ${rwIds.length} runways, ${rwIds.length * 30} runway slots`);

  // ── Gates ─────────────────────────────────────────────────────────────────
  const gates = [];
  for (const g of GATE_DATA) {
    const [r] = await conn.query(
      'INSERT INTO Gate (gate_label, terminal_id, max_size_category, map_x, map_y) VALUES (?,?,?,?,?)',
      [g.gate_label, paxTermId, g.max_size_category, g.map_x, g.map_y]
    );
    gates.push({ id: r.insertId, ...g });
  }
  console.log(`✓ ${gates.length} gates`);

  // ── Cargo Bays ────────────────────────────────────────────────────────────
  const bays = [];
  for (const b of BAY_DATA) {
    const [r] = await conn.query(
      'INSERT INTO CargoBay (bay_label, terminal_id, max_size_category, map_x, map_y) VALUES (?,?,?,?,?)',
      [b.bay_label, cargoTermId, b.max_size_category, b.map_x, b.map_y]
    );
    bays.push({ id: r.insertId, ...b });
  }
  console.log(`✓ ${bays.length} cargo bays`);

  // ── Ground Equipment ──────────────────────────────────────────────────────
  const equipIds = [];
  for (const e of EQUIPMENT_DATA) {
    const [r] = await conn.query(
      'INSERT INTO GroundEquipment (equipment_type, equipment_label, status) VALUES (?,?,?)',
      [e.equipment_type, e.equipment_label, 'Available']
    );
    equipIds.push(r.insertId);
  }
  console.log(`✓ ${equipIds.length} equipment pieces`);

  // ─────────────────────────────────────────────────────────────────────────
  // DELIBERATE CONFLICT TEST 1 (size violation) — must run BEFORE any flights
  // are inserted on gate A1, so gate_buffer_check doesn't fire first.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nTesting trigger violations (all should be rejected):\n');

  // Gate A1 has max_size=1; pick a size-3 aircraft from paxAircraft
  const gA1      = gates[0];                              // gate A1, max_size=1
  const largeAc  = paxAircraft.find(ac => ac.size >= 3);  // e.g. a 737-800
  if (largeAc) {
    try {
      await conn.query(
        `INSERT INTO Flight (flight_number, airline_id, aircraft_id, flight_kind, is_cargo,
           origin_airport, destination_airport, sim_arrival_sec, sim_gate_in_sec,
           sim_gate_out_sec, sim_departure_sec, gate_id, status, passenger_count)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [`SIZETEST1`, largeAc.airlineId, largeAc.id, 'Arrival', false,
          rndAirport(), HUB, 100, 160, 360, 420, gA1.id, 'Scheduled', 0]
      );
      console.log('  ✗  Size test unexpectedly succeeded');
    } catch (e) {
      console.log(`  ✓  gate_size_check fired: "${e.message}"`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASSENGER FLIGHTS (2 per gate × 14 gates = 28 flights)
  // Batch A: early arrivals;  Batch B: late arrivals (gap > 900 s after Batch A dep)
  // ─────────────────────────────────────────────────────────────────────────
  const TAXI   = 60;   // arrival  → gate_in  (taxiing)
  const PUSHBK = 60;   // gate_out → departure (pushback + taxi to runway)
  const BUFFER = 920;  // deliberate gap > 900 s required by trigger

  const paxFlightIds = [];
  let fnCounter = 1000;

  for (let gi = 0; gi < gates.length; gi++) {
    const gate  = gates[gi];
    const rwIdx = gi % 2; // alternate runways

    // ── Batch A (early) ───────────────────────────────────────────────────
    // Start at 220 s (just outside LOOKAHEAD=200) so planes are never
    // pre-fetched already-parked at sim second 0. Space 40 s apart so the
    // runway isn't overwhelmed and queue separation stays clean.
    const arrA  = 220 + gi * 40;           // 220, 260, 300 … 620 s
    const ginA  = arrA + TAXI;
    const goutA = ginA + 200 + (gi % 3) * 20;   // 200 – 240 s gate time
    const depA  = goutA + PUSHBK;

    const acA = claimAircraft(paxAircraft, gate.max_size_category, arrA);
    if (acA) {
      acA.lastDep = depA;
      const slotId = claimSlot(slotsByRw, rwIds, rwIdx, arrA);
      const cap    = typeCapacity[acA.typeId] || 150;
      const code   = airlineCode[acA.airlineId];
      const [r] = await conn.query(
        `INSERT INTO Flight
           (flight_number, airline_id, aircraft_id, flight_kind, is_cargo,
            origin_airport, destination_airport, sim_arrival_sec, sim_gate_in_sec,
            sim_gate_out_sec, sim_departure_sec, gate_id, runway_slot_id,
            status, passenger_count)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [`${code}${fnCounter++}`, acA.airlineId, acA.id, 'Arrival', false,
          rndAirport(), HUB, arrA, ginA, goutA, depA,
          gate.id, slotId, 'At_Gate',
          faker.number.int({ min: 40, max: cap })]
      );
      paxFlightIds.push(r.insertId);
    } else {
      console.warn(`  ⚠ No aircraft for gate ${gate.gate_label} batch A`);
    }

    // ── Batch B (late) — safe after trigger buffer ─────────────────────────
    const arrB  = depA + BUFFER;           // guaranteed > depA + 900 s
    const ginB  = arrB + TAXI;
    const goutB = ginB + 180;
    const depB  = goutB + PUSHBK;

    const acB = claimAircraft(paxAircraft, gate.max_size_category, arrB);
    if (acB) {
      acB.lastDep = depB;
      const slotId2 = claimSlot(slotsByRw, rwIds, rwIdx, depB);
      const cap2    = typeCapacity[acB.typeId] || 150;
      const code2   = airlineCode[acB.airlineId];
      const [r] = await conn.query(
        `INSERT INTO Flight
           (flight_number, airline_id, aircraft_id, flight_kind, is_cargo,
            origin_airport, destination_airport, sim_arrival_sec, sim_gate_in_sec,
            sim_gate_out_sec, sim_departure_sec, gate_id, runway_slot_id,
            status, passenger_count)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [`${code2}${fnCounter++}`, acB.airlineId, acB.id, 'Departure', false,
          HUB, rndAirport(), arrB, ginB, goutB, depB,
          gate.id, slotId2, 'Boarding',
          faker.number.int({ min: 30, max: cap2 })]
      );
      paxFlightIds.push(r.insertId);
    } else {
      console.warn(`  ⚠ No aircraft for gate ${gate.gate_label} batch B`);
    }
  }
  console.log(`\n✓ ${paxFlightIds.length} passenger flights`);

  // ─────────────────────────────────────────────────────────────────────────
  // DELIBERATE CONFLICT TESTS 2 & 3 (gate buffer violations)
  // Now that gate A1 and gate A2 have Batch-A flights, inserting in their
  // buffer window must be rejected.
  // ─────────────────────────────────────────────────────────────────────────

  // Gate A1 batch A: arrA=30, depA=350  →  buffer window: arr < 350+900=1250
  const conflictAc = paxAircraft.find(ac => ac.size <= gates[0].max_size_category);
  if (conflictAc) {
    try {
      await conn.query(
        `INSERT INTO Flight
           (flight_number, airline_id, aircraft_id, flight_kind, is_cargo,
            origin_airport, destination_airport, sim_arrival_sec, sim_gate_in_sec,
            sim_gate_out_sec, sim_departure_sec, gate_id, status, passenger_count)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [`BUFTEST1`, conflictAc.airlineId, conflictAc.id, 'Arrival', false,
          rndAirport(), HUB, 500, 560, 720, 780, gates[0].id, 'Scheduled', 50]
      );
      console.log('  ✗  Buffer test 1 unexpectedly succeeded');
    } catch (e) {
      console.log(`  ✓  gate_buffer_check fired (gate A1): "${e.message}"`);
    }
  }

  // Gate A2 batch A: arrA=55, depA=375  →  buffer window: arr < 375+900=1275
  const conflictAc2 = paxAircraft.find(ac => ac.size <= gates[1].max_size_category);
  if (conflictAc2) {
    try {
      await conn.query(
        `INSERT INTO Flight
           (flight_number, airline_id, aircraft_id, flight_kind, is_cargo,
            origin_airport, destination_airport, sim_arrival_sec, sim_gate_in_sec,
            sim_gate_out_sec, sim_departure_sec, gate_id, status, passenger_count)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [`BUFTEST2`, conflictAc2.airlineId, conflictAc2.id, 'Departure', false,
          HUB, rndAirport(), 700, 760, 920, 980, gates[1].id, 'Scheduled', 60]
      );
      console.log('  ✗  Buffer test 2 unexpectedly succeeded');
    } catch (e) {
      console.log(`  ✓  gate_buffer_check fired (gate A2): "${e.message}"`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CARGO FLIGHTS (3 batches × 6 bays = 18 flights)
  // Cargo bays have no buffer trigger — free scheduling.
  // ─────────────────────────────────────────────────────────────────────────
  const CARGO_BATCHES = [
    { base: 250,  gateTime: 300 },   // start outside LOOKAHEAD=200 window
    { base: 800,  gateTime: 250 },
    { base: 1380, gateTime: 200 },
  ];

  const cargoFlightIds = [];
  for (let bi = 0; bi < bays.length; bi++) {
    const bay = bays[bi];
    for (let batch = 0; batch < 3; batch++) {
      const arr  = CARGO_BATCHES[batch].base + bi * 50;
      const gIn  = arr + 90;
      const gOut = gIn + CARGO_BATCHES[batch].gateTime;
      const dep  = gOut + 90;
      const rw   = (bi + batch) % 2;

      const ac = claimAircraft(cargoAircraft, bay.max_size_category, arr);
      if (!ac) { console.warn(`  ⚠ No cargo aircraft for bay ${bay.bay_label} batch ${batch}`); continue; }
      ac.lastDep = dep;

      const slotId = claimSlot(slotsByRw, rwIds, rw, arr);
      const code   = airlineCode[ac.airlineId];
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
          bay.id, slotId, 'At_Gate', 0]
      );
      cargoFlightIds.push(r.insertId);
    }
  }
  console.log(`✓ ${cargoFlightIds.length} cargo flights`);

  // ─────────────────────────────────────────────────────────────────────────
  // EXTRA IN-TRANSIT FLIGHTS (gate_id = NULL, status = Inbound)
  // ─────────────────────────────────────────────────────────────────────────
  const extraFlightIds = [];
  for (let ex = 0; ex < 8; ex++) {
    const arr = 850 + ex * 70;
    const gIn = arr + 60;
    const gOut = gIn + 160;
    const dep  = gOut + 60;
    const ac = claimAircraft(paxAircraft, 5, arr);
    if (!ac) continue;
    ac.lastDep = dep;
    const code = airlineCode[ac.airlineId];
    const [r] = await conn.query(
      `INSERT INTO Flight
         (flight_number, airline_id, aircraft_id, flight_kind, is_cargo,
          origin_airport, destination_airport, sim_arrival_sec, sim_gate_in_sec,
          sim_gate_out_sec, sim_departure_sec, status, passenger_count)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [`${code}${fnCounter++}`, ac.airlineId, ac.id, 'Arrival', false,
        rndAirport(), HUB, arr, gIn, gOut, dep,
        'Inbound', faker.number.int({ min: 60, max: 220 })]
    );
    extraFlightIds.push(r.insertId);
  }
  console.log(`✓ ${extraFlightIds.length} in-transit flights`);

  const totalFlights = paxFlightIds.length + cargoFlightIds.length + extraFlightIds.length;
  console.log(`✓ Total flights: ${totalFlights}`);

  // ─────────────────────────────────────────────────────────────────────────
  // SERVICE LOGS (for first 20 passenger flights)
  // ─────────────────────────────────────────────────────────────────────────
  let svcCount = 0;
  for (const fid of paxFlightIds.slice(0, 20)) {
    const n = faker.number.int({ min: 1, max: 3 });
    for (let s = 0; s < n; s++) {
      const svc = faker.helpers.arrayElement(SERVICE_SPECS);
      const qty = parseFloat(faker.number.float({ min: 1, max: 200, fractionDigits: 1 }).toFixed(1));
      await conn.query(
        'INSERT INTO ServiceLog (flight_id, service_type, quantity, charge_amount, logged_at) VALUES (?,?,?,?,NOW())',
        [fid, svc.type, qty, parseFloat((qty * svc.rate).toFixed(2))]
      );
      svcCount++;
    }
  }
  console.log(`✓ ${svcCount} service log entries`);

  // ─────────────────────────────────────────────────────────────────────────
  // PASSENGER FLOW LOGS (every 2 minutes across the sim, 5 zones)
  // ─────────────────────────────────────────────────────────────────────────
  const ZONES = ['Check-in', 'Security', 'Departures', 'Arrivals', 'Baggage Claim'];
  let flowCount = 0;
  for (let t = 0; t <= 1800; t += 120) {
    for (const zone of ZONES) {
      await conn.query(
        'INSERT INTO PassengerFlowLog (terminal_id, zone_name, passenger_count, sim_recorded_sec) VALUES (?,?,?,?)',
        [paxTermId, zone, faker.number.int({ min: 15, max: 650 }), t]
      );
      flowCount++;
    }
  }
  console.log(`✓ ${flowCount} passenger flow log entries`);

  // ─────────────────────────────────────────────────────────────────────────
  // CARGO SHIPMENTS (1-4 per cargo flight)
  // ─────────────────────────────────────────────────────────────────────────
  let shipCount = 0;
  for (const fid of cargoFlightIds) {
    const [[fl]] = await conn.query('SELECT bay_id FROM Flight WHERE flight_id = ?', [fid]);
    if (!fl?.bay_id) continue;
    const n = faker.number.int({ min: 1, max: 4 });
    for (let s = 0; s < n; s++) {
      await conn.query(
        `INSERT INTO CargoShipment (flight_id, bay_id, weight_kg, cargo_type, handling_status)
         VALUES (?,?,?,?,?)`,
        [fid, fl.bay_id,
          parseFloat(faker.number.float({ min: 50, max: 8000, fractionDigits: 1 }).toFixed(1)),
          faker.helpers.arrayElement(CARGO_TYPES),
          faker.helpers.arrayElement(['Received', 'Loaded', 'Delivered'])]
      );
      shipCount++;
    }
  }
  console.log(`✓ ${shipCount} cargo shipments`);

  // ─────────────────────────────────────────────────────────────────────────
  // INITIAL EVENT LOGS (manual seed — trigger fires on UPDATE, not INSERT)
  // ─────────────────────────────────────────────────────────────────────────
  let evtCount = 0;
  const seedEvents = [
    { old_status: 'Scheduled', new_status: 'Inbound',  note: 'Flight entered approach corridor' },
    { old_status: 'Inbound',   new_status: 'Landing',  note: 'Cleared to land runway 09L' },
    { old_status: 'Landing',   new_status: 'Taxiing',  note: 'Vacated runway, taxiing to gate' },
    { old_status: 'Taxiing',   new_status: 'At_Gate',  note: 'Jetway connected' },
  ];
  for (const fid of paxFlightIds.slice(0, 12)) {
    const evt = faker.helpers.arrayElement(seedEvents);
    await conn.query(
      'INSERT INTO EventLog (flight_id, old_status, new_status, sim_logged_sec, note) VALUES (?,?,?,?,?)',
      [fid, evt.old_status, evt.new_status,
        faker.number.int({ min: 0, max: 200 }), evt.note]
    );
    evtCount++;
  }
  console.log(`✓ ${evtCount} initial event log entries`);

  // ─────────────────────────────────────────────────────────────────────────
  // REFRESH LIVE MAP CACHE
  // ─────────────────────────────────────────────────────────────────────────
  await conn.query('CALL sp_refresh_live_map()');
  const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM live_map_cache');
  console.log(`\n✅  Seed complete — ${totalFlights} flights, ${cnt} rows in live_map_cache.`);

} catch (err) {
  console.error('\n✗ Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
} finally {
  if (conn) conn.release();
  await pool.end();
}

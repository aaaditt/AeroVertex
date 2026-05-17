// All coordinates use viewBox "0 0 1000 700"
//
// Spatial layout (top → bottom):
//   y=82  ── Runway 1   09L/27R  (arrivals)
//   y=130 ── Arrival taxiway  (MVA strip, parallel south of rwy 1)
//   y=162 ── Terminal Concourse A  north wall
//   y=238 ── Terminal south wall  / top of finger piers
//   y=305 ── Finger pier tips  (A-gate aircraft stands)
//   y=318 ── Apron perimeter road
//   y=358 ── Mid-taxiway  (passenger routing, east↔west)
//   y=430 ── Cargo taxiway
//   y=495 ── Cargo bay row
//   y=572 ── Runway 2   09R/27L  (departures)
//
// Arrival flow:
//   Land rwy1 → traverse full runway east→west → exit south onto arrival twy →
//   east along arrival twy to east spine (x=800) → south to mid-pax twy (y=358) →
//   west to gate pier x → north into stand (y=305)
//
// Departure flow:
//   Pushback south to mid-pax twy → west to west spine (x=200) →
//   south to rwy2 → line up east → take-off roll → off-screen right

export const MAP_CONFIG = {
  viewBox: '0 0 1000 700',

  runways: [
    { id: 1, name: '09L/27R', x1: 50, y1: 82,  x2: 950, y2: 82  }, // arrivals
    { id: 2, name: '09R/27L', x1: 50, y1: 572, x2: 950, y2: 572 }, // departures
  ],

  arrivalTaxiway: { x1: 50, y1: 130, x2: 950, y2: 130 },

  passengerTerminal: { x: 60,  y: 162, w: 600, h: 76,  label: 'Terminal Concourse A' },
  cargoTerminal:     { x: 705, y: 378, w: 200, h: 120, label: 'Cargo Terminal' },
  controlTower:      { x: 92, y: 330 },

  // A-gates: finger pier nose positions (gx = pier x, gy = tip y=305)
  // B-gates: north apron of terminal (gy = terminal TY = 162)
  gates: [
    { id: 1,  label: 'A1', x: 155, y: 305 },
    { id: 2,  label: 'A2', x: 255, y: 305 },
    { id: 3,  label: 'A3', x: 360, y: 305 },
    { id: 4,  label: 'A4', x: 465, y: 305 },
    { id: 5,  label: 'A5', x: 565, y: 305 },
    { id: 6,  label: 'B1', x: 175, y: 162 },
    { id: 7,  label: 'B2', x: 265, y: 162 },
    { id: 8,  label: 'B3', x: 355, y: 162 },
    { id: 9,  label: 'B4', x: 445, y: 162 },
    { id: 10, label: 'B5', x: 535, y: 162 },
    { id: 11, label: 'B6', x: 615, y: 162 },
  ],

  cargoBays: [
    { id: 1, label: 'C1', x: 285, y: 495 },
    { id: 2, label: 'C2', x: 365, y: 495 },
    { id: 3, label: 'C3', x: 445, y: 495 },
    { id: 4, label: 'C4', x: 525, y: 495 },
    { id: 5, label: 'C5', x: 605, y: 495 },
    { id: 6, label: 'C6', x: 685, y: 495 },
  ],

  taxiways: [
    { x1: 800, y1: 130, x2: 800, y2: 572 }, // east spine
    { x1: 200, y1: 130, x2: 200, y2: 572 }, // west spine
    { x1: 200, y1: 358, x2: 800, y2: 358 }, // mid-pax horizontal
    { x1: 200, y1: 430, x2: 800, y2: 430 }, // cargo horizontal
    { x1: 500, y1: 130, x2: 500, y2: 358 }, // centre connector
  ],
}

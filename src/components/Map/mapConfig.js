export const MAP_CONFIG = {
  viewBox: '0 0 1000 700',
  runways: [
    { id: 1, name: '09L/27R', x1: 50, y1: 140, x2: 950, y2: 140 },
    { id: 2, name: '09R/27L', x1: 50, y1: 560, x2: 950, y2: 560 },
  ],
  passengerTerminal: { x: 150, y: 175, w: 600, h: 80, label: 'Passenger Terminal A' },
  cargoTerminal:     { x: 280, y: 460, w: 460, h: 60, label: 'Cargo Terminal B' },
  controlTower:      { x: 90,  y: 320 },
  gates: [
    { id: 1,  label: 'A1', x: 185, y: 235 },
    { id: 2,  label: 'A2', x: 255, y: 235 },
    { id: 3,  label: 'A3', x: 325, y: 235 },
    { id: 4,  label: 'A4', x: 395, y: 235 },
    { id: 5,  label: 'A5', x: 465, y: 235 },
    { id: 6,  label: 'A6', x: 535, y: 235 },
    { id: 7,  label: 'A7', x: 605, y: 235 },
    { id: 8,  label: 'B1', x: 205, y: 170 },
    { id: 9,  label: 'B2', x: 295, y: 170 },
    { id: 10, label: 'B3', x: 385, y: 170 },
    { id: 11, label: 'B4', x: 475, y: 170 },
    { id: 12, label: 'B5', x: 565, y: 170 },
    { id: 13, label: 'B6', x: 655, y: 170 },
    { id: 14, label: 'B7', x: 745, y: 170 },
  ],
  cargoBays: [
    { id: 1, label: 'C1', x: 310, y: 495 },
    { id: 2, label: 'C2', x: 390, y: 495 },
    { id: 3, label: 'C3', x: 470, y: 495 },
    { id: 4, label: 'C4', x: 550, y: 495 },
    { id: 5, label: 'C5', x: 630, y: 495 },
    { id: 6, label: 'C6', x: 710, y: 495 },
  ],
  taxiways: [
    { x1: 800, y1: 140, x2: 800, y2: 560 }, // east spine
    { x1: 200, y1: 140, x2: 200, y2: 560 }, // west spine
    { x1: 200, y1: 350, x2: 800, y2: 350 }, // mid horizontal (pax routing)
    { x1: 200, y1: 420, x2: 800, y2: 420 }, // cargo horizontal
    { x1: 500, y1: 140, x2: 500, y2: 350 }, // centre mid-connector
  ],
}

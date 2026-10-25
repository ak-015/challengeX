/**
 * Positions of the red ruby "stones" set into stone-card-frame.webp, as percentages of a
 * card showing that frame (x/y = centre, r = glow radius, all relative to card width/height
 * as noted). Measured from the artwork's bright gem cores.
 */
export interface Gem {
  /** % of card width */
  x: number;
  /** % of card height */
  y: number;
  /** glow radius, % of card width */
  r: number;
}

export const STONE_GEMS: Gem[] = [
  { x: 50.2, y: 9.6, r: 5.2 }, // top centre — the big gem
  { x: 36.35, y: 7.4, r: 1.9 },
  { x: 62.1, y: 8.5, r: 2.6 },
  { x: 23.8, y: 8.0, r: 2.1 },
  { x: 77.7, y: 8.9, r: 1.8 },
  { x: 8.6, y: 10.0, r: 2.7 }, // top-left corner
  { x: 91.4, y: 10.6, r: 2.7 }, // top-right corner
  { x: 15.1, y: 19.3, r: 2.4 }, // inner X marks
  { x: 84.4, y: 19.2, r: 2.8 },
  { x: 2.96, y: 31.5, r: 1.8 },
  { x: 96.95, y: 31.1, r: 1.8 },
  { x: 7.1, y: 40.5, r: 1.9 },
  { x: 93.3, y: 41.5, r: 1.8 },
  { x: 2.1, y: 60.7, r: 1.9 },
  { x: 97.9, y: 61.0, r: 2.2 },
  { x: 2.2, y: 79.4, r: 2.2 },
  { x: 97.8, y: 79.3, r: 2.1 },
  { x: 6.4, y: 88.0, r: 2.5 }, // bottom-left corner
  { x: 94.3, y: 88.7, r: 2.9 }, // bottom-right corner
  { x: 50, y: 90.6, r: 5.2 }, // bottom centre — where the beam enters
];

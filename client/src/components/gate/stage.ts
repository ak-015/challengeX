/**
 * Gate stage geometry. Every coordinate is in the 1600×900 space of the two
 * gate illustrations (gate-closed.webp / gate-open.webp), so overlays stay
 * pixel-aligned with the artwork at any viewport size.
 */
export const STAGE_W = 1600;
export const STAGE_H = 900;

export type Pt = [number, number];

/** Seam between the two closed door leaves. */
export const SEAM_X = 845;
/** Outer hinge edges of the door leaves. */
export const HINGE_L = 655;
export const HINGE_R = 1035;

export const DOOR_LEFT: Pt[] = [[655, 765], [655, 470], [668, 400], [700, 350], [760, 310], [845, 285], [845, 765]];
export const DOOR_RIGHT: Pt[] = [[845, 285], [930, 310], [990, 350], [1022, 400], [1035, 470], [1035, 765], [845, 765]];
export const DOOR_FULL: Pt[] = [
  [655, 765], [655, 470], [668, 400], [700, 350], [760, 310], [845, 285],
  [930, 310], [990, 350], [1022, 400], [1035, 470], [1035, 765],
];

/** Glowing swords held by the two guards — closed artwork and open artwork differ slightly. */
export interface SwordSpec { x: number; y0: number; y1: number; seed: number }
export const SWORDS_CLOSED: SwordSpec[] = [
  { x: 486, y0: 505, y1: 702, seed: 0 },
  { x: 1200, y0: 500, y1: 702, seed: 1 },
];
export const SWORDS_OPEN: SwordSpec[] = [
  { x: 443, y0: 495, y1: 692, seed: 0 },
  { x: 1196, y0: 492, y1: 696, seed: 1 },
];

/** Braziers: x/y is the base of the flame, w its width, s an intensity scale. */
export interface FlameSpec { x: number; y: number; w: number; s: number }
export const FLAMES: FlameSpec[] = [
  { x: 66, y: 662, w: 74, s: 1.15 },
  { x: 264, y: 708, w: 58, s: 0.9 },
  { x: 1422, y: 710, w: 64, s: 0.9 },
  { x: 1581, y: 668, w: 50, s: 1.15 },
];

export const pctX = (x: number) => `${(x / STAGE_W) * 100}%`;
export const pctY = (y: number) => `${(y / STAGE_H) * 100}%`;

/** Enlarge a polygon about its centroid (hides hairline gaps between layered cut-outs). */
export function grow(points: Pt[], factor: number): Pt[] {
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  return points.map(([x, y]) => [cx + (x - cx) * factor, cy + (y - cy) * factor]);
}

/** Polygon → objectBoundingBox fractions for an SVG clipPath. */
export const toUnit = (points: Pt[]): Pt[] => points.map(([x, y]) => [x / STAGE_W, y / STAGE_H]);
export const toPoints = (points: Pt[]) => toUnit(points).map(([x, y]) => `${x.toFixed(5)},${y.toFixed(5)}`).join(' ');
export const toPath = (points: Pt[]) =>
  toUnit(points).map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(5)} ${y.toFixed(5)}`).join(' ') + ' Z';

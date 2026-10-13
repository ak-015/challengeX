import { CATEGORIES, type Category } from './constants';

export const GAUGE_R = 88;
export const GAUGE_C = 2 * Math.PI * GAUGE_R;

export const clampScore = (s: number): number => Math.max(0, Math.min(100, Number.isFinite(s) ? s : 0));

/** stroke-dashoffset for a score 0..100 on the gauge circle. */
export function gaugeOffset(score: number, circumference: number = GAUGE_C): number {
  return circumference * (1 - clampScore(score) / 100);
}

/** Angle (deg) of radar axis i out of 7, starting at the top and going clockwise. */
export const axisAngle = (i: number): number => -90 + (i * 360) / CATEGORIES.length;

export function polar(angleDeg: number, r: number): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180;
  return { x: +(Math.cos(a) * r).toFixed(2), y: +(Math.sin(a) * r).toFixed(2) };
}

/** Polygon points for category scores (0..10) on a radar of radius R. */
export function radarPoints(scores: Record<Category, number>, R: number): string {
  return CATEGORIES.map((c, i) => {
    const p = polar(axisAngle(i), (Math.max(0, Math.min(10, scores[c] ?? 0)) / 10) * R);
    return `${p.x},${p.y}`;
  }).join(' ');
}

import { BUILD_AT_LEAST, CATEGORIES, KILL_BELOW, LOW_CONFIDENCE_SKIPS, SKIP_PENALTY, type Category } from './constants';

export type ScoreMap = Record<Category, number>;

export const snapHalf = (n: number): number => Math.min(10, Math.max(0, Math.round(n * 2) / 2));

/** Each skipped question lowers its category by 0.5 (floor 0). */
export function applySkipPenalty(scores: ScoreMap, skippedByCategory: Record<Category, number>): ScoreMap {
  const out = {} as ScoreMap;
  for (const c of CATEGORIES) out[c] = Math.max(0, snapHalf(scores[c]) - SKIP_PENALTY * (skippedByCategory[c] ?? 0));
  return out;
}

/** total = round(avg of 7 categories x 10). The server decides this, never the AI. */
export function computeTotal(scores: ScoreMap): number {
  const sum = CATEGORIES.reduce((acc, c) => acc + scores[c], 0);
  return Math.round((sum * 10) / CATEGORIES.length);
}

export type Verdict = 'KILL' | 'PIVOT' | 'BUILD';

export function verdictFor(total: number): Verdict {
  if (total < KILL_BELOW) return 'KILL';
  if (total >= BUILD_AT_LEAST) return 'BUILD';
  return 'PIVOT';
}

export const isLowConfidence = (skippedCount: number, extensionDeclined = false): boolean => extensionDeclined || skippedCount > LOW_CONFIDENCE_SKIPS;

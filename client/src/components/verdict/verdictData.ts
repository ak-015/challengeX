import type { Alternative, Competitor, CategoryScore, Fix, Struggle, Understanding, ValidationExperiment, VerdictResponse, VerdictSnapshot } from '@/lib/apiTypes';
import { CATEGORIES, type Category, type ModeKey, type Verdict } from '@/lib/constants';

/** Everything the verdict screen needs, whether it came from the owner's session or from a public share snapshot. */
export interface VerdictData {
  title: string;
  mode: ModeKey | null;
  totalScore: number;
  verdict: Verdict;
  summary: string;
  lowConfidence: boolean;
  skippedCount?: number;
  categoryScores: Record<Category, CategoryScore>;
  struggles: Struggle[];
  fixes: Fix[];
  alternatives: Alternative[];
  validationExperiment: ValidationExperiment | null;
  competitors: Competitor[];
  understanding?: Understanding;
}

export function fromVerdictResponse(v: VerdictResponse, competitors: Competitor[], understanding?: Understanding): VerdictData {
  return {
    title: v.title,
    mode: v.mode,
    totalScore: v.totalScore,
    verdict: v.verdict,
    summary: v.summary,
    lowConfidence: v.lowConfidence,
    skippedCount: v.skippedCount,
    categoryScores: v.categoryScores,
    struggles: v.struggles,
    fixes: v.fixes,
    alternatives: v.alternatives,
    validationExperiment: v.validationExperiment,
    competitors,
    understanding,
  };
}

export function fromSnapshot(s: VerdictSnapshot): VerdictData {
  return {
    title: s.title,
    mode: s.mode,
    totalScore: s.totalScore ?? 0,
    verdict: (s.verdict ?? 'PIVOT') as Verdict,
    summary: s.summary,
    lowConfidence: s.lowConfidence,
    categoryScores: s.categoryScores,
    struggles: s.struggles,
    fixes: s.fixes,
    alternatives: s.alternatives,
    validationExperiment: s.validationExperiment,
    competitors: s.competitors,
    understanding: s.understanding,
  };
}

/** Final (penalty-applied) scores for the radar. */
export function radarScores(d: Pick<VerdictData, 'categoryScores'>): Record<Category, number> {
  return Object.fromEntries(CATEGORIES.map((c) => [c, d.categoryScores?.[c]?.finalScore ?? 0])) as Record<Category, number>;
}

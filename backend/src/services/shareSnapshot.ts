import type { Graph } from './engine/graphValidator';
import type { Competitor, SessionRow } from './engine/types';

/**
 * Public snapshots contain NO email, NO user id and NO raw search blobs.
 * Only what the owner chose to share (they pressed "share") is copied.
 */
export function buildVerdictSnapshot(s: SessionRow) {
  const u = (s.understanding ?? {}) as { problem?: string; targetUsers?: string; proposedSolution?: string };
  const p = (s.verdict_payload ?? {}) as Record<string, unknown>;
  const competitors = ((s.competitors ?? []) as Competitor[]).map((c) => ({
    name: c.name,
    url: c.url,
    whatTheyDo: c.whatTheyDo,
    whyItMatters: c.whyItMatters,
    source: c.source,
  }));
  return {
    kind: 'verdict' as const,
    title: s.title,
    mode: s.mode,
    understanding: { problem: u.problem ?? '', targetUsers: u.targetUsers ?? '', proposedSolution: u.proposedSolution ?? '' },
    totalScore: s.total_score,
    verdict: s.verdict,
    lowConfidence: p.lowConfidence ?? false,
    categoryScores: p.categoryScores ?? {},
    struggles: p.struggles ?? [],
    fixes: p.fixes ?? [],
    alternatives: p.alternatives ?? [],
    validationExperiment: p.validationExperiment ?? null,
    summary: p.summary ?? '',
    competitors,
  };
}

export function buildRoadmapSnapshot(r: { title: string; graph: Graph }) {
  return { kind: 'roadmap' as const, title: r.title, graph: r.graph };
}

// Maps Prisma (camelCase + Date) session rows to the snake_case SessionRow used by the engine.
import type { SessionRow } from '../services/engine/types';

export const iso = (d: Date | string | null | undefined): string | null => {
  if (d === null || d === undefined) return null;
  return d instanceof Date ? d.toISOString() : String(d);
};

export const isoStr = (d: Date | string): string => (d instanceof Date ? d.toISOString() : String(d));

type PrismaSession = {
  id: string;
  userId: string;
  kind: string;
  title: string;
  mode: string | null;
  ideaText: string | null;
  understanding: unknown;
  competitors: unknown;
  qa: unknown;
  assumptions: unknown;
  scores: unknown;
  totalScore: number | null;
  verdict: string | null;
  verdictPayload: unknown;
  skippedCount: number;
  plannedTotal: number | null;
  extension: unknown;
  status: string;
  saved: boolean;
  version: number;
  interrogationDone: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function toSessionRow(p: PrismaSession): SessionRow {
  return {
    id: p.id,
    user_id: p.userId,
    kind: p.kind as SessionRow['kind'],
    title: p.title,
    mode: p.mode,
    idea_text: p.ideaText,
    understanding: (p.understanding ?? null) as SessionRow['understanding'],
    competitors: (p.competitors ?? null) as SessionRow['competitors'],
    qa: (Array.isArray(p.qa) ? p.qa : []) as SessionRow['qa'],
    assumptions: (Array.isArray(p.assumptions) ? p.assumptions : []) as SessionRow['assumptions'],
    scores: (p.scores ?? null) as SessionRow['scores'],
    total_score: p.totalScore,
    verdict: p.verdict as SessionRow['verdict'],
    verdict_payload: (p.verdictPayload ?? null) as SessionRow['verdict_payload'],
    skipped_count: p.skippedCount,
    planned_total: p.plannedTotal,
    extension: (p.extension ?? null) as SessionRow['extension'],
    status: p.status as SessionRow['status'],
    saved: p.saved,
    version: p.version,
    interrogation_done: p.interrogationDone,
    created_at: isoStr(p.createdAt),
    updated_at: isoStr(p.updatedAt),
  };
}

/** Converts a snake_case session patch to Prisma camelCase input. */
export function toSessionPatch(patch: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, string> = {
    user_id: 'userId',
    idea_text: 'ideaText',
    total_score: 'totalScore',
    verdict_payload: 'verdictPayload',
    skipped_count: 'skippedCount',
    planned_total: 'plannedTotal',
    interrogation_done: 'interrogationDone',
    updated_at: 'updatedAt',
    created_at: 'createdAt',
  };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) out[map[k] ?? k] = v;
  return out;
}

import { db, getDb } from '../../lib/db';
import { toSessionPatch, toSessionRow } from '../../lib/rows';
import { forbidden, notFound } from '../../lib/errors';
import type { SessionRow } from './types';

export async function loadSession(id: string): Promise<SessionRow> {
  const row = await db(getDb().session.findUnique({ where: { id } }), 'session load');
  if (!row) throw notFound('Session not found');
  return toSessionRow(row);
}

export function assertOwner(row: { user_id: string }, userId: string): void {
  if (row.user_id !== userId) throw forbidden('You do not own this resource');
}

export async function loadOwnedSession(userId: string, id: string, kind?: SessionRow['kind']): Promise<SessionRow> {
  const row = await loadSession(id);
  assertOwner(row, userId);
  if (kind && row.kind !== kind) throw notFound('Session not found');
  return row;
}

/** Optimistic update: succeeds only if the row is still at `version`. Returns null on a lost race. */
export async function updateSession(id: string, version: number, patch: Record<string, unknown>): Promise<SessionRow | null> {
  const data = { ...toSessionPatch(patch), version: version + 1, updatedAt: new Date() } as unknown as Record<string, string>;
  const row = await db(
    getDb().session.updateMany({ where: { id, version }, data }),
    'session update',
  );
  if (row.count === 0) return null;
  return loadSession(id);
}

export function sessionToDto(r: SessionRow) {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    mode: r.mode,
    ideaText: r.idea_text,
    understanding: r.understanding,
    competitors: r.competitors,
    qa: r.qa,
    assumptions: r.assumptions,
    scores: r.scores,
    totalScore: r.total_score,
    verdict: r.verdict,
    verdictPayload: r.verdict_payload,
    skippedCount: r.skipped_count,
    plannedTotal: r.planned_total,
    extension: r.extension,
    status: r.status,
    saved: r.saved,
    interrogationDone: r.interrogation_done,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function sessionToListItem(r: Pick<SessionRow, 'id' | 'kind' | 'title' | 'mode' | 'total_score' | 'verdict' | 'status' | 'saved' | 'skipped_count' | 'created_at' | 'updated_at'>) {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    mode: r.mode,
    totalScore: r.total_score,
    verdict: r.verdict,
    status: r.status,
    saved: r.saved,
    skippedCount: r.skipped_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

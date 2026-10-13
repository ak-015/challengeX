// Pure helpers for the admin UI (unit-tested). The server enforces every rule; these only drive the UI state.
import type { AdminUser, ModelStatus } from './adminApi';
import type { Verdict } from '@/lib/constants';

export interface UserActionState {
  /** every destructive action is disabled */
  locked: boolean;
  /** why, shown next to the buttons */
  reason: string | null;
}

export function userActionState(u: Pick<AdminUser, 'id' | 'protected'>, meId: string | undefined): UserActionState {
  if (meId && u.id === meId) return { locked: true, reason: 'This is you. You cannot suspend, demote or delete yourself.' };
  if (u.protected) return { locked: true, reason: 'Seeded admin (ADMIN_EMAILS): protected. It can never be suspended, demoted or deleted.' };
  return { locked: false, reason: null };
}

export function formatUptime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

export function modelStatusText(m: Pick<ModelStatus, 'status' | 'cooldownRemainingMs'>): string {
  if (m.status === 'cooling') return `Cooling (${Math.ceil(m.cooldownRemainingMs / 1000)}s left)`;
  return m.status === 'disabled' ? 'Disabled' : 'Healthy';
}

/** KILL / PIVOT / BUILD bars (always all three, in this order) with their share of the total. */
export function verdictBars(dist: Partial<Record<Verdict, number>>): { verdict: Verdict; count: number; pct: number }[] {
  const order: Verdict[] = ['KILL', 'PIVOT', 'BUILD'];
  const total = order.reduce((s, v) => s + (dist[v] ?? 0), 0);
  return order.map((v) => ({ verdict: v, count: dist[v] ?? 0, pct: total === 0 ? 0 : Math.round(((dist[v] ?? 0) / total) * 100) }));
}

export const percent = (r: number | null | undefined): string => (r === null || r === undefined ? 'n/a' : `${Math.round(r * 1000) / 10}%`);

export const AUDIT_LABEL: Record<string, string> = {
  'user.suspend': 'Suspended a user',
  'user.reactivate': 'Re-activated a user',
  'user.promote': 'Promoted a user to admin',
  'user.demote': 'Demoted an admin',
  'user.delete': 'Deleted a user',
  'session.delete': 'Deleted a session',
  'share.revoke': 'Revoked a share',
  'model.reset': 'Reset a model',
};
export const auditLabel = (a: string): string => AUDIT_LABEL[a] ?? a;

/** Pads a 30-day series so the chart never has gaps. */
export function seriesValues(days: { day: string; count: number }[]): number[] {
  return days.map((d) => Number(d.count) || 0);
}

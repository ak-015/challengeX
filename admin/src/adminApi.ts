import { api } from '@/lib/api';
import type { AuthResult, Page, SessionDto, SessionKind, User } from '@/lib/apiTypes';
import type { ModeKey, Verdict } from '@/lib/constants';

type Sig = { signal?: AbortSignal };

export interface DayCount {
  day: string;
  count: number;
}
interface AdminStats {
  totals: { users: number; verifiedUsers: number; trials: number; completedTrials: number; roadmaps: number; shares: number };
  verdictDistribution: Partial<Record<Verdict, number>>;
  avgScore: number | null;
  signupsPerDay: DayCount[];
  trialsPerDay: DayCount[];
  ai: {
    last24h: { calls: number; successRate: number | null };
    byModel: { model: string; calls: number; successRate: number; p50Ms: number | null; p95Ms: number | null }[];
  };
  skipRate: number;
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  lastLoginAt: string | null;
  createdAt: string;
  trialCount: number;
  /** seeded admin (ADMIN_EMAILS): can never be suspended, demoted or deleted */
  protected: boolean;
}

export interface AdminSessionItem {
  id: string;
  kind: SessionKind;
  title: string;
  mode: ModeKey | null;
  totalScore: number | null;
  verdict: Verdict | null;
  status: 'in_progress' | 'complete';
  saved: boolean;
  skippedCount: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userEmail: string | null;
  userName: string | null;
}

export interface AdminShare {
  slug: string;
  kind: 'verdict' | 'roadmap';
  userId: string;
  userEmail: string | null;
  revoked: boolean;
  createdAt: string;
}

export interface ModelStatus {
  id: string;
  pools: string[];
  status: 'healthy' | 'cooling' | 'disabled';
  inflight: number;
  consecutiveFailures: number;
  lastLatencyMs: number | null;
  cooldownRemainingMs: number;
  lastError: string | null;
}
interface SystemInfo {
  models: ModelStatus[];
  search: { provider: string; configured: boolean };
  email: { brevo: boolean; resend: boolean };
  recentFailures: { at: string; provider: 'nim' | 'search' | 'email'; target: string | null; code: string }[];
  uptimeSeconds: number;
  nodeVersion: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  target: string;
  createdAt: string;
  adminId: string | null;
  adminEmail: string | null;
}

const qs = (o: Record<string, string | number | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== '') p.set(k, String(v));
  return p.toString();
};

export const adminApi = {
  login: (b: { email: string; password: string }) => api<AuthResult>('/api/auth/login', { method: 'POST', body: b, auth: false }),
  me: (s?: Sig) => api<{ user: User }>('/api/auth/me', s),
  stats: (s?: Sig) => api<AdminStats>('/api/admin/stats', s),
  users: (q: { q?: string; page?: number; pageSize?: number }, s?: Sig) => api<Page<AdminUser>>(`/api/admin/users?${qs({ q: q.q, page: q.page ?? 1, pageSize: q.pageSize ?? 20 })}`, s),
  patchUser: (id: string, body: { status?: 'active' | 'suspended'; role?: 'user' | 'admin' }) =>
    api<{ id: string; email: string; role: 'user' | 'admin'; status: 'active' | 'suspended' }>(`/api/admin/users/${id}`, { method: 'PATCH', body }),
  deleteUser: (id: string) => api<{ ok: true }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  sessions: (q: { kind?: string; verdict?: string; userId?: string; page?: number }, s?: Sig) =>
    api<Page<AdminSessionItem>>(`/api/admin/sessions?${qs({ kind: q.kind, verdict: q.verdict, userId: q.userId, page: q.page ?? 1, pageSize: 20 })}`, s),
  session: (id: string, s?: Sig) => api<SessionDto>(`/api/admin/sessions/${id}`, s),
  deleteSession: (id: string) => api<{ ok: true }>(`/api/admin/sessions/${id}`, { method: 'DELETE' }),
  shares: (page: number, s?: Sig) => api<Page<AdminShare>>(`/api/admin/shares?${qs({ page, pageSize: 20 })}`, s),
  revokeShare: (slug: string) => api<{ ok: true }>(`/api/admin/shares/${slug}`, { method: 'DELETE' }),
  system: (s?: Sig) => api<SystemInfo>('/api/admin/system', s),
  // Model ids contain "/" so they MUST be URL-encoded.
  resetModel: (id: string) => api<{ ok: true; models: ModelStatus[] }>(`/api/admin/models/${encodeURIComponent(id)}/reset`, { method: 'POST' }),
  audit: (page: number, s?: Sig) => api<Page<AuditEntry>>(`/api/admin/audit?${qs({ page, pageSize: 25 })}`, s),
};

import { api, TIMEOUT_AI, type RequestOptions } from './api';
import type {
  AnswerResponse,
  AuthResult,
  CropRegion,
  ExtensionResolution,
  IdeasInput,
  IdeasResponse,
  NextResponse,
  Page,
  PublicShare,
  Roadmap,
  RoadmapInput,
  RoadmapListItem,
  RoadmapSource,
  SessionDto,
  SessionKind,
  SessionListItem,
  SignedUpload,
  TrialCreated,
  Understanding,
  User,
  VerdictResponse,
} from './apiTypes';
import type { ModeKey } from './constants';

type Sig = Pick<RequestOptions, 'signal'>;

export const health = (s?: Sig) => api<{ ok: boolean; uptime: number }>('/api/health', { auth: false, timeoutMs: 20_000, retry: false, ...s });

export const auth = {
  signup: (b: { email: string; password: string; displayName: string }) =>
    api<{ ok: true; email: string }>('/api/auth/signup', { method: 'POST', body: b, auth: false }),
  verifyOtp: (b: { email: string; code: string }) => api<AuthResult>('/api/auth/verify-otp', { method: 'POST', body: b, auth: false }),
  resendOtp: (b: { email: string; purpose: 'signup' | 'reset' }) =>
    api<{ ok: true }>('/api/auth/resend-otp', { method: 'POST', body: b, auth: false }),
  login: (b: { email: string; password: string }) => api<AuthResult>('/api/auth/login', { method: 'POST', body: b, auth: false }),
  forgot: (b: { email: string }) => api<{ ok: true }>('/api/auth/forgot', { method: 'POST', body: b, auth: false }),
  reset: (b: { email: string; code: string; newPassword: string }) =>
    api<{ ok: true }>('/api/auth/reset', { method: 'POST', body: b, auth: false }),
  me: (s?: Sig) => api<{ user: User }>('/api/auth/me', s),
  updateMe: (b: { displayName: string }) => api<{ user: User }>('/api/auth/me', { method: 'PATCH', body: b }),
};

export const trials = {
  create: (b: { idea: string; mode: ModeKey }, s?: Sig) =>
    api<TrialCreated>('/api/trials', { method: 'POST', body: b, timeoutMs: TIMEOUT_AI, ...s }),
  get: (id: string, s?: Sig) => api<SessionDto>(`/api/trials/${id}`, s),
  list: (q: { kind?: SessionKind; saved?: boolean; page?: number; pageSize?: number }, s?: Sig) => {
    const p = new URLSearchParams();
    if (q.kind) p.set('kind', q.kind);
    if (q.saved !== undefined) p.set('saved', String(q.saved));
    p.set('page', String(q.page ?? 1));
    p.set('pageSize', String(q.pageSize ?? 20));
    return api<Page<SessionListItem>>(`/api/trials?${p}`, s);
  },
  patchUnderstanding: (id: string, b: Partial<Understanding> & { title?: string }) =>
    api<{ id: string; title: string; understanding: Understanding }>(`/api/trials/${id}/understanding`, { method: 'PATCH', body: b }),
  next: (id: string, s?: Sig) => api<NextResponse>(`/api/trials/${id}/next`, { method: 'POST', timeoutMs: TIMEOUT_AI, retry: true, ...s }),
  extend: (id: string, action: 'continue' | 'verdict') =>
    api<ExtensionResolution>(`/api/trials/${id}/extend`, { method: 'POST', body: { action }, retry: true }),
  answer: (id: string, b: { questionId: string; answer?: string; skipped?: boolean }, s?: Sig) =>
    api<AnswerResponse>(`/api/trials/${id}/answer`, { method: 'POST', body: b, retry: true, ...s }),
  verdict: (id: string, s?: Sig) => api<VerdictResponse>(`/api/trials/${id}/verdict`, { method: 'POST', timeoutMs: TIMEOUT_AI, retry: true, ...s }),
  save: (id: string, saved: boolean) => api<{ ok: true; saved: boolean }>(`/api/trials/${id}/save`, { method: 'POST', body: { saved }, retry: true }),
  remove: (id: string) => api<{ ok: true }>(`/api/trials/${id}`, { method: 'DELETE' }),
};

export const ideas = {
  generate: (b: IdeasInput, s?: Sig) => api<IdeasResponse>('/api/ideas', { method: 'POST', body: b, timeoutMs: TIMEOUT_AI, ...s }),
};

export const roadmaps = {
  create: (b: RoadmapInput, s?: Sig) => api<Roadmap>('/api/roadmaps', { method: 'POST', body: b, timeoutMs: 100_000, ...s }),
  get: (id: string, s?: Sig) => api<Roadmap>(`/api/roadmaps/${id}`, s),
  list: (page = 1, s?: Sig) => api<Page<RoadmapListItem>>(`/api/roadmaps?page=${page}`, s),
  sources: (s?: Sig) => api<{ items: RoadmapSource[] }>('/api/roadmap-sources', s),
};

export const uploads = {
  sign: (b: { purpose: 'avatar'; crop?: CropRegion } | { purpose: 'export' }) =>
    api<SignedUpload>('/api/uploads/sign', { method: 'POST', body: b }),
};

export const profile = {
  saveAvatar: (b: { secureUrl: string; publicId: string }) => api<{ avatarUrl: string }>('/api/profile/avatar', { method: 'POST', body: b }),
};

export const shares = {
  create: (b: { kind: 'verdict' | 'roadmap'; refId: string; pngUrl?: string | null; pdfUrl?: string | null }) =>
    api<{ slug: string }>('/api/shares', { method: 'POST', body: b }),
  get: (slug: string, s?: Sig) => api<PublicShare>(`/api/shares/${slug}`, { auth: false, ...s }),
  remove: (slug: string) => api<{ ok: true }>(`/api/shares/${slug}`, { method: 'DELETE' }),
};

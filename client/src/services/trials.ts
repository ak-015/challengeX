import { api } from './api';
import type {
  AnswerResponse,
  CreateTrialResponse,
  ModeKey,
  NextQuestionResponse,
  Paged,
  ResolveExtensionResponse,
  Session,
  SessionListItem,
  SessionKind,
  VerdictResponse,
} from '@/types/api';

export const trialsService = {
  create: (idea: string, mode: ModeKey) =>
    api.post<CreateTrialResponse>('/trials', { idea, mode }),

  list: (params: { kind?: SessionKind; saved?: boolean; page?: number; pageSize?: number } = {}) =>
    api.get<Paged<SessionListItem>>('/trials', {
      query: {
        kind: params.kind,
        saved: params.saved === undefined ? undefined : String(params.saved),
        page: params.page,
        pageSize: params.pageSize,
      },
    }),

  get: (id: string) => api.get<Session>(`/trials/${id}`),

  patchUnderstanding: (
    id: string,
    patch: { problem?: string; targetUsers?: string; proposedSolution?: string; title?: string },
  ) =>
    api.patch<{ id: string; title: string; understanding: Record<string, string> }>(
      `/trials/${id}/understanding`,
      patch,
    ),

  resolveExtension: (id: string, action: 'continue' | 'verdict') =>
    api.post<ResolveExtensionResponse>(`/trials/${id}/extend`, { action }),

  next: (id: string) => api.post<NextQuestionResponse>(`/trials/${id}/next`),

  answer: (id: string, questionId: string, answer?: string, skipped?: boolean) =>
    api.post<AnswerResponse>(`/trials/${id}/answer`, { questionId, answer, skipped }),

  verdict: (id: string) => api.post<VerdictResponse>(`/trials/${id}/verdict`),

  save: (id: string, saved: boolean) =>
    api.post<{ ok: boolean; saved: boolean }>(`/trials/${id}/save`, { saved }),

  remove: (id: string) => api.delete<{ ok: boolean }>(`/trials/${id}`),
};

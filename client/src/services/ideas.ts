import { api } from './api';
import type { GenerateIdeasRequest, GenerateIdeasResponse } from '@/types/api';

export const ideasService = {
  /** Backend always returns exactly 3 ideas (enforced by its zod schema). */
  generate: (input: GenerateIdeasRequest) => api.post<GenerateIdeasResponse>('/ideas', input),
};

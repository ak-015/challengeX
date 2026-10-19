import { api } from './api';
import type {
  GenerateRoadmapRequest,
  GenerateRoadmapResponse,
  Paged,
  Roadmap,
  RoadmapListItem,
  RoadmapSource,
} from '@/types/api';

export const roadmapsService = {
  generate: (input: GenerateRoadmapRequest) =>
    api.post<GenerateRoadmapResponse>('/roadmaps', input),

  list: (params: { page?: number; pageSize?: number } = {}) =>
    api.get<Paged<RoadmapListItem>>('/roadmaps', { query: { page: params.page, pageSize: params.pageSize } }),

  get: (id: string) => api.get<Roadmap>(`/roadmaps/${id}`),

  sources: () => api.get<{ items: RoadmapSource[] }>('/roadmap-sources'),
};

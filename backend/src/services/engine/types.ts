import type { Category } from './constants';

type Risk = 'high' | 'medium' | 'low';

export interface Assessment {
  category: Category;
  risk: Risk;
  assumption: string;
}

export interface QaEntry {
  id: string;
  index: number;
  category: Category;
  text: string;
  answer: string | null;
  skipped: boolean;
  assessment: Assessment | null;
}

export interface Assumption {
  id: string;
  category: Category;
  risk: 'high' | 'medium';
  text: string;
  source: 'assessment' | 'skipped';
  questionId: string;
}

export interface Competitor {
  name: string;
  url: string | null;
  whatTheyDo: string;
  whyItMatters: string;
  source: 'search' | 'ai_estimate';
}

export interface Understanding {
  problem: string;
  targetUsers: string;
  proposedSolution: string;
  searchQueries?: string[];
}

export interface TrialExtension {
  status: 'offered' | 'accepted' | 'declined';
  additionalQuestions: 2 | 3;
  reason: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  kind: 'trial' | 'ideas' | 'roadmap';
  title: string;
  mode: string | null;
  idea_text: string | null;
  understanding: Understanding | Record<string, unknown> | null;
  competitors: Competitor[] | null;
  qa: QaEntry[];
  assumptions: Assumption[];
  scores: Record<string, number> | null;
  total_score: number | null;
  verdict: 'KILL' | 'PIVOT' | 'BUILD' | null;
  verdict_payload: Record<string, unknown> | null;
  skipped_count: number;
  planned_total: number | null;
  extension: TrialExtension | null;
  status: 'in_progress' | 'complete';
  saved: boolean;
  version: number;
  interrogation_done: boolean;
  created_at: string;
  updated_at: string;
}

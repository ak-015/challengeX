// Response shapes of the backend (backend/src/routes/*). Keep in sync with the server.
import type { Category, ModeKey, Verdict } from './constants';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  emailVerified: boolean;
}
export interface AuthResult {
  token: string;
  user: User;
}

interface Understanding {
  problem: string;
  targetUsers: string;
  proposedSolution: string;
}
type Risk = 'high' | 'medium' | 'low';
interface Assessment {
  category: Category;
  risk: Risk;
  assumption: string;
}
interface QaEntry {
  id: string;
  index: number;
  category: Category;
  text: string;
  answer: string | null;
  skipped: boolean;
  assessment: Assessment | null;
}
interface Assumption {
  id: string;
  category: Category;
  risk: 'high' | 'medium';
  text: string;
  source: 'assessment' | 'skipped';
  questionId: string;
}
interface Competitor {
  name: string;
  url: string | null;
  whatTheyDo: string;
  whyItMatters: string;
  source: 'search' | 'ai_estimate';
}
interface CategoryScore {
  score: number; // model score (0-10, 0.5 steps)
  penalty: number; // skip penalty
  finalScore: number; // what the radar shows
  rationale: string;
}
interface Struggle {
  title: string;
  category: Category;
  why: string;
  questionId: string;
  questionIndex: number;
  questionText: string;
  answerExcerpt: string; // verbatim excerpt, or "skipped"
}
interface Fix {
  struggleIndex: number;
  action: string;
  effort: 'low' | 'medium' | 'high';
}
interface Alternative {
  title: string;
  pitch: string;
  whatChanges: string;
}
interface ValidationExperiment {
  description: string;
  metric: string;
  sampleSize: string;
  durationDays: number;
  buildIf: string;
  pivotIf: string;
  killIf: string;
}
interface VerdictResponse {
  sessionId: string;
  title: string;
  mode: ModeKey;
  totalScore: number;
  verdict: Verdict;
  scores: Record<Category, number>;
  categoryScores: Record<Category, CategoryScore>;
  struggles: Struggle[];
  fixes: Fix[];
  alternatives: Alternative[];
  validationExperiment: ValidationExperiment;
  summary: string;
  lowConfidence: boolean;
  skippedCount: number;
}

export type SessionKind = 'trial' | 'ideas' | 'roadmap';
interface Idea {
  title: string;
  oneLiner: string;
  problem: string;
  targetUsers: string;
  whyYouFit: string;
  firstStep: string;
  mainRisk: string;
}

/** GET /api/trials/:id */
export interface SessionDto {
  id: string;
  kind: SessionKind;
  title: string;
  mode: ModeKey | null;
  ideaText: string | null;
  understanding: (Understanding & { searchQueries?: string[] }) | Record<string, unknown> | null;
  competitors: Competitor[] | null;
  qa: QaEntry[];
  assumptions: Assumption[];
  scores: Record<Category, number> | null;
  totalScore: number | null;
  verdict: Verdict | null;
  verdictPayload: (Omit<VerdictResponse, 'sessionId' | 'title' | 'mode' | 'totalScore' | 'verdict' | 'scores'> & { ideas?: Idea[]; roadmapId?: string }) | null;
  skippedCount: number;
  status: 'in_progress' | 'complete';
  saved: boolean;
  interrogationDone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

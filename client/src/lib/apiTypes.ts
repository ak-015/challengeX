// Response shapes of the backend (backend/src/routes/*). Keep in sync with the server.
import type { Category, DecisionField, ModeKey, Stage, Verdict } from './constants';

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

export interface Understanding {
  problem: string;
  targetUsers: string;
  proposedSolution: string;
}
export interface TrialCreated {
  id: string;
  title: string;
  mode: ModeKey;
  understanding: Understanding;
}

export type Risk = 'high' | 'medium' | 'low';
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
export interface Progress {
  asked: number;
  plannedTotal: number;
}
export interface TrialExtension {
  status: 'offered' | 'accepted' | 'declined';
  additionalQuestions: 2 | 3;
  reason: string;
}
export interface QuestionResponse {
  question: { id: string; index: number; category: Category; text: string };
  progress: Progress;
  competitors?: Competitor[]; // only with the first question
  assumptions: Assumption[];
}
export interface DoneResponse {
  done: true;
  progress: Progress;
  assumptions: Assumption[];
  lowerConfidence?: boolean;
}
export interface ExtensionOfferResponse {
  extension: TrialExtension & { status: 'offered' };
  progress: Progress;
  assumptions: Assumption[];
}
export interface ExtensionResolution {
  progress: Progress;
  extension: TrialExtension;
  done?: true;
  lowerConfidence?: true;
}
export type NextResponse = QuestionResponse | DoneResponse | ExtensionOfferResponse;
export const isDone = (r: NextResponse): r is DoneResponse => 'done' in r && r.done === true;
export const isExtensionOffer = (r: NextResponse): r is ExtensionOfferResponse => 'extension' in r;

export interface AnswerResponse {
  ok: true;
  alreadyAnswered: boolean;
  questionId: string;
  skippedCount: number;
  progress: Progress;
  assumptions: Assumption[];
}

export interface CategoryScore {
  score: number; // model score (0-10, 0.5 steps)
  penalty: number; // skip penalty
  finalScore: number; // what the radar shows
  rationale: string;
}
export interface Struggle {
  title: string;
  category: Category;
  why: string;
  questionId: string;
  questionIndex: number;
  questionText: string;
  answerExcerpt: string; // verbatim excerpt, or "skipped"
}
export interface Fix {
  struggleIndex: number;
  action: string;
  effort: 'low' | 'medium' | 'high';
}
export interface Alternative {
  title: string;
  pitch: string;
  whatChanges: string;
}
export interface ValidationExperiment {
  description: string;
  metric: string;
  sampleSize: string;
  durationDays: number;
  buildIf: string;
  pivotIf: string;
  killIf: string;
}
export interface VerdictResponse {
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
export interface Idea {
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
  plannedTotal: number | null;
  extension: TrialExtension | null;
  status: 'in_progress' | 'complete';
  saved: boolean;
  interrogationDone: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionListItem {
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
}
export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface IdeasInput {
  hobbies: string[];
  interests: string[];
  skills: string[];
  field?: string;
  problemArea?: string;
  audience?: string;
  teamSize?: string;
  hoursPerWeek?: string;
  budget?: string;
  platform?: string;
  region?: string;
  goal?: string;
  avoid?: string;
  extra?: string;
}
export interface IdeasResponse {
  id: string;
  title: string;
  ideas: Idea[];
}

export type NodeType = 'step' | 'decision' | 'milestone';
export type Difficulty = 'low' | 'medium' | 'high';
export interface GraphNode {
  id: string;
  stage: Stage;
  type: NodeType;
  title: string;
  description: string;
  durationEstimate: string;
  deliverables: string[];
  difficulty: Difficulty;
  difficultyNote?: string | null;
  betterPath?: string | null;
  decisionField?: DecisionField | null;
}
export interface GraphEdge {
  from: string;
  to: string;
  kind: 'recommended' | 'alternate' | 'normal';
  label?: string | null;
}
export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
export interface RoadmapInput {
  trialId?: string;
  ideaText?: string;
  techStack?: string;
  marketing?: string;
  team?: string;
  timeline?: string;
  budget?: string;
  platform?: string;
  extra?: string;
}
export interface Roadmap {
  id: string;
  title: string;
  trialId: string | null;
  graph: Graph;
  createdAt: string;
  undecided?: DecisionField[];
  input?: Record<string, unknown>;
}
export interface RoadmapListItem {
  id: string;
  trialId: string | null;
  title: string;
  createdAt: string;
}
export interface RoadmapSource {
  id: string;
  title: string;
  verdict: Verdict;
  totalScore: number;
  updatedAt: string;
}

export interface SignedUpload {
  uploadUrl: string;
  apiKey: string;
  cloudName: string;
  timestamp: number;
  signature: string;
  params: Record<string, string>;
  maxBytes: number;
}
export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VerdictSnapshot {
  kind: 'verdict';
  title: string;
  mode: ModeKey | null;
  understanding: Understanding;
  totalScore: number | null;
  verdict: Verdict | null;
  lowConfidence: boolean;
  categoryScores: Record<Category, CategoryScore>;
  struggles: Struggle[];
  fixes: Fix[];
  alternatives: Alternative[];
  validationExperiment: ValidationExperiment | null;
  summary: string;
  competitors: Competitor[];
}
export interface RoadmapSnapshot {
  kind: 'roadmap';
  title: string;
  graph: Graph;
}
export interface PublicShare {
  slug: string;
  kind: 'verdict' | 'roadmap';
  snapshot: VerdictSnapshot | RoadmapSnapshot;
  pngUrl: string | null;
  pdfUrl: string | null;
  createdAt: string;
  owner: { displayName: string; avatarUrl: string | null };
}

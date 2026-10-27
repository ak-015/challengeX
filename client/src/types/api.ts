// Types derived directly from the existing backend source (routes + engine services).
// Sources: src/routes/*.ts, src/services/engine/{types,sessions,schemas,constants,graphValidator}.ts

// ---------------------------------------------------------------- auth
type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  emailVerified: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ---------------------------------------------------------------- errors
export interface ApiErrorBody {
  code: string;
  message: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------- trial engine
export type RiskCategory =
  | 'technical'
  | 'market'
  | 'social'
  | 'financial'
  | 'legal'
  | 'scalability'
  | 'competition';

export const RISK_CATEGORIES: RiskCategory[] = [
  'technical',
  'market',
  'social',
  'financial',
  'legal',
  'scalability',
  'competition',
];

export type ModeKey = 'stress_test' | 'brutal' | '100x' | 'competitor' | 'failure';

export const MODES: Record<ModeKey, { label: string; directive: string }> = {
  stress_test: { label: 'Stress Test', directive: 'Balanced skeptic. Probe the weakest assumptions fairly.' },
  brutal: { label: 'Brutal', directive: 'Harsh skeptic. Assume the worst case in every ambiguity.' },
  '100x': { label: '100x', directive: 'Assume 100x load. Hunt for the breakpoints.' },
  competitor: { label: 'Competitor', directive: 'Weight rivals and switching costs heavily.' },
  failure: { label: 'Failure', directive: 'Post-mortem mode: it failed 12 months from now. Ask why.' },
};

type Risk = 'high' | 'medium' | 'low';
type Difficulty = 'low' | 'medium' | 'high';

interface Assessment {
  category: RiskCategory;
  risk: Risk;
  assumption: string;
}

interface QaEntry {
  id: string;
  index: number;
  category: RiskCategory;
  text: string;
  answer: string | null;
  skipped: boolean;
  assessment: Assessment | null;
}

export interface Assumption {
  id: string;
  category: RiskCategory;
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

export type SessionKind = 'trial' | 'ideas' | 'roadmap';
export type SessionStatus = 'in_progress' | 'complete';
export type Verdict = 'KILL' | 'PIVOT' | 'BUILD';

// GET /api/trials/:id — sessionToDto
export interface Session {
  id: string;
  kind: SessionKind;
  title: string;
  mode: string | null;
  ideaText: string | null;
  understanding: (Understanding & Record<string, unknown>) | null;
  competitors: Competitor[] | null;
  qa: QaEntry[];
  assumptions: Assumption[];
  scores: Record<string, number> | null;
  totalScore: number | null;
  verdict: Verdict | null;
  verdictPayload: VerdictPayload | IdeasPayload | Record<string, unknown> | null;
  skippedCount: number;
  plannedTotal: number | null;
  extension: TrialExtension | null;
  status: SessionStatus;
  saved: boolean;
  interrogationDone: boolean;
  createdAt: string;
  updatedAt: string;
}

// sessionToListItem
export interface SessionListItem {
  id: string;
  kind: SessionKind;
  title: string;
  mode: string | null;
  totalScore: number | null;
  verdict: Verdict | null;
  status: SessionStatus;
  saved: boolean;
  skippedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Progress {
  asked: number;
  plannedTotal: number;
}

// POST /api/trials — createTrial
export interface CreateTrialResponse {
  id: string;
  title: string;
  mode: string | null;
  understanding: Omit<Understanding, 'searchQueries'>;
}

interface QuestionPayload {
  question: { id: string; index: number; category: RiskCategory; text: string };
  progress: Progress;
  competitors?: Competitor[];
  assumptions: Assumption[];
}

interface DonePayload {
  done: true;
  progress: Progress;
  assumptions: Assumption[];
}

interface ExtensionPayload {
  extension: TrialExtension;
  progress: Progress;
  assumptions: Assumption[];
}

export type NextQuestionResponse = QuestionPayload | DonePayload | ExtensionPayload;

export function isQuestion(p: NextQuestionResponse): p is QuestionPayload {
  return 'question' in p;
}
export function isDone(p: NextQuestionResponse): p is DonePayload {
  return 'done' in p && p.done === true;
}
export function isExtension(p: NextQuestionResponse): p is ExtensionPayload {
  return 'extension' in p && !('done' in p);
}

export interface AnswerResponse {
  ok: boolean;
  alreadyAnswered: boolean;
  questionId: string;
  skippedCount: number;
  progress: Progress;
  assumptions: Assumption[];
}

export interface ResolveExtensionResponse {
  progress: Progress;
  extension?: TrialExtension;
  done?: true;
  lowerConfidence?: true;
}

// verdict payload (server-built in generateVerdict)
interface CategoryScoreDetail {
  score: number;
  penalty: number;
  finalScore: number;
  rationale: string;
}

interface Struggle {
  title: string;
  category: RiskCategory;
  why: string;
  questionId: string;
  questionIndex: number;
  questionText: string;
  answerExcerpt?: string;
}

export interface Fix {
  struggleIndex: number;
  action: string;
  effort: Difficulty;
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

interface VerdictPayload {
  categoryScores: Record<RiskCategory, CategoryScoreDetail>;
  struggles: Struggle[];
  fixes: Fix[];
  alternatives: Alternative[];
  validationExperiment: ValidationExperiment;
  summary: string;
  lowConfidence: boolean;
  skippedCount: number;
}


// ---------------------------------------------------------------- ideas
export interface GeneratedIdea {
  title: string;
  oneLiner: string;
  problem: string;
  targetUsers: string;
  whyYouFit: string;
  firstStep: string;
  mainRisk: string;
}

interface IdeasPayload {
  ideas: GeneratedIdea[];
}

export interface GenerateIdeasRequest {
  hobbies?: string[];
  interests?: string[];
  skills?: string[];
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

export interface GenerateIdeasResponse {
  id: string;
  title: string;
  ideas: GeneratedIdea[];
}

// ---------------------------------------------------------------- roadmaps
export type Stage = 'validate' | 'spec' | 'design' | 'blueprint' | 'prototype' | 'launch';
export const STAGES: Stage[] = ['validate', 'spec', 'design', 'blueprint', 'prototype', 'launch'];

type DecisionField = 'techStack' | 'marketing' | 'team' | 'timeline' | 'budget' | 'platform';

export interface GraphNode {
  id: string;
  stage: Stage;
  type: 'step' | 'decision' | 'milestone';
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

export interface GenerateRoadmapRequest {
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

export interface GenerateRoadmapResponse {
  id: string;
  title: string;
  trialId: string | null;
  graph: Graph;
  undecided: DecisionField[];
  createdAt: string;
}

export interface RoadmapListItem {
  id: string;
  trialId: string | null;
  title: string;
  createdAt: string;
}

export interface Roadmap extends GenerateRoadmapResponse {
  input: Record<string, unknown>;
}

export interface RoadmapSource {
  id: string;
  title: string;
  verdict: Verdict;
  totalScore: number | null;
  updatedAt: string;
}

// ---------------------------------------------------------------- shares
interface ShareSnapshot {
  [key: string]: unknown;
}

export interface PublicShare {
  slug: string;
  kind: 'verdict' | 'roadmap';
  snapshot: ShareSnapshot;
  pngUrl: string | null;
  pdfUrl: string | null;
  createdAt: string;
  owner: { displayName: string; avatarUrl: string | null };
}

// ---------------------------------------------------------------- uploads
export interface SignedUpload {
  uploadUrl: string;
  apiKey: string;
  cloudName: string;
  timestamp: number;
  signature: string;
  params: Record<string, string>;
  maxBytes: number;
}

// POST /api/trials/:id/verdict — verdictResponse
export interface VerdictResponse extends VerdictPayload {
  sessionId: string;
  title: string;
  mode: string | null;
  totalScore: number | null;
  verdict: Verdict | null;
  scores: Record<string, number> | null;
}


// Pure state logic for the trial screen (unit-tested). The hook in components/trial/useTrial.ts wires it to the API.
import { MAX_QUESTIONS, MIN_QUESTIONS } from './constants';
import type { Assumption, Competitor, ExtensionOfferResponse, ExtensionResolution, Progress, QaEntry, QuestionResponse, SessionDto, TrialExtension, Understanding } from './apiTypes';

export type TrialPhase = 'loading' | 'understanding' | 'chat' | 'extension';

export interface TrialState {
  phase: TrialPhase;
  title: string;
  understanding: Understanding | null;
  qa: QaEntry[];
  assumptions: Assumption[];
  competitors: Competitor[];
  skippedCount: number;
  progress: Progress;
  extension: TrialExtension | null;
  busy: null | 'scouting' | 'ponder';
  error: { message: string; retryable: boolean; code: string } | null;
}

export const initialTrialState: TrialState = {
  phase: 'loading',
  title: '',
  understanding: null,
  qa: [],
  assumptions: [],
  competitors: [],
  skippedCount: 0,
  progress: { asked: 0, plannedTotal: MIN_QUESTIONS },
  extension: null,
  busy: null,
  error: null,
};

export type TrialAction =
  | { type: 'loaded'; session: SessionDto }
  | { type: 'understanding'; value: Understanding; title?: string }
  | { type: 'begin' }
  | { type: 'busy'; busy: TrialState['busy'] }
  | { type: 'question'; response: QuestionResponse }
  | { type: 'extension-offer'; response: ExtensionOfferResponse }
  | { type: 'extension-resolved'; response: ExtensionResolution }
  | { type: 'answered'; questionId: string; answer: string | null; skipped: boolean; skippedCount: number; assumptions: Assumption[] }
  | { type: 'error'; error: NonNullable<TrialState['error']> }
  | { type: 'clearError' };

export const pendingOf = (qa: QaEntry[]): QaEntry | undefined => qa.find((q) => q.answer === null && !q.skipped);

export function trialReducer(state: TrialState, a: TrialAction): TrialState {
  switch (a.type) {
    case 'loaded': {
      const s = a.session;
      const u = (s.understanding ?? {}) as Partial<Understanding>;
      const needsConfirm = s.qa.length === 0 && s.competitors === null;
      const plannedTotal = s.plannedTotal ?? Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, s.qa.length));
      return {
        ...state,
        phase: s.extension?.status === 'offered' ? 'extension' : needsConfirm ? 'understanding' : 'chat',
        title: s.title,
        understanding: { problem: u.problem ?? '', targetUsers: u.targetUsers ?? '', proposedSolution: u.proposedSolution ?? '' },
        qa: s.qa,
        assumptions: s.assumptions,
        competitors: s.competitors ?? [],
        skippedCount: s.skippedCount,
        progress: { asked: s.qa.length, plannedTotal },
        extension: s.extension,
        error: null,
      };
    }
    case 'understanding':
      return { ...state, understanding: a.value, title: a.title ?? state.title };
    case 'begin':
      return { ...state, phase: 'chat' };
    case 'busy':
      return { ...state, busy: a.busy };
    case 'question': {
      const q = a.response.question;
      // Never duplicate a question (resume / retry / double response).
      const qa = state.qa.some((x) => x.id === q.id) ? state.qa : [...state.qa, { id: q.id, index: q.index, category: q.category, text: q.text, answer: null, skipped: false, assessment: null }];
      return {
        ...state,
        phase: 'chat',
        qa,
        assumptions: a.response.assumptions,
        competitors: a.response.competitors ?? state.competitors,
        progress: a.response.progress,
        error: null,
      };
    }
    case 'extension-offer':
      return {
        ...state,
        phase: 'extension',
        progress: a.response.progress,
        extension: a.response.extension,
        assumptions: a.response.assumptions,
        error: null,
      };
    case 'extension-resolved':
      return {
        ...state,
        phase: 'chat',
        progress: a.response.progress,
        extension: a.response.extension,
        error: null,
      };
    case 'answered':
      return {
        ...state,
        qa: state.qa.map((q) => (q.id === a.questionId ? { ...q, answer: a.answer, skipped: a.skipped } : q)),
        assumptions: a.assumptions,
        skippedCount: a.skippedCount,
        error: null,
      };
    case 'error':
      return { ...state, error: a.error, busy: null };
    case 'clearError':
      return { ...state, error: null };
    default:
      return state;
  }
}

export type RuneStatus = 'answered' | 'skipped' | 'current' | 'upcoming';

/** Rune slots are fixed to the server's planned total for the whole trial. */
export function runeSlots(qa: QaEntry[], plannedTotal = MIN_QUESTIONS): RuneStatus[] {
  const total = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, plannedTotal));
  return Array.from({ length: total }, (_, i) => {
    const q = qa[i];
    if (!q) return 'upcoming';
    if (q.skipped) return 'skipped';
    if (q.answer === null) return 'current';
    return 'answered';
  });
}

export function progressLabel(qa: QaEntry[], plannedTotal = MIN_QUESTIONS): string {
  const pending = pendingOf(qa);
  const total = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, plannedTotal));
  const current = pending ? pending.index : Math.min(total, Math.max(1, qa.length + (qa.length < total ? 1 : 0)));
  return `Question ${current} of ${total}`;
}

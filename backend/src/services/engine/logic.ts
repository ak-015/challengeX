import { randomUUID } from 'node:crypto';
import { CATEGORIES, FALLBACK_QUESTIONS, MAX_QUESTIONS, MIN_QUESTIONS, type Category } from './constants';
import type { Assessment, Assumption, QaEntry } from './types';

export interface NextDecision {
  done: boolean;
  category?: Category | null;
  text?: string | null;
}

export const normalizeText = (t: string): string => t.toLowerCase().replace(/\s+/g, ' ').trim();

export function uncoveredCategories(qa: QaEntry[]): Category[] {
  const covered = new Set(qa.map((q) => q.category));
  return CATEGORIES.filter((c) => !covered.has(c));
}

export const pendingQuestion = (qa: QaEntry[]): QaEntry | undefined => qa.find((q) => q.answer === null && !q.skipped);

export function skippedByCategory(qa: QaEntry[]): Record<Category, number> {
  const out = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const q of qa) if (q.skipped) out[q.category]++;
  return out;
}

export const isCapReached = (askedCount: number): boolean => askedCount >= MAX_QUESTIONS;

/** Returns a human-readable violation (used as the correction prompt) or null when the decision is acceptable. */
export function checkDecision(d: NextDecision, qa: QaEntry[], plannedTotal = MIN_QUESTIONS): string | null {
  const asked = qa.length;
  const uncovered = uncoveredCategories(qa);
  if (d.done) {
    if (asked < plannedTotal) return `You may not finish yet: only ${asked} questions were asked; the planned minimum is ${plannedTotal}. Ask another question.`;
    if (uncovered.length > 0) return `You may not finish: these categories have not been asked yet: ${uncovered.join(', ')}. Ask about one of them.`;
    return null;
  }
  if (asked >= plannedTotal) return `The planned total of ${plannedTotal} questions has been reached.`;
  if (!d.category || !d.text) return 'A question needs both a category and text.';
  if (d.text.length > 220) return 'The question text must be at most 220 characters.';
  if (uncovered.length > 0 && !uncovered.includes(d.category)) {
    return `Category "${d.category}" was already covered. Uncovered categories remain: ${uncovered.join(', ')}. Ask about one of them.`;
  }
  const norm = normalizeText(d.text);
  if (qa.some((q) => normalizeText(q.text) === norm)) return 'That question was already asked. Ask something new.';
  return null;
}

export function extensionChoices(plannedTotal: number): (2 | 3)[] {
  const remaining = MAX_QUESTIONS - plannedTotal;
  return ([2, 3] as const).filter((count) => count <= remaining);
}

/** Last resort when the correction did not fix it: force an uncovered category (or a follow-up). */
export function forceDecision(d: NextDecision, qa: QaEntry[]): { category: Category; text: string } {
  const uncovered = uncoveredCategories(qa);
  const used = new Set(qa.map((q) => normalizeText(q.text)));
  let category: Category;
  if (uncovered.length > 0) {
    category = uncovered[0] as Category;
  } else {
    const counts = new Map<Category, number>(CATEGORIES.map((c) => [c, 0]));
    for (const q of qa) counts.set(q.category, (counts.get(q.category) ?? 0) + 1);
    category = [...CATEGORIES].sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0))[0] as Category;
  }
  const modelText = d.text && d.category === category && d.text.length <= 220 && !used.has(normalizeText(d.text)) ? d.text : null;
  if (modelText) return { category, text: modelText };
  const options = FALLBACK_QUESTIONS[category];
  const text = options.find((t) => !used.has(normalizeText(t))) ?? options[1];
  return { category, text };
}

export interface AnswerInput {
  questionId: string;
  answer?: string;
  skipped?: boolean;
}

export interface AnswerResult {
  qa: QaEntry[];
  assumptions: Assumption[];
  skippedCount: number;
  changed: boolean;
  entry: QaEntry | undefined;
}

/** Idempotent per questionId: an already-answered question is returned unchanged. */
export function applyAnswer(qa: QaEntry[], assumptions: Assumption[], skippedCount: number, input: AnswerInput): AnswerResult {
  const entry = qa.find((q) => q.id === input.questionId);
  if (!entry) return { qa, assumptions, skippedCount, changed: false, entry: undefined };
  if (entry.answer !== null || entry.skipped) return { qa, assumptions, skippedCount, changed: false, entry };
  const next = qa.map((q) =>
    q.id === entry.id ? { ...q, answer: input.skipped ? null : (input.answer ?? '').trim(), skipped: !!input.skipped } : q,
  );
  let nextAssumptions = assumptions;
  let nextSkipped = skippedCount;
  if (input.skipped) {
    nextSkipped = skippedCount + 1;
    nextAssumptions = [
      ...assumptions,
      {
        id: randomUUID(),
        category: entry.category,
        risk: 'medium',
        text: `Unanswered: ${entry.text}`.slice(0, 240),
        source: 'skipped',
        questionId: entry.id,
      },
    ];
  }
  return { qa: next, assumptions: nextAssumptions, skippedCount: nextSkipped, changed: true, entry: next.find((q) => q.id === entry.id) };
}

/** The question to assess is always the LAST one: it must be answered (not skipped) and not yet assessed. */
export function lastUnassessed(qa: QaEntry[]): QaEntry | undefined {
  const q = qa[qa.length - 1];
  return q && q.answer !== null && !q.skipped && q.assessment === null ? q : undefined;
}

/** Attach the assessment to its question; high/medium become assumptions, low is dropped. */
export function applyAssessment(
  qa: QaEntry[],
  assumptions: Assumption[],
  assessment: Assessment | null,
): { qa: QaEntry[]; assumptions: Assumption[] } {
  const target = lastUnassessed(qa);
  if (!assessment || !target) return { qa, assumptions };
  const nextQa = qa.map((q) => (q.id === target.id ? { ...q, assessment } : q));
  if (assessment.risk === 'low') return { qa: nextQa, assumptions };
  return {
    qa: nextQa,
    assumptions: [
      ...assumptions,
      { id: randomUUID(), category: assessment.category, risk: assessment.risk, text: assessment.assumption, source: 'assessment', questionId: target.id },
    ],
  };
}

export interface RawStruggle {
  title: string;
  category: Category;
  questionId: string;
  why: string;
}

/** Excerpt is taken by the SERVER from the stored answer (verbatim, <=200 chars), never by the model. */
export function attachExcerpts<T extends { questionId: string }>(struggles: T[], qa: QaEntry[]): (T & { answerExcerpt: string })[] {
  return struggles.map((s) => {
    const q = qa.find((x) => x.id === s.questionId);
    const excerpt = !q || q.skipped || q.answer === null ? 'skipped' : q.answer.slice(0, 200);
    return { ...s, answerExcerpt: excerpt };
  });
}

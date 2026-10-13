import { randomUUID } from 'node:crypto';
import { db, getDb } from '../../lib/db';
import { toSessionRow } from '../../lib/rows';
import { AppError, conflict, notFound } from '../../lib/errors';
import { wrapUserData } from '../../lib/prompt-safety';
import { generateJson } from '../ai/generateJson';
import { getFastPool, getVerdictPool } from '../ai/pools';
import { getSearch, hostOf, type SearchResult } from '../search';
import { CATEGORIES, MAX_QUESTIONS, MIN_QUESTIONS, type Category, type ModeKey } from './constants';
import {
  applyAnswer,
  applyAssessment,
  attachExcerpts,
  checkDecision,
  extensionChoices,
  forceDecision,
  pendingQuestion,
  skippedByCategory,
  uncoveredCategories,
  type AnswerInput,
  type NextDecision,
} from './logic';
import { competitorsSystem, extensionSystem, extensionUser, finalAssessmentSystem, nextSystem, nextUser, questionPlanSystem, understandingSystem, verdictSystem, verdictUser } from './prompts';
import { competitorsSchema, finalAssessmentSchema, makeExtensionDecisionSchema, makeVerdictSchema, nextStepSchema, parseQuestionRef, questionPlanSchema, understandingSchema } from './schemas';
import { applySkipPenalty, computeTotal, isLowConfidence, snapHalf, verdictFor, type ScoreMap } from './scoring';
import { loadOwnedSession, sessionToDto, updateSession } from './sessions';
import type { Competitor, QaEntry, SessionRow, TrialExtension, Understanding } from './types';

const progressOf = (s: SessionRow) => ({ asked: s.qa.length, plannedTotal: s.planned_total ?? Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, s.qa.length)) });

// ---------------------------------------------------------------- create
export async function createTrial(userId: string, input: { idea: string; mode: ModeKey }) {
  const u = await generateJson(understandingSchema, {
    system: understandingSystem(input.mode),
    user: `Idea to analyse:\n${wrapUserData('idea', input.idea)}`,
    pool: getFastPool(),
    route: 'trial.create',
    maxTokens: 700,
  });
  const understanding: Understanding = {
    problem: u.problem,
    targetUsers: u.targetUsers,
    proposedSolution: u.proposedSolution,
    searchQueries: u.searchQueries,
  };
  const created = await db(
    getDb().session.create({ data: { userId, kind: 'trial', title: u.title, mode: input.mode, ideaText: input.idea, understanding: understanding as never } }),
    'trial insert',
  );
  const row = toSessionRow(created);
  return { id: row.id, title: row.title, mode: row.mode, understanding: { problem: u.problem, targetUsers: u.targetUsers, proposedSolution: u.proposedSolution } };
}

export async function patchUnderstanding(
  userId: string,
  id: string,
  patch: { problem?: string; targetUsers?: string; proposedSolution?: string; title?: string },
) {
  for (let i = 0; i < 3; i++) {
    const s = await loadOwnedSession(userId, id, 'trial');
    if (s.status === 'complete') throw conflict('TRIAL_COMPLETE', 'This trial is already complete');
    const current = (s.understanding ?? {}) as Understanding;
    const understanding = {
      ...current,
      ...(patch.problem !== undefined ? { problem: patch.problem } : {}),
      ...(patch.targetUsers !== undefined ? { targetUsers: patch.targetUsers } : {}),
      ...(patch.proposedSolution !== undefined ? { proposedSolution: patch.proposedSolution } : {}),
    };
    const updated = await updateSession(s.id, s.version, { understanding, ...(patch.title !== undefined ? { title: patch.title } : {}) });
    if (updated) return { id: updated.id, title: updated.title, understanding: { problem: understanding.problem, targetUsers: understanding.targetUsers, proposedSolution: understanding.proposedSolution } };
  }
  throw conflict('CONFLICT', 'Please retry');
}

// ---------------------------------------------------------------- competitors
function resolveUrl(url: string | null | undefined, results: SearchResult[]): string | null {
  if (!url) return null;
  const norm = (u: string) => u.trim().replace(/\/+$/, '').toLowerCase();
  const exact = results.find((r) => norm(r.url) === norm(url));
  if (exact) return exact.url;
  const host = hostOf(url);
  return results.find((r) => hostOf(r.url) === host)?.url ?? null;
}

export async function researchCompetitors(s: SessionRow): Promise<Competitor[]> {
  const u = (s.understanding ?? {}) as Understanding;
  const queries = (u.searchQueries && u.searchQueries.length > 0 ? u.searchQueries : [`${s.title} alternatives`]).slice(0, 3);

  const results: SearchResult[] = [];
  const seen = new Set<string>();
  for (const q of queries) {
    try {
      for (const r of await getSearch().search(q, { max: 3 })) {
        const h = hostOf(r.url);
        if (seen.has(h)) continue;
        seen.add(h);
        results.push(r);
      }
    } catch {
      /* one failed query must not stop the rest */
    }
  }

  const fromSearch = results.length > 0;
  const body = fromSearch
    ? wrapUserData('search_results', results.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`).join('\n\n'))
    : '';
  const ai = await generateJson(competitorsSchema, {
    system: competitorsSystem(fromSearch),
    user: [
      `Idea:\n${wrapUserData('idea', `Problem: ${u.problem}\nSolution: ${u.proposedSolution}\nTarget users: ${u.targetUsers}`)}`,
      body,
    ]
      .filter(Boolean)
      .join('\n\n'),
    pool: getFastPool(),
    route: 'trial.competitors',
    maxTokens: 1200,
  });

  const names = new Set<string>();
  const out: Competitor[] = [];
  for (const c of ai.competitors) {
    const key = c.name.toLowerCase();
    if (names.has(key)) continue;
    names.add(key);
    out.push({
      name: c.name,
      url: fromSearch ? resolveUrl(c.url, results) : null, // never trust model-invented URLs
      whatTheyDo: c.whatTheyDo,
      whyItMatters: c.whyItMatters,
      source: fromSearch ? 'search' : 'ai_estimate',
    });
    if (out.length >= 6) break;
  }
  return out;
}

// ---------------------------------------------------------------- next question
function questionResponse(s: SessionRow, q: QaEntry) {
  return {
    question: { id: q.id, index: q.index, category: q.category, text: q.text },
    progress: progressOf(s),
    ...(q.index === 1 ? { competitors: s.competitors ?? [] } : {}),
    assumptions: s.assumptions,
  };
}

const doneResponse = (s: SessionRow) => ({ done: true as const, progress: progressOf(s), assumptions: s.assumptions });

const extensionResponse = (s: SessionRow) => ({
  extension: s.extension as TrialExtension & { status: 'offered' },
  progress: progressOf(s),
  assumptions: s.assumptions,
});

async function ensurePlannedTotal(userId: string, id: string, s: SessionRow): Promise<SessionRow> {
  if (s.planned_total !== null) return s;
  let plannedTotal: number;
  if (s.qa.length > 0) {
    plannedTotal = Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, s.qa.length));
  } else {
    const mode = (s.mode ?? 'stress_test') as ModeKey;
    const plan = await generateJson(questionPlanSchema, {
      system: questionPlanSystem(mode),
      user: [
        `Idea:\n${wrapUserData('idea', s.idea_text ?? '')}`,
        `Competitor research:\n${wrapUserData('competitors', JSON.stringify(s.competitors ?? []))}`,
        `Understanding:\n${wrapUserData('understanding', JSON.stringify(s.understanding ?? {}))}`,
      ].join('\n\n'),
      pool: getFastPool(),
      route: 'trial.plan',
      maxTokens: 120,
      temperature: 0.2,
    });
    plannedTotal = plan.plannedTotal;
  }
  const updated = await updateSession(s.id, s.version, { planned_total: plannedTotal });
  if (updated) return updated;
  const fresh = await loadOwnedSession(userId, id, 'trial');
  if (fresh.planned_total !== null) return fresh;
  throw conflict('CONFLICT', 'Another request changed this trial. Please retry.');
}

export async function nextQuestion(userId: string, id: string) {
  let s = await loadOwnedSession(userId, id, 'trial');
  if (s.status === 'complete') return doneResponse(s);
  if (s.extension?.status === 'offered') return extensionResponse(s);
  if (s.interrogation_done) return doneResponse(s);

  if (s.competitors === null) {
    const competitors = await researchCompetitors(s);
    const saved = await updateSession(s.id, s.version, { competitors });
    s = saved ?? (await loadOwnedSession(userId, id, 'trial'));
    if (s.competitors === null) throw conflict('CONFLICT', 'Please retry');
  }

  s = await ensurePlannedTotal(userId, id, s);
  const pending = pendingQuestion(s.qa);
  if (pending) return questionResponse(s, pending);

  const asked = s.qa.length;
  const mode = (s.mode ?? 'stress_test') as ModeKey;
  const understanding = (s.understanding ?? {}) as Understanding;
  const plannedTotal = s.planned_total as number;

  if (asked >= plannedTotal) {
    const allowed = s.extension?.status === 'accepted' ? [] : extensionChoices(plannedTotal);
    let assessment;
    let additionalQuestions: 2 | 3 | null = null;
    let reason = '';
    const user = extensionUser({ understanding, competitors: s.competitors, qa: s.qa, skippedCount: s.skipped_count, plannedTotal, allowed });
    if (allowed.length === 0) {
      const final = await generateJson(finalAssessmentSchema, {
        system: finalAssessmentSystem(mode),
        user,
        pool: getFastPool(),
        route: 'trial.assessment.final',
        maxTokens: 300,
        temperature: 0.2,
      });
      assessment = final.assessment;
    } else {
      const decision = await generateJson(makeExtensionDecisionSchema(allowed), {
        system: extensionSystem(mode, allowed),
        user,
        pool: getFastPool(),
        route: 'trial.extend.decision',
        maxTokens: 500,
        temperature: 0.2,
      });
      assessment = decision.assessment;
      if (decision.needMore) {
        additionalQuestions = decision.additionalQuestions as 2 | 3;
        reason = decision.reason;
      }
    }
    const assessed = applyAssessment(s.qa, s.assumptions, assessment);
    const offered: TrialExtension | null = additionalQuestions !== null
      ? { status: 'offered', additionalQuestions, reason }
      : s.extension;
    const updated = await updateSession(s.id, s.version, {
      qa: assessed.qa,
      assumptions: assessed.assumptions,
      ...(additionalQuestions !== null ? { extension: offered } : { interrogation_done: true }),
    });
    if (updated) return additionalQuestions !== null ? extensionResponse(updated) : doneResponse(updated);
    const fresh = await loadOwnedSession(userId, id, 'trial');
    if (fresh.extension?.status === 'offered') return extensionResponse(fresh);
    if (fresh.interrogation_done) return doneResponse(fresh);
    throw conflict('CONFLICT', 'Another request changed this trial. Please retry.');
  }

  const call = (correction?: string) =>
    generateJson(nextStepSchema, {
      system: nextSystem(mode, plannedTotal),
      user: nextUser({
        understanding,
        competitors: s.competitors,
        qa: s.qa,
        uncovered: uncoveredCategories(s.qa),
        skippedCount: s.skipped_count,
        plannedTotal,
        correction,
      }),
      pool: getFastPool(),
      route: 'trial.next',
      maxTokens: 700,
    });

  const first = await call();
  let assessment = first.assessment;
  let decision: NextDecision = first.next;

  const violation = checkDecision(decision, s.qa, plannedTotal);
  if (violation) {
    const retry = await call(violation); // one correction attempt
    assessment = retry.assessment ?? assessment;
    decision = retry.next;
    if (checkDecision(decision, s.qa, plannedTotal)) {
      const forced = forceDecision(decision, s.qa);
      decision = { done: false, category: forced.category, text: forced.text };
    }
  }

  const applied = applyAssessment(s.qa, s.assumptions, assessment);
  let qa = applied.qa;
  let created: QaEntry | undefined;
  if (!decision.done) {
    created = { id: randomUUID(), index: asked + 1, category: decision.category as Category, text: (decision.text as string).trim(), answer: null, skipped: false, assessment: null };
    qa = [...qa, created];
  }
  const updated = await updateSession(s.id, s.version, {
    qa,
    assumptions: applied.assumptions,
    ...(decision.done ? { interrogation_done: true } : {}),
  });
  if (!updated) {
    const fresh = await loadOwnedSession(userId, id, 'trial');
    const p = pendingQuestion(fresh.qa);
    if (p) return questionResponse(fresh, p);
    if (fresh.interrogation_done) return doneResponse(fresh);
    throw conflict('CONFLICT', 'Another request changed this trial. Please retry.');
  }
  return created ? questionResponse(updated, created) : doneResponse(updated);
}

export async function resolveExtension(userId: string, id: string, action: 'continue' | 'verdict') {
  for (let attempt = 0; attempt < 3; attempt++) {
    const s = await loadOwnedSession(userId, id, 'trial');
    if (s.status === 'complete') throw conflict('TRIAL_COMPLETE', 'This trial is already complete');
    if (action === 'continue' && s.extension?.status === 'accepted') return { progress: progressOf(s), extension: s.extension };
    if (action === 'verdict' && s.extension?.status === 'declined') return { done: true as const, progress: progressOf(s), extension: s.extension, lowerConfidence: true as const };
    if (s.extension?.status !== 'offered' || pendingQuestion(s.qa) || s.qa.length < (s.planned_total ?? MAX_QUESTIONS)) {
      throw conflict('EXTENSION_NOT_READY', 'There is no pending extension decision');
    }
    if (action === 'continue') {
      const plannedTotal = (s.planned_total as number) + s.extension.additionalQuestions;
      if (plannedTotal > MAX_QUESTIONS) throw conflict('EXTENSION_LIMIT', 'The question limit has been reached');
      const extension = { ...s.extension, status: 'accepted' as const };
      const updated = await updateSession(s.id, s.version, { planned_total: plannedTotal, extension });
      if (updated) return { progress: progressOf(updated), extension: updated.extension as TrialExtension };
    } else {
      const extension = { ...s.extension, status: 'declined' as const };
      const updated = await updateSession(s.id, s.version, { extension, interrogation_done: true });
      if (updated) return { done: true as const, progress: progressOf(updated), extension: updated.extension as TrialExtension, lowerConfidence: true as const };
    }
  }
  throw conflict('CONFLICT', 'Another request changed this trial. Please retry.');
}

// ---------------------------------------------------------------- answer
export async function answerQuestion(userId: string, id: string, input: AnswerInput) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const s = await loadOwnedSession(userId, id, 'trial');
    if (s.status === 'complete') throw conflict('TRIAL_COMPLETE', 'This trial is already complete');
    const result = applyAnswer(s.qa, s.assumptions, s.skipped_count, input);
    if (!result.entry) throw notFound('Question not found', 'QUESTION_NOT_FOUND');
    if (!result.changed) {
      return { ok: true, alreadyAnswered: true, questionId: input.questionId, skippedCount: s.skipped_count, progress: progressOf(s), assumptions: s.assumptions };
    }
    const updated = await updateSession(s.id, s.version, { qa: result.qa, assumptions: result.assumptions, skipped_count: result.skippedCount });
    if (updated) {
      return { ok: true, alreadyAnswered: false, questionId: input.questionId, skippedCount: updated.skipped_count, progress: progressOf(updated), assumptions: updated.assumptions };
    }
  }
  throw conflict('CONFLICT', 'Another request changed this trial. Please retry.');
}

// ---------------------------------------------------------------- verdict
export function verdictResponse(s: SessionRow) {
  return {
    sessionId: s.id,
    title: s.title,
    mode: s.mode,
    totalScore: s.total_score,
    verdict: s.verdict,
    scores: s.scores,
    ...(s.verdict_payload ?? {}),
  };
}

export async function generateVerdict(userId: string, id: string) {
  const s = await loadOwnedSession(userId, id, 'trial');
  if (s.status === 'complete' && s.verdict_payload) return verdictResponse(s);
  if (pendingQuestion(s.qa)) throw conflict('QUESTION_PENDING', 'Answer or skip the open question first');
  if (!s.interrogation_done) throw conflict('NOT_READY', 'Finish the interrogation before asking for the verdict');

  const mode = (s.mode ?? 'stress_test') as ModeKey;
  const ai = await generateJson(makeVerdictSchema(s.qa.length), {
    system: verdictSystem(mode),
    user: verdictUser({ understanding: (s.understanding ?? {}) as Understanding, competitors: s.competitors, qa: s.qa, skippedCount: s.skipped_count }),
    pool: getVerdictPool(),
    route: 'trial.verdict',
    maxTokens: 2600,
    temperature: 0.3,
  });

  // The server, not the model, decides the numbers.
  const aiScores = Object.fromEntries(CATEGORIES.map((c) => [c, snapHalf(ai.categoryScores[c].score)])) as ScoreMap;
  const skipped = skippedByCategory(s.qa);
  const finalScores = applySkipPenalty(aiScores, skipped);
  const total = computeTotal(finalScores);
  const verdict = verdictFor(total);

  const categoryScores = Object.fromEntries(
    CATEGORIES.map((c) => [c, { score: aiScores[c], penalty: aiScores[c] - finalScores[c], finalScore: finalScores[c], rationale: ai.categoryScores[c].rationale }]),
  );
  const mapped = ai.struggles.map((st) => {
    const idx = parseQuestionRef(st.questionId, s.qa.length) as number;
    const q = s.qa[idx - 1] as QaEntry;
    return { title: st.title, category: st.category, why: st.why, questionId: q.id, questionIndex: q.index, questionText: q.text };
  });
  const struggles = attachExcerpts(mapped, s.qa);

  const payload = {
    categoryScores,
    struggles,
    fixes: ai.fixes,
    alternatives: ai.alternatives,
    validationExperiment: ai.validationExperiment,
    summary: ai.summary,
    lowConfidence: isLowConfidence(s.skipped_count, s.extension?.status === 'declined'),
    skippedCount: s.skipped_count,
  };
  const updated = await updateSession(s.id, s.version, {
    scores: finalScores,
    total_score: total,
    verdict,
    verdict_payload: payload,
    status: 'complete',
  });
  if (!updated) {
    const fresh = await loadOwnedSession(userId, id, 'trial');
    if (fresh.status === 'complete' && fresh.verdict_payload) return verdictResponse(fresh);
    throw conflict('CONFLICT', 'Another request changed this trial. Please retry.');
  }
  return verdictResponse(updated);
}


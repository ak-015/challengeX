import { db, getDb } from '../../lib/db';
import { isoStr } from '../../lib/rows';
import { conflict, forbidden, notFound } from '../../lib/errors';
import { wrapUserData } from '../../lib/prompt-safety';
import { generateJson } from '../ai/generateJson';
import { getVerdictPool } from '../ai/pools';
import { DECISION_FIELDS, type DecisionField, type Graph } from './graphValidator';
import { roadmapSystem } from './prompts';
import { makeGraphSchema } from './schemas';
import { loadOwnedSession } from './sessions';
import type { SessionRow } from './types';

interface RoadmapInput {
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

function undecidedFields(input: RoadmapInput): DecisionField[] {
  return DECISION_FIELDS.filter((f) => !input[f]?.trim());
}

function verdictContext(s: SessionRow): string {
  const p = (s.verdict_payload ?? {}) as {
    struggles?: { title: string; why: string; answerExcerpt: string }[];
    fixes?: { struggleIndex: number; action: string }[];
    validationExperiment?: { description: string; metric: string };
  };
  const struggles = (p.struggles ?? []).map((st, i) => `${i}. ${st.title}: ${st.why} (user said: ${st.answerExcerpt})`).join('\n');
  const fixes = (p.fixes ?? []).map((f) => `- for #${f.struggleIndex}: ${f.action}`).join('\n');
  const exp = p.validationExperiment ? `Experiment: ${p.validationExperiment.description} (metric: ${p.validationExperiment.metric})` : '';
  return `Verdict: ${s.verdict} (${s.total_score}/100)\nStruggles:\n${struggles}\nFixes:\n${fixes}\n${exp}`;
}

export async function generateRoadmap(userId: string, input: RoadmapInput) {
  let ideaText = input.ideaText?.trim() ?? '';
  let title = '';
  let context = '';
  let trialId: string | null = null;

  if (input.trialId) {
    const t = await loadOwnedSession(userId, input.trialId, 'trial');
    if (t.status !== 'complete' || !t.verdict) throw conflict('TRIAL_NOT_COMPLETE', 'Finish the trial verdict first');
    if (t.verdict === 'KILL') throw conflict('NOT_SURVIVING', 'Roadmaps are only generated for BUILD or PIVOT ideas');
    trialId = t.id;
    title = t.title;
    const u = (t.understanding ?? {}) as { problem?: string; targetUsers?: string; proposedSolution?: string };
    ideaText = `${u.proposedSolution ?? t.idea_text ?? ''}\nProblem: ${u.problem ?? ''}\nTarget users: ${u.targetUsers ?? ''}`;
    context = wrapUserData('verdict_context', verdictContext(t));
  } else {
    title = ideaText.slice(0, 60);
  }

  const undecided = undecidedFields(input);
  const field = (label: string, v: string | undefined) => `${label}: ${v?.trim() ? v.trim() : 'undecided'}`;
  const choices = [
    field('Tech stack', input.techStack),
    field('Marketing', input.marketing),
    field('Team', input.team),
    field('Timeline', input.timeline),
    field('Budget', input.budget),
    field('Platform', input.platform),
    input.extra ? `Extra: ${input.extra}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const graph = (await generateJson(makeGraphSchema(undecided), {
    system: roadmapSystem(undecided),
    user: [`Idea:\n${wrapUserData('idea', ideaText)}`, context, `User choices:\n${wrapUserData('choices', choices)}`].filter(Boolean).join('\n\n'),
    pool: getVerdictPool(),
    route: 'roadmap.generate',
    maxTokens: 3500,
    temperature: 0.2,
    timeoutMs: 60_000,
    budgetMs: 85_000,
  })) as unknown as Graph;

  const prisma = getDb();
  const roadmap = await db(
    prisma.roadmap.create({
      data: { userId, trialId, title, input: { ideaText, ...input, undecided } as never, graph: graph as never },
      select: { id: true, createdAt: true },
    }),
    'roadmap insert',
  );
  await db(
    prisma.session.create({
      data: {
        userId,
        kind: 'roadmap',
        title,
        ideaText: ideaText.slice(0, 2000),
        verdictPayload: { roadmapId: roadmap.id } as never,
        status: 'complete',
      },
    }),
    'roadmap session insert',
  );
  return { id: roadmap.id, title, trialId, graph, undecided, createdAt: isoStr(roadmap.createdAt) };
}

export async function getRoadmap(userId: string, id: string) {
  const row = await db(getDb().roadmap.findUnique({ where: { id } }), 'roadmap load');
  if (!row) throw notFound('Roadmap not found');
  if (row.userId !== userId) throw forbidden('You do not own this resource');
  return { id: row.id, title: row.title, trialId: row.trialId, input: row.input, graph: row.graph as unknown as Graph, createdAt: isoStr(row.createdAt) };
}

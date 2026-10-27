import { wrapUserData } from '../../lib/prompt-safety';
import { CATEGORIES, CATEGORY_HINTS, MAX_QUESTIONS, MIN_QUESTIONS, MODES, type ModeKey } from './constants';
import type { Competitor, QaEntry, Understanding } from './types';

const CATEGORY_LIST = CATEGORIES.map((c) => `${c} (${CATEGORY_HINTS[c]})`).join('; ');

function transcript(qa: QaEntry[]): string {
  if (qa.length === 0) return '(no questions asked yet)';
  return qa
    .map((q) => `Q${q.index} [${q.category}]: ${q.text}\nA${q.index}: ${q.skipped ? '(skipped by the user)' : (q.answer ?? '(not answered yet)')}`)
    .join('\n\n');
}

function understandingBlock(u: Partial<Understanding>): string {
  return wrapUserData(
    'idea_understanding',
    `Problem: ${u.problem ?? ''}\nTarget users: ${u.targetUsers ?? ''}\nProposed solution: ${u.proposedSolution ?? ''}`,
  );
}

function competitorsBlock(c: Competitor[] | null): string {
  if (!c || c.length === 0) return wrapUserData('competitors', '(none identified)');
  return wrapUserData('competitors', c.map((x) => `- ${x.name}: ${x.whatTheyDo.slice(0, 120)} | matters: ${x.whyItMatters.slice(0, 120)}`).join('\n'));
}

// ---------- understanding ----------
export const understandingSystem = (mode: ModeKey) =>
  `You analyse a startup idea for a skeptical interrogation tool (mode: ${MODES[mode].label}).
Restate the idea neutrally in three parts and propose 2-3 short web search queries that would surface REAL competitors or substitutes.
JSON shape: {"problem": string, "targetUsers": string, "proposedSolution": string, "title": string (max 60 chars), "searchQueries": [string, string, string?]}`;

// ---------- competitors ----------
export const competitorsSystem = (fromSearch: boolean) =>
  fromSearch
    ? `You identify real competitors or substitutes for an idea using ONLY the provided search results.
Rules: list 3-6 distinct products/companies; "url" must be copied EXACTLY from a search result or be null; never invent URLs; whyItMatters explains why this rival matters to THIS idea.
JSON shape: {"competitors": [{"name": string, "url": string|null, "whatTheyDo": string, "whyItMatters": string}]}`
    : `No web search results are available. From your own general knowledge, list 3-5 well-known competitors or substitutes for the idea. Do NOT provide URLs (use null). Be honest if unsure; prefer fewer, better-known entries.
JSON shape: {"competitors": [{"name": string, "url": null, "whatTheyDo": string, "whyItMatters": string}]}`;

// ---------- next question ----------
export function questionPlanSystem(mode: ModeKey): string {
  return `You plan a skeptical startup interrogation (mode: ${MODES[mode].label}: ${MODES[mode].directive}).
After considering the idea, choose the exact total number of questions needed, from ${MIN_QUESTIONS} to ${MAX_QUESTIONS} inclusive. The server ensures all seven categories are covered and enforces this total. Do not score the idea or choose a verdict.
JSON shape: {"plannedTotal": integer}`;
}

export function nextSystem(mode: ModeKey, plannedTotal: number): string {
  return `You are CHALLENGE, a skeptical startup interrogator. You question an idea ONE hard question at a time across exactly these 7 risk categories: ${CATEGORY_LIST}.
Mode - ${MODES[mode].label}: ${MODES[mode].directive}
Rules:
- Each question is a concrete scenario (for example "What if farmers have no internet to upload images?"), at most 220 characters, adapts to the user's previous answer, and never repeats an earlier question.
- Every category must be asked at least once before you finish. While categories remain uncovered you must choose one of them.
- Ask exactly ${plannedTotal} questions before finishing. Every category must be covered by the first ${MIN_QUESTIONS}. Never ask more than the planned total in this round; the server decides whether to offer an extension. Hard maximum ${MAX_QUESTIONS} questions.
- "assessment" judges ONLY the most recent answer: the hidden assumption or risk it reveals (category, risk high|medium|low, assumption max 120 chars). Use null when there is no answer yet or it was skipped.
JSON shape: {"assessment": {"category": string, "risk": "high"|"medium"|"low", "assumption": string} | null, "next": {"done": boolean, "category": string, "text": string}}
When done is true, category and text may be null. Categories are exactly: ${CATEGORIES.join(', ')}.`;
}

export function nextUser(args: {
  understanding: Partial<Understanding>;
  competitors: Competitor[] | null;
  qa: QaEntry[];
  uncovered: string[];
  skippedCount: number;
  plannedTotal: number;
  correction?: string;
}): string {
  const parts = [
    understandingBlock(args.understanding),
    competitorsBlock(args.competitors),
    wrapUserData('transcript', transcript(args.qa)),
    `Questions asked so far: ${args.qa.length} of planned total ${args.plannedTotal}. Skipped so far: ${args.skippedCount}.`,
    `Uncovered categories: ${args.uncovered.length ? args.uncovered.join(', ') : 'none'}.`,
    args.qa.length === 0 ? 'No answer exists yet: set assessment to null and ask the first question.' : 'Assess the most recent answer, then decide the next question.',
  ];
  if (args.correction) parts.push(`[Server correction - your previous decision was invalid: ${args.correction}]`);
  return parts.join('\n\n');
}

export function extensionSystem(mode: ModeKey, allowed: readonly (2 | 3)[]): string {
  return `You are CHALLENGE deciding whether an idea needs a short follow-up round after its planned interrogation (mode: ${MODES[mode].label}: ${MODES[mode].directive}).
The user completed the planned questions. Decide whether exactly 2 or 3 more questions would materially improve understanding. Allowed counts: ${allowed.length ? allowed.join(' or ') : 'none; the maximum question limit prevents an extension'}.
If more questions are needed, give a concise, specific reason, choose one allowed count, and make no score or verdict. If not, set needMore=false, additionalQuestions=null. Also assess only the most recent answer; use null when it was skipped.
JSON shape: {"assessment":{"category":string,"risk":"high"|"medium"|"low","assumption":string}|null,"needMore":boolean,"additionalQuestions":2|3|null,"reason":string}`;
}

export function finalAssessmentSystem(mode: ModeKey): string {
  return `You are CHALLENGE completing the final assessment in ${MODES[mode].label} mode. Assess only the user's most recent answer and identify its hidden assumption or risk. Use null if the answer was skipped. Do not ask for more questions, assign scores, or choose a verdict.
JSON shape: {"assessment":{"category":string,"risk":"high"|"medium"|"low","assumption":string}|null}`;
}

export function extensionUser(args: {
  understanding: Partial<Understanding>;
  competitors: Competitor[] | null;
  qa: QaEntry[];
  skippedCount: number;
  plannedTotal: number;
  allowed: readonly (2 | 3)[];
}): string {
  return [
    understandingBlock(args.understanding),
    competitorsBlock(args.competitors),
    wrapUserData('transcript', transcript(args.qa)),
    `The planned total of ${args.plannedTotal} questions is complete. Skipped: ${args.skippedCount}. Additional questions allowed: ${args.allowed.join(', ') || 'none'}.`,
    'Consider whether important uncertainty remains that would change a fair assessment. Do not decide the score or verdict.',
  ].join('\n\n');
}

// ---------- verdict ----------
export function verdictSystem(mode: ModeKey): string {
  return `You are CHALLENGE delivering the final verdict on an idea after an interrogation (mode: ${MODES[mode].label}: ${MODES[mode].directive}).
Score each of the 7 categories from 0 to 10 in 0.5 steps, judging ONLY from the idea, the competitors and the user's answers. Do NOT output a total score or a verdict; the server computes those.
Rules:
- struggles: 3-5 places the user will struggle, each tied to ONE of the user's own answers via "questionId" (use the Q-number such as "Q3"). Explain why in plain language.
- fixes: exactly one per struggle, "struggleIndex" is the 0-based index into struggles, a concrete action max 300 chars and effort low|medium|high.
- alternatives: 2-3 genuinely different directions: {"title","pitch","whatChanges"}.
- validationExperiment: the CHEAPEST experiment that would prove or kill the idea: {"description","metric","sampleSize","durationDays" (integer),"buildIf","pivotIf","killIf"}.
- summary: 2-4 sentences, honest, no flattery.
JSON shape: {"categoryScores": {"technical": {"score": number, "rationale": string}, "market": {...}, "social": {...}, "financial": {...}, "legal": {...}, "scalability": {...}, "competition": {...}}, "struggles": [{"title","category","questionId","why"}], "fixes": [{"struggleIndex","action","effort"}], "alternatives": [...], "validationExperiment": {...}, "summary": string}`;
}

export function verdictUser(args: {
  understanding: Partial<Understanding>;
  competitors: Competitor[] | null;
  qa: QaEntry[];
  skippedCount: number;
}): string {
  return [
    understandingBlock(args.understanding),
    competitorsBlock(args.competitors),
    wrapUserData('transcript', transcript(args.qa)),
    `Total questions: ${args.qa.length}. Skipped: ${args.skippedCount}.`,
  ].join('\n\n');
}

// ---------- ideas ----------
export const ideasSystem = `You suggest startup/project ideas tailored to a person's background. Produce exactly 3 distinct ideas that fit their skills, interests, constraints and goal.
JSON shape: {"ideas": [{"title","oneLiner","problem","targetUsers","whyYouFit","firstStep","mainRisk"}]}
Be specific and realistic for the stated team size, hours and budget. Include an honest main risk for each idea.`;

// ---------- roadmap ----------
export function roadmapSystem(undecided: string[]): string {
  return `You design a build roadmap as a FREE-FORM DIRECTED GRAPH (not a straight list) for a validated idea.
Stages (all six must appear): validate, spec, design, blueprint, prototype, launch.
JSON shape: {"nodes": [{"id","stage","type":"step"|"decision"|"milestone","title" (max 50),"description" (max 140),"durationEstimate" (e.g. "3 days"),"deliverables" (max 2 short strings),"difficulty":"low"|"medium"|"high","difficultyNote"?,"betterPath"?,"decisionField"?}], "edges": [{"from","to","kind":"recommended"|"alternate"|"normal","label"?}]}
Hard rules:
- 12 to 26 nodes with unique short ids (n1, n2, ...). No coordinates.
- Use 12 to 15 nodes unless the idea genuinely needs more. Be terse: one sentence per description, at most 2 deliverables per node. Output compact JSON with no extra whitespace.
- Acyclic. Exactly ONE start node (no incoming edges) and at least one end node (no outgoing edges). Every node reachable from the start.
- Every "decision" node has EXACTLY ONE outgoing "recommended" edge and at least one outgoing "alternate" edge.
- Undecided fields: ${undecided.length ? undecided.join(', ') : '(none)'}. For EACH undecided field add a decision node whose "decisionField" is that field, with a recommended and an alternate option.
- Any node with difficulty "high" that lies on the recommended/normal path must include "difficultyNote" (why it is hard for this user) and "betterPath": the id of an alternate node that is the target of an "alternate" edge coming from that node or from its direct predecessor.
- Honour the user's already-chosen options as fixed; do not add decisions for them.`;
}

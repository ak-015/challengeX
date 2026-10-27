import { z } from 'zod';
import { CATEGORIES, MAX_QUESTIONS, MIN_QUESTIONS } from './constants';
import { DECISION_FIELDS, STAGES, validateGraph, type DecisionField, type Graph } from './graphValidator';

type AnyZ = z.ZodTypeAny;

/** Lower-cases/trims strings before enum validation (models love "High", "Medium "). */
const lc = <T extends AnyZ>(schema: T) => z.preprocess((v) => (typeof v === 'string' ? v.trim().toLowerCase() : v), schema);

/** Non-empty string clipped to max chars (validation + normalisation, avoids needless retries). */
const clip = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((s) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s));

const categorySchema = lc(z.enum(CATEGORIES));
const riskSchema = lc(z.enum(['high', 'medium', 'low']));
const levelSchema = lc(z.enum(['low', 'medium', 'high']));

// ---------- trial creation ----------
export const understandingSchema = z.object({
  problem: clip(400),
  targetUsers: clip(300),
  proposedSolution: clip(400),
  title: clip(60),
  searchQueries: z
    .array(z.string().trim().min(2).max(120))
    .min(2)
    .transform((a) => a.slice(0, 3)),
});

// ---------- competitors ----------
export const competitorsSchema = z.object({
  competitors: z
    .array(
      z.object({
        name: clip(80),
        url: z.string().trim().nullable().optional(),
        whatTheyDo: clip(220),
        whyItMatters: clip(220),
      }),
    )
    .max(10),
});

// ---------- next question ----------
export const questionPlanSchema = z.object({ plannedTotal: z.number().int().min(MIN_QUESTIONS).max(MAX_QUESTIONS) });

const assessmentSchema = z
  .object({ category: categorySchema, risk: riskSchema, assumption: clip(120) })
  .nullable()
  .optional()
  .transform((v) => v ?? null);

export const finalAssessmentSchema = z.object({ assessment: assessmentSchema });

export const nextStepSchema = z
  .object({
    assessment: assessmentSchema,
    next: z.object({
      done: z.boolean(),
      category: categorySchema.nullable().optional(),
      text: z.string().trim().max(600).nullable().optional(),
    }),
  })
  .superRefine((v, ctx) => {
    if (!v.next.done && (!v.next.category || !v.next.text)) {
      ctx.addIssue({ code: 'custom', path: ['next'], message: 'when done is false, category and text are required' });
    }
  });

export function makeExtensionDecisionSchema(allowed: readonly (2 | 3)[]) {
  return z
    .object({
      assessment: assessmentSchema,
      needMore: z.boolean(),
      additionalQuestions: z.number().int().nullable(),
      reason: z.string().trim().max(220),
    })
    .superRefine((value, ctx) => {
      if (value.needMore && (!allowed.includes(value.additionalQuestions as 2 | 3) || !value.reason)) {
        ctx.addIssue({ code: 'custom', path: ['additionalQuestions'], message: 'choose an allowed extension count and explain why' });
      }
      if (!value.needMore && value.additionalQuestions !== null) {
        ctx.addIssue({ code: 'custom', path: ['additionalQuestions'], message: 'additionalQuestions must be null when needMore is false' });
      }
    });
}

// ---------- verdict ----------
const catScore = z.object({ score: z.number().min(0).max(10), rationale: clip(160) });
const questionRef = z.preprocess((v) => (typeof v === 'number' ? `Q${v}` : v), z.string().trim());

export function parseQuestionRef(ref: string, count: number): number | null {
  const m = /^q?(\d{1,2})$/i.exec(ref.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= count ? n : null;
}

export function makeVerdictSchema(questionCount: number) {
  return z
    .object({
      categoryScores: z.object({
        technical: catScore,
        market: catScore,
        social: catScore,
        financial: catScore,
        legal: catScore,
        scalability: catScore,
        competition: catScore,
      }),
      struggles: z
        .array(z.object({ title: clip(100), category: categorySchema, questionId: questionRef, why: clip(400) }))
        .min(3)
        .max(5),
      fixes: z.array(z.object({ struggleIndex: z.number().int().min(0), action: clip(300), effort: levelSchema })).min(3).max(5),
      alternatives: z.array(z.object({ title: clip(80), pitch: clip(240), whatChanges: clip(240) })).min(2).max(3),
      validationExperiment: z.object({
        description: clip(400),
        metric: clip(160),
        sampleSize: z.preprocess((v) => (typeof v === 'number' ? String(v) : v), clip(80)),
        durationDays: z.number().int().min(1).max(120),
        buildIf: clip(200),
        pivotIf: clip(200),
        killIf: clip(200),
      }),
      summary: clip(600),
    })
    .superRefine((v, ctx) => {
      v.struggles.forEach((s, i) => {
        if (parseQuestionRef(s.questionId, questionCount) === null) {
          ctx.addIssue({ code: 'custom', path: ['struggles', i, 'questionId'], message: `questionId must look like Q1..Q${questionCount}` });
        }
      });
      if (v.fixes.length !== v.struggles.length) {
        ctx.addIssue({ code: 'custom', path: ['fixes'], message: 'provide exactly one fix per struggle' });
      }
      const covered = new Set(v.fixes.map((f) => f.struggleIndex));
      for (let i = 0; i < v.struggles.length; i++) {
        if (!covered.has(i)) ctx.addIssue({ code: 'custom', path: ['fixes'], message: `no fix with struggleIndex ${i}` });
      }
    });
}

// ---------- ideas ----------
export const ideasAiSchema = z
  .object({
    ideas: z
      .array(
        z.object({
          title: clip(80),
          oneLiner: clip(160),
          problem: clip(300),
          targetUsers: clip(200),
          whyYouFit: clip(300),
          firstStep: clip(240),
          mainRisk: clip(240),
        }),
      )
      .length(3),
  })
  .superRefine((v, ctx) => {
    const titles = v.ideas.map((i) => i.title.toLowerCase());
    if (new Set(titles).size !== titles.length) ctx.addIssue({ code: 'custom', path: ['ideas'], message: 'the 3 ideas must be distinct' });
  });

// ---------- roadmap graph ----------
const nodeSchema = z.object({
  id: z.string().trim().regex(/^[A-Za-z0-9_-]{1,40}$/, 'id must be letters, digits, _ or -'),
  stage: lc(z.enum(STAGES)),
  type: lc(z.enum(['step', 'decision', 'milestone'])),
  title: clip(60),
  description: clip(240),
  durationEstimate: clip(40),
  deliverables: z.array(z.string().trim().min(1).max(100)).max(4).default([]),
  difficulty: levelSchema,
  difficultyNote: z.string().trim().max(240).nullable().optional(),
  betterPath: z.string().trim().max(40).nullable().optional(),
  decisionField: lc(z.enum(DECISION_FIELDS)).nullable().optional(),
});
const edgeSchema = z.object({
  from: z.string().trim(),
  to: z.string().trim(),
  kind: lc(z.enum(['recommended', 'alternate', 'normal'])),
  label: z.string().trim().max(60).nullable().optional(),
});

export function makeGraphSchema(undecided: DecisionField[]) {
  return z
    .object({ nodes: z.array(nodeSchema).min(12).max(26), edges: z.array(edgeSchema).min(11).max(90) })
    .superRefine((g, ctx) => {
      for (const msg of validateGraph(g as unknown as Graph, undecided)) ctx.addIssue({ code: 'custom', message: msg });
    });
}

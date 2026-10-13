// Single source of truth for domain constants on the client. Mirrors the server (backend/src/services/engine/constants.ts).

export const CATEGORIES = ['technical', 'market', 'social', 'financial', 'legal', 'scalability', 'competition'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  technical: 'Technical',
  market: 'Market',
  social: 'Social',
  financial: 'Financial',
  legal: 'Legal',
  scalability: 'Scalability',
  competition: 'Competition',
};

export const MIN_QUESTIONS = 7;
export const MAX_QUESTIONS = 15;
export const MAX_IDEA_CHARS = 2000;
export const MIN_IDEA_CHARS = 20;
export const MAX_ANSWER_CHARS = 1500;

export const MODE_KEYS = ['stress_test', 'brutal', '100x', 'competitor', 'failure'] as const;
export type ModeKey = (typeof MODE_KEYS)[number];
export const DEFAULT_MODE: ModeKey = 'stress_test';

export const MODES: Record<ModeKey, { label: string; blurb: string }> = {
  stress_test: { label: 'Stress Test', blurb: 'Balanced. Fair but relentless.' },
  brutal: { label: 'Brutal Mode', blurb: 'Harsher. Assumes the worst.' },
  '100x': { label: '100× Mode', blurb: 'What breaks at 100× the users?' },
  competitor: { label: 'Competitor Mode', blurb: 'Rivals and switching costs first.' },
  failure: { label: 'Failure Mode', blurb: '"It failed in 12 months. Why?"' },
};

export const STAGES = ['validate', 'spec', 'design', 'blueprint', 'prototype', 'launch'] as const;
export type Stage = (typeof STAGES)[number];

/** Six stage colours - each is always paired with the stage NAME, never colour alone. All >= 4.5:1 as text on the panel. */
export const STAGE_STYLE: Record<Stage, { label: string; color: string }> = {
  validate: { label: 'Validate', color: '#ff7b86' },
  spec: { label: 'Spec', color: '#ffb36b' },
  design: { label: 'Design', color: '#f2e07a' },
  blueprint: { label: 'Blueprint', color: '#7fe0b0' },
  prototype: { label: 'Prototype', color: '#7cc4ff' },
  launch: { label: 'Launch', color: '#c9a6ff' },
};

export type Verdict = 'KILL' | 'PIVOT' | 'BUILD';
export const KILL_BELOW = 40;
export const BUILD_AT_LEAST = 70;

/** Display-only mirror of the server rule, used for fixtures/tests. The server's number is always the source of truth. */
export function verdictForScore(total: number): Verdict {
  if (total < KILL_BELOW) return 'KILL';
  if (total >= BUILD_AT_LEAST) return 'BUILD';
  return 'PIVOT';
}

export const VERDICT_STYLE: Record<Verdict, { label: string; text: string; ring: string; blurb: string }> = {
  KILL: { label: 'KILL', text: '#ff8a93', ring: '#e11d2e', blurb: 'Do not build this as it stands.' },
  PIVOT: { label: 'PIVOT', text: '#ffd27a', ring: '#e8a33a', blurb: 'Promising core. Change direction.' },
  BUILD: { label: 'BUILD', text: '#8ff0b4', ring: '#3fcf7f', blurb: 'It survived. Go and prove it.' },
};

export const DECISION_FIELDS = ['techStack', 'marketing', 'team', 'timeline', 'budget', 'platform'] as const;
export type DecisionField = (typeof DECISION_FIELDS)[number];

// Display constants for the admin console. Mirrors the server (backend/src/services/engine/constants.ts).

const CATEGORIES = ['technical', 'market', 'social', 'financial', 'legal', 'scalability', 'competition'] as const;
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

const MODE_KEYS = ['stress_test', 'brutal', '100x', 'competitor', 'failure'] as const;
export type ModeKey = (typeof MODE_KEYS)[number];

export const MODES: Record<ModeKey, { label: string; blurb: string }> = {
  stress_test: { label: 'Stress Test', blurb: 'Balanced. Fair but relentless.' },
  brutal: { label: 'Brutal Mode', blurb: 'Harsher. Assumes the worst.' },
  '100x': { label: '100× Mode', blurb: 'What breaks at 100× the users?' },
  competitor: { label: 'Competitor Mode', blurb: 'Rivals and switching costs first.' },
  failure: { label: 'Failure Mode', blurb: '"It failed in 12 months. Why?"' },
};

export type Verdict = 'KILL' | 'PIVOT' | 'BUILD';
export const VERDICT_STYLE: Record<Verdict, { label: string; text: string; ring: string; blurb: string }> = {
  KILL: { label: 'KILL', text: '#ff8a93', ring: '#e11d2e', blurb: 'Do not build this as it stands.' },
  PIVOT: { label: 'PIVOT', text: '#ffd27a', ring: '#e8a33a', blurb: 'Promising core. Change direction.' },
  BUILD: { label: 'BUILD', text: '#8ff0b4', ring: '#3fcf7f', blurb: 'It survived. Go and prove it.' },
};

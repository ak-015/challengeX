export const CATEGORIES = ['technical', 'market', 'social', 'financial', 'legal', 'scalability', 'competition'] as const;
export type Category = (typeof CATEGORIES)[number];

export const MIN_QUESTIONS = 7;
export const MAX_QUESTIONS = 15;
export const SKIP_PENALTY = 0.5;
export const LOW_CONFIDENCE_SKIPS = 3; // lowConfidence when skipped_count > 3
export const KILL_BELOW = 40;
export const BUILD_AT_LEAST = 70;

/** Single source of truth for interrogation modes. */
export const MODES = {
  stress_test: {
    label: 'Stress Test',
    directive: 'Balanced skeptic. Probe the weakest assumptions fairly; give credit where the answer is genuinely strong.',
  },
  brutal: {
    label: 'Brutal',
    directive: 'Harsh skeptic. Assume the worst case in every ambiguity. Vague or hopeful answers are treated as red flags and scored low.',
  },
  '100x': {
    label: '100x',
    directive: 'Assume 100x the expected user volume, data and load. Hunt for the breakpoints: cost curves, rate limits, support load, infrastructure, operations.',
  },
  competitor: {
    label: 'Competitor',
    directive: 'Weight rivals and switching costs heavily. Ask why users would leave an incumbent, what the incumbent can copy, and how defensible the idea is.',
  },
  failure: {
    label: 'Failure',
    directive: 'Post-mortem mode: it is 12 months from now and the product has failed. Ask questions that uncover why, working backwards from that failure.',
  },
} as const;

export type ModeKey = keyof typeof MODES;
export const MODE_KEYS = Object.keys(MODES) as [ModeKey, ...ModeKey[]];
export const DEFAULT_MODE: ModeKey = 'stress_test';

export const CATEGORY_HINTS: Record<Category, string> = {
  technical: 'feasibility, hardest engineering problem, data, offline/edge conditions, dependencies',
  market: 'real demand, who pays, willingness to pay, reachability of first users',
  social: 'user behaviour change, trust, adoption barriers, community or cultural fit',
  financial: 'unit economics, cost to serve, runway, pricing, funding needs',
  legal: 'regulation, privacy, licensing, liability, IP',
  scalability: 'what breaks at 10x/100x, operations, support, infrastructure cost',
  competition: 'incumbents, substitutes, switching costs, defensibility',
};

/** Deterministic questions used only when the model cannot be steered by the server's correction. */
export const FALLBACK_QUESTIONS: Record<Category, [string, string]> = {
  technical: [
    'What is the single hardest technical piece of this idea, and what happens to users if it fails on day one?',
    'If your main technical dependency disappeared tomorrow, how would the product keep working?',
  ],
  market: [
    'Name the first 10 people who would pay for this. How exactly would you reach them this month?',
    'What would a user do today instead of using your product, and why would they stop?',
  ],
  social: [
    'What habit must users change to adopt this, and what makes them trust it over what they already do?',
    'Who in a user’s life or workplace would resist this, and what would they say?',
  ],
  financial: [
    'What does it cost you to serve one user for a month, and what will one user realistically pay?',
    'If revenue is zero for the first six months, how do you stay alive and who funds you?',
  ],
  legal: [
    'Which laws, licences or privacy rules apply to the data or service you handle, and who is liable when something goes wrong?',
    'What contract or compliance step could block your launch entirely?',
  ],
  scalability: [
    'What is the first thing that breaks when usage grows ten times in a month?',
    'Which part of your operation still depends on manual work, and what happens when volume doubles?',
  ],
  competition: [
    'Which existing product is closest to yours, and what stops them from adding your key feature next quarter?',
    'Why would a loyal user of the incumbent switch, given the effort of switching?',
  ],
};

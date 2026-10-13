// Sample data for the dev kitchen sink and the unit tests. Never imported by production screens.
import type { Graph, GraphEdge, GraphNode } from './apiTypes';
import { CATEGORIES, verdictForScore, type Category, type Stage } from './constants';
import type { VerdictData } from '@/components/verdict/verdictData';

const stageFor = (i: number): Stage => (i < 4 ? 'validate' : i < 7 ? 'spec' : i < 10 ? 'design' : i < 14 ? 'blueprint' : i < 17 ? 'prototype' : 'launch');

/** A valid 24-node roadmap graph (20-step chain + 4 alternate branches, 4 decisions). */
export function sampleGraph(): Graph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const decisions = new Set([4, 8, 12, 16]);
  for (let i = 1; i <= 20; i++) {
    nodes.push({
      id: `m${i}`,
      stage: stageFor(i),
      type: decisions.has(i) ? 'decision' : i === 20 ? 'milestone' : 'step',
      title: decisions.has(i) ? `Choose option ${i}` : `Step ${i}: build something`,
      description: `What happens in step ${i}.`,
      durationEstimate: `${i % 4 + 1} days`,
      deliverables: [`Deliverable ${i}`],
      difficulty: i === 6 ? 'high' : i % 3 === 0 ? 'medium' : 'low',
      difficultyNote: i === 6 ? 'Hard for a solo builder.' : null,
      betterPath: i === 6 ? 'a1' : null,
      decisionField: i === 4 ? 'budget' : i === 8 ? 'platform' : null,
    });
    if (i > 1) {
      const prev = i - 1;
      const kind = decisions.has(prev) ? 'recommended' : 'normal';
      edges.push({ from: `m${prev}`, to: `m${i}`, kind });
    }
  }
  [4, 8, 12, 16].forEach((d, k) => {
    const id = `a${k + 1}`;
    nodes.push({ id, stage: stageFor(d + 1), type: 'step', title: `Alternate route ${k + 1}`, description: 'A cheaper path.', durationEstimate: '2 days', deliverables: [], difficulty: 'low' });
    edges.push({ from: `m${d}`, to: id, kind: 'alternate', label: 'Cheaper' });
    edges.push({ from: id, to: `m${d + 2}`, kind: 'normal' });
  });
  return { nodes, edges };
}

export function sampleVerdict(totalScore: number): VerdictData {
  const categoryScores = Object.fromEntries(
    CATEGORIES.map((c, i) => {
      const s = Math.max(0, Math.min(10, totalScore / 10 + ((i % 3) - 1) * 1.5));
      return [c, { score: s, penalty: i === 4 ? 0.5 : 0, finalScore: i === 4 ? Math.max(0, s - 0.5) : s, rationale: `Why ${c} scored this way.` }];
    }),
  ) as VerdictData['categoryScores'];
  return {
    title: 'Crop disease scanner for farmers',
    mode: 'stress_test',
    totalScore,
    verdict: verdictForScore(totalScore),
    summary: 'A promising core with an unproven distribution channel. Validate demand before writing code.',
    lowConfidence: totalScore < 45,
    skippedCount: 4,
    categoryScores,
    struggles: [
      { title: 'No connectivity in the field', category: 'technical' as Category, why: 'Uploads will fail where your users work.', questionId: 'q1', questionIndex: 1, questionText: 'What if farmers have no internet?', answerExcerpt: 'We will cache photos and sync later.' },
      { title: 'Who pays?', category: 'financial' as Category, why: 'Farmers rarely pay for advice apps.', questionId: 'q2', questionIndex: 2, questionText: 'Who pays?', answerExcerpt: 'skipped' },
      { title: 'Incumbent apps', category: 'competition' as Category, why: 'Free government apps already exist.', questionId: 'q3', questionIndex: 3, questionText: 'Why switch?', answerExcerpt: 'Ours is more accurate.' },
    ],
    fixes: [
      { struggleIndex: 0, action: 'Ship an offline-first prototype and test it in a village with poor signal.', effort: 'medium' },
      { struggleIndex: 1, action: 'Sell to cooperatives instead of individual farmers.', effort: 'low' },
      { struggleIndex: 2, action: 'Benchmark accuracy against the incumbent on 100 real photos.', effort: 'high' },
    ],
    alternatives: [
      { title: 'B2B for co-ops', pitch: 'Sell dashboards to cooperatives.', whatChanges: 'Buyer changes from farmer to co-op.' },
      { title: 'Agronomist assistant', pitch: 'Help extension workers triage faster.', whatChanges: 'Users become professionals.' },
    ],
    validationExperiment: { description: 'Offer 30 farmers a WhatsApp photo diagnosis for one week and measure repeat use.', metric: 'Repeat usage in week 2', sampleSize: '30 farmers', durationDays: 14, buildIf: '≥ 40% use it again unprompted', pivotIf: '15–40% use it again', killIf: '< 15% use it again' },
    competitors: [{ name: 'Plantix', url: 'https://plantix.net', whatTheyDo: 'Photo-based crop diagnosis.', whyItMatters: 'Established with large datasets.', source: 'search' }],
  };
}

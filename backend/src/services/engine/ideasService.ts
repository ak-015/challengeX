import { db, getDb } from '../../lib/db';
import { toSessionRow } from '../../lib/rows';
import { wrapUserData } from '../../lib/prompt-safety';
import { generateJson } from '../ai/generateJson';
import { getFastPool } from '../ai/pools';
import { getSearch } from '../search';
import { ideasAiSchema } from './schemas';
import { ideasSystem } from './prompts';
import type { SessionRow } from './types';

export interface IdeasInput {
  hobbies: string[];
  interests: string[];
  skills: string[];
  field?: string;
  problemArea?: string;
  audience?: string;
  teamSize?: string;
  hoursPerWeek?: string;
  budget?: string;
  platform?: string;
  region?: string;
  goal?: string;
  avoid?: string;
  extra?: string;
}

export function describeInput(i: IdeasInput): string {
  const line = (label: string, v: string | string[] | undefined) =>
    Array.isArray(v) ? (v.length ? `${label}: ${v.join(', ')}` : '') : v ? `${label}: ${v}` : '';
  return [
    line('Hobbies', i.hobbies),
    line('Interests', i.interests),
    line('Skills', i.skills),
    line('Field', i.field),
    line('Problem area', i.problemArea),
    line('Audience', i.audience),
    line('Team size', i.teamSize),
    line('Hours per week', i.hoursPerWeek),
    line('Budget', i.budget),
    line('Platform', i.platform),
    line('Region', i.region),
    line('Goal', i.goal),
    line('Avoid', i.avoid),
    line('Extra notes', i.extra),
  ]
    .filter(Boolean)
    .join('\n');
}

export async function generateIdeas(userId: string, input: IdeasInput) {
  // Optional single grounding search - skipped silently on any failure.
  let grounding = '';
  const topic = [input.problemArea, input.field, input.interests[0]].filter(Boolean).join(' ').trim();
  if (topic) {
    try {
      const results = await getSearch().search(`${topic} unmet needs startup opportunities`, { max: 4 });
      if (results.length) {
        grounding = wrapUserData('market_signals', results.map((r) => `- ${r.title}: ${r.snippet.slice(0, 200)}`).join('\n'));
      }
    } catch {
      /* silent */
    }
  }
  const ai = await generateJson(ideasAiSchema, {
    system: ideasSystem,
    user: [wrapUserData('profile', describeInput(input)), grounding].filter(Boolean).join('\n\n'),
    pool: getFastPool(),
    route: 'ideas.generate',
    maxTokens: 1800,
    temperature: 0.7,
  });
  const title = `Ideas for ${input.field || input.interests[0] || input.skills[0] || input.hobbies[0] || 'you'}`.slice(0, 60);
  const created = await db(
    getDb().session.create({
      data: {
        userId,
        kind: 'ideas',
        title,
        understanding: input as never,
        verdictPayload: { ideas: ai.ideas } as never,
        status: 'complete',
      },
    }),
    'ideas insert',
  );
  const row = toSessionRow(created);
  return { id: row.id, title, ideas: ai.ideas };
}

import type { Idea, IdeasInput } from './apiTypes';

export const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

export interface IdeasForm {
  hobbies: string[];
  interests: string[];
  skills: string[];
  experience: string;
  field: string;
  problemArea: string;
  audience: string;
  region: string;
  teamSize: string;
  hoursPerWeek: string;
  budget: string;
  platform: string;
  goal: string;
  avoid: string;
  extra: string;
}

export const emptyIdeasForm: IdeasForm = {
  hobbies: [], interests: [], skills: [], experience: '', field: '', problemArea: '', audience: '', region: '',
  teamSize: '', hoursPerWeek: '', budget: '', platform: '', goal: '', avoid: '', extra: '',
};

/** The only hard requirement: at least one of hobbies / interests / skills / field. */
export const hasRequired = (f: IdeasForm): boolean => f.hobbies.length > 0 || f.interests.length > 0 || f.skills.length > 0 || f.field.trim().length > 0;

/** Builds the API payload. Experience level has no server field, so it travels inside `extra`. Empty strings are dropped. */
export function buildIdeasPayload(f: IdeasForm): IdeasInput {
  const extra = [f.experience ? `Experience level: ${f.experience}.` : '', f.extra.trim()].filter(Boolean).join(' ');
  const opt = (v: string) => (v.trim() ? v.trim() : undefined);
  return {
    hobbies: f.hobbies,
    interests: f.interests,
    skills: f.skills,
    field: opt(f.field),
    problemArea: opt(f.problemArea),
    audience: opt(f.audience),
    region: opt(f.region),
    teamSize: opt(f.teamSize),
    hoursPerWeek: opt(f.hoursPerWeek),
    budget: opt(f.budget),
    platform: opt(f.platform),
    goal: opt(f.goal),
    avoid: opt(f.avoid),
    extra: extra ? extra.slice(0, 600) : undefined,
  };
}

/** Text prefilled into the Altar for "Challenge This" (the server needs 20..2000 characters). */
export function ideaToChallengeText(i: Idea): string {
  const text = `${i.title}: ${i.oneLiner} Problem: ${i.problem} Target users: ${i.targetUsers}`;
  return text.length > 2000 ? `${text.slice(0, 1997)}...` : text;
}

export const SUGGESTIONS = {
  hobbies: ['Gaming', 'Cooking', 'Photography', 'Hiking', 'Reading', 'Music', 'Gardening', 'Fitness', 'Travel', 'Drawing'],
  interests: ['AI', 'Education', 'Health', 'Sustainability', 'Finance', 'Social impact', 'Productivity', 'Agriculture', 'Mental wellbeing', 'Creator economy'],
  skills: ['Web development', 'Design', 'Data analysis', 'Writing', 'Marketing', 'Sales', 'Mobile apps', 'Teaching', 'Video editing', 'Research'],
  field: ['Education', 'Healthcare', 'Agriculture', 'Fintech', 'E-commerce', 'Logistics', 'Entertainment', 'Climate', 'Real estate', 'Travel'],
  platform: ['Web app', 'Mobile app', 'Browser extension', 'WhatsApp / chat bot', 'Marketplace', 'Hardware + app'],
};

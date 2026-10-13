import { env } from '../../config/env';
import { Semaphore } from '../../lib/semaphore';
import { recordAiEvent } from './aiEvents';
import { ModelPool } from './modelPool';

let sem: Semaphore | undefined;
let fast: ModelPool | undefined;
let verdict: ModelPool | undefined;

function semaphore(): Semaphore {
  if (!sem) sem = new Semaphore(env().NIM_MAX_CONCURRENCY);
  return sem;
}

const onAttempt = recordAiEvent;

export function getFastPool(): ModelPool {
  if (!fast) fast = new ModelPool({ name: 'fast', models: env().NIM_MODELS, semaphore: semaphore(), onAttempt });
  return fast;
}

export function getVerdictPool(): ModelPool {
  if (!verdict) {
    const e = env();
    const models = e.NIM_VERDICT_MODELS.length > 0 ? e.NIM_VERDICT_MODELS : e.NIM_MODELS;
    verdict = new ModelPool({ name: 'verdict', models, semaphore: semaphore(), onAttempt });
  }
  return verdict;
}

export function getAllPools(): ModelPool[] {
  return [getFastPool(), getVerdictPool()];
}

export function allConfiguredModels(): string[] {
  return [...new Set(getAllPools().flatMap((p) => p.models))];
}

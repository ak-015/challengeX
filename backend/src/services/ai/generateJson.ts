import type { z } from 'zod';
import { AppError } from '../../lib/errors';
import { extractJsonObject } from '../../lib/json-extract';
import { recordFailure } from '../../lib/failures';
import { log } from '../../lib/logger';
import { SYSTEM_FOOTER } from '../../lib/prompt-safety';
import { recordAiEvent } from './aiEvents';
import type { ModelPool } from './modelPool';
import { nimChat } from './nimClient';

interface GenerateOptions {
  system: string;
  user: string;
  pool: ModelPool;
  route: string;
  maxTokens?: number;
  temperature?: number;
  /** Per HTTP call (default 25 s). */
  timeoutMs?: number;
  /** Total time the pool may spend on one pass across models (default 45 s). */
  budgetMs?: number;
}

type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

function parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, text: string): Parsed<T> {
  let raw: unknown;
  try {
    raw = extractJsonObject(text);
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const msg = result.error.issues
    .slice(0, 8)
    .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('; ');
  return { ok: false, error: msg };
}

const POOL_RETRY_DELAY_MS = 1200;
const MAX_ATTEMPTS_PER_PASS = 8;

function isTransientPoolError(err: unknown): boolean {
  return err instanceof AppError && (err.code === 'AI_BUSY' || err.code === 'AI_UNAVAILABLE');
}

function shouldRetryPoolError(err: unknown): boolean {
  if (!(err instanceof AppError)) return false;
  if (err.code === 'AI_UNAVAILABLE') return true;
  const retryAfterMs = err.extra?.retryAfterMs;
  return err.code === 'AI_BUSY' && typeof retryAfterMs === 'number' && retryAfterMs <= POOL_RETRY_DELAY_MS;
}

/**
 * One AI call -> validated object. On invalid output: ONE retry on a DIFFERENT model with the
 * validation error appended. A second failure becomes AI_BAD_OUTPUT (502).
 *
 * A whole pass is retried once for unavailable pools or a busy pool with a very short cooldown.
 * Longer pool cooldowns are returned to the caller with a retry hint instead of being hammered.
 */
export async function generateJson<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, opts: GenerateOptions): Promise<T> {
  try {
    return await generateOnce(schema, opts);
  } catch (err) {
    if (!isTransientPoolError(err) || !shouldRetryPoolError(err)) throw err;
    await new Promise((r) => setTimeout(r, POOL_RETRY_DELAY_MS));
    return generateOnce(schema, opts);
  }
}

async function generateOnce<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, opts: GenerateOptions): Promise<T> {
  const system = `${opts.system}\n\nReturn ONLY one JSON object. No markdown, no code fences, no commentary before or after it.\n${SYSTEM_FOOTER}`;
  const maxTokens = opts.maxTokens ?? 1200;
  const temperature = opts.temperature ?? 0.4;

  const attempt = async (user: string, avoid: string[]) => {
    const { value, model } = await opts.pool.execute(
      (m) =>
        nimChat({
          model: m,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          maxTokens,
          temperature,
          timeoutMs: opts.timeoutMs,
        }),
      { route: opts.route, avoid, maxAttempts: MAX_ATTEMPTS_PER_PASS, budgetMs: opts.budgetMs },
    );
    return { model, parsed: parse(schema, value) };
  };

  const first = await attempt(opts.user, []);
  if (first.parsed.ok) return first.parsed.data;
  log.warn('AI response failed validation', { route: opts.route, model: first.model, attempt: 1, reason: first.parsed.error.slice(0, 500) });
  recordFailure('nim', 'BAD_OUTPUT', first.model);
  recordAiEvent({ route: opts.route, model: first.model, ok: false, latencyMs: 0, errorCode: 'BAD_OUTPUT' });

  const correction = `${opts.user}\n\n[Your previous reply was rejected: ${first.parsed.error.slice(0, 700)}]\nFix the problems and return ONLY the corrected JSON object.`;
  const second = await attempt(correction, [first.model]);
  if (second.parsed.ok) return second.parsed.data;
  log.warn('AI response failed validation', { route: opts.route, model: second.model, attempt: 2, reason: second.parsed.error.slice(0, 500) });
  recordFailure('nim', 'BAD_OUTPUT', second.model);
  recordAiEvent({ route: opts.route, model: second.model, ok: false, latencyMs: 0, errorCode: 'BAD_OUTPUT' });
  throw new AppError(502, 'AI_BAD_OUTPUT', 'The oracle gave an unreadable answer. Please try again.');
}

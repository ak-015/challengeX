// ADAPTER: OpenAI-compatible chat providers (Groq / Gemini / NVIDIA NIM), selected per model id
// by a "provider:" prefix (see config/env.ts). All use POST {baseUrl}/chat/completions + GET {baseUrl}/models.
import { env, parseModelId, providerConfig, type AiProvider } from '../../config/env';
import { log } from '../../lib/logger';

const DEFAULT_TIMEOUT_MS = 25_000;

export class NimError extends Error {
  constructor(
    message: string,
    public readonly kind: 'http' | 'timeout' | 'network' | 'empty',
    public readonly status?: number,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = 'NimError';
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature: number;
  /** Hard limit for this one HTTP call. Long outputs (roadmaps) need far more than a short question. */
  timeoutMs?: number;
}

function parseRetryAfter(h: string | null): number | undefined {
  if (!h) return undefined;
  const secs = Number(h);
  const ms = Number.isFinite(secs) ? secs * 1000 : new Date(h).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return undefined;
  return Math.min(ms, 300_000);
}

export async function nimChat(req: ChatRequest): Promise<string> {
  const e = env();
  const { provider, model } = parseModelId(req.model);
  const { baseUrl, apiKey } = providerConfig(e, provider);
  if (!apiKey) throw new NimError(`no API key configured for provider "${provider}"`, 'network');
  const base = baseUrl.replace(/\/+$/, '');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), req.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const body: Record<string, unknown> = {
      model,
      messages: req.messages,
      max_tokens: req.maxTokens,
      temperature: req.temperature,
      stream: false,
    };
    if (e.NIM_USE_RESPONSE_FORMAT) body.response_format = { type: 'json_object' };
    // Reasoning models (gpt-oss, ...) spend most of their time and max_tokens "thinking"; 'low' makes them several times faster.
    if (e.NIM_REASONING_EFFORT) body.reasoning_effort = e.NIM_REASONING_EFFORT;
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const retryAfter = parseRetryAfter(res.headers.get('retry-after'));
      await res.body?.cancel().catch(() => undefined);
      throw new NimError(`NIM HTTP ${res.status}`, 'http', res.status, retryAfter);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new NimError('empty completion', 'empty');
    return content;
  } catch (err) {
    if (err instanceof NimError) throw err;
    if ((err as Error).name === 'AbortError') throw new NimError('timeout', 'timeout');
    throw new NimError(`network error: ${(err as Error).message}`, 'network');
  } finally {
    clearTimeout(timer);
  }
}

/** Boot-time sanity check of configured model IDs. Log only - never throws. */
export async function bootCheckModels(models: string[]): Promise<void> {
  const e = env();
  const byProvider = new Map<AiProvider, string[]>();
  for (const id of models) {
    const { provider, model } = parseModelId(id);
    const arr = byProvider.get(provider) ?? [];
    arr.push(model);
    byProvider.set(provider, arr);
  }
  for (const [provider, ids] of byProvider) {
    const { baseUrl, apiKey } = providerConfig(e, provider);
    if (!apiKey) {
      log.warn('model list check skipped: no API key for provider', { provider });
      continue;
    }
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
        headers: { authorization: `Bearer ${apiKey}` },
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timer));
      if (!res.ok) {
        log.warn('model list check skipped', { provider, status: res.status });
        continue;
      }
      const json = (await res.json()) as { data?: { id?: string }[] };
      // Gemini lists ids as "models/<name>" while our configured id (after the provider prefix is
      // stripped) is bare. Normalise both sides so a valid id isn't falsely flagged as missing.
      const norm = (s: string): string => s.replace(/^models\//, '');
      const available = new Set(((json.data ?? []).map((m) => m.id).filter(Boolean) as string[]).map(norm));
      if (available.size === 0) continue;
      for (const m of ids) {
        if (!available.has(norm(m))) log.warn(`model ${provider}:${m} not found in provider model list: check ID/access`);
      }
      log.info('model list check complete', { provider, configured: ids.length, available: available.size });
    } catch (err) {
      log.warn('model list check failed', { provider, message: (err as Error).message });
    }
  }
}

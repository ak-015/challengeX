import { AppError } from '../../lib/errors';
import { recordFailure } from '../../lib/failures';
import { log } from '../../lib/logger';
import { Semaphore } from '../../lib/semaphore';
import { parseModelId } from '../../config/env';
import { NimError } from './nimClient';

export interface ModelState {
  id: string;
  inflight: number;
  cooldownUntil: number;
  consecutiveFailures: number;
  lastLatency: number | null;
  disabled: boolean;
  lastPicked: number;
  lastError: string | null;
}
export type Registry = Map<string, ModelState>;
/** Shared by every pool in the process, so a model used by two pools shares its health. */
export const globalRegistry: Registry = new Map();

export interface AttemptInfo {
  route: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  errorCode: string | null;
}

export interface PoolConfig {
  name: string;
  models: string[];
  registry?: Registry;
  clock?: () => number;
  sleep?: (ms: number) => Promise<void>;
  semaphore?: Semaphore;
  onAttempt?: (a: AttemptInfo) => void;
}

export interface ExecuteOptions {
  route: string;
  /** Soft exclusion: models to avoid if any other healthy model exists. */
  avoid?: string[];
  maxAttempts?: number;
  budgetMs?: number;
}

export interface ModelStatus {
  id: string;
  pools: string[];
  status: 'healthy' | 'cooling' | 'disabled';
  inflight: number;
  consecutiveFailures: number;
  lastLatencyMs: number | null;
  cooldownRemainingMs: number;
  lastError: string | null;
}

type PickResult = { kind: 'model'; state: ModelState } | { kind: 'wait'; waitMs: number } | { kind: 'none' };

let pickSeq = 0;
const COOLDOWN_429_DEFAULT = 45_000;
const COOLDOWN_BASE = 15_000;
const COOLDOWN_CAP = 300_000;

export class ModelPool {
  readonly name: string;
  readonly models: string[];
  private readonly registry: Registry;
  private readonly clock: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly sem: Semaphore;
  private readonly onAttempt?: (a: AttemptInfo) => void;

  constructor(cfg: PoolConfig) {
    this.name = cfg.name;
    this.models = [...new Set(cfg.models)];
    this.registry = cfg.registry ?? globalRegistry;
    this.clock = cfg.clock ?? Date.now;
    this.sleep = cfg.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.sem = cfg.semaphore ?? new Semaphore(4);
    this.onAttempt = cfg.onAttempt;
    for (const id of this.models) this.stateFor(id);
  }

  private stateFor(id: string): ModelState {
    let s = this.registry.get(id);
    if (!s) {
      s = { id, inflight: 0, cooldownUntil: 0, consecutiveFailures: 0, lastLatency: null, disabled: false, lastPicked: 0, lastError: null };
      this.registry.set(id, s);
    }
    return s;
  }

  /** Healthy model with fewest in-flight; ties -> least recently picked (round-robin), then lower latency. */
  pick(tried: Set<string> = new Set(), avoid: Set<string> = new Set()): PickResult {
    const now = this.clock();
    const enabled = this.models.map((id) => this.stateFor(id)).filter((s) => !s.disabled);
    if (enabled.length === 0) return { kind: 'none' };
    const healthyOf = (list: ModelState[]) => list.filter((s) => s.cooldownUntil <= now);

    let healthy = healthyOf(enabled.filter((s) => !avoid.has(s.id)));
    if (healthy.length === 0) healthy = healthyOf(enabled);
    if (healthy.length === 0) {
      const earliest = Math.min(...enabled.map((s) => s.cooldownUntil));
      return { kind: 'wait', waitMs: Math.max(0, earliest - now) };
    }
    const untried = healthy.filter((s) => !tried.has(s.id));
    if (untried.length > 0) healthy = untried;

    healthy.sort(
      (a, b) =>
        a.inflight - b.inflight ||
        a.lastPicked - b.lastPicked ||
        (a.lastLatency ?? 0) - (b.lastLatency ?? 0),
    );
    const chosen = healthy[0] as ModelState;
    chosen.inflight++;
    chosen.lastPicked = ++pickSeq;
    return { kind: 'model', state: chosen };
  }

  private busy(retryAfterMs = 5000): AppError {
    return new AppError(503, 'AI_BUSY', 'The realm is crowded, try again in a moment', { retryAfterMs: Math.max(1000, retryAfterMs) });
  }

  private nextRetryAfterMs(): number {
    const now = this.clock();
    const cooldowns = this.models
      .map((id) => this.stateFor(id))
      .filter((state) => !state.disabled && state.cooldownUntil > now)
      .map((state) => state.cooldownUntil - now);
    return cooldowns.length ? Math.min(...cooldowns) : 5000;
  }

  async execute<T>(fn: (model: string) => Promise<T>, opts: ExecuteOptions): Promise<{ value: T; model: string }> {
    const maxAttempts = opts.maxAttempts ?? 4;
    const budget = opts.budgetMs ?? 45_000;
    const start = this.clock();
    const tried = new Set<string>();
    const avoid = new Set(opts.avoid ?? []);
    let attempts = 0;

    for (;;) {
      if (attempts >= maxAttempts || this.clock() - start >= budget) throw this.busy(this.nextRetryAfterMs());
      const release = await this.sem.acquire();
      const pick = this.pick(tried, avoid);
      if (pick.kind !== 'model') {
        release();
        if (pick.kind === 'none') throw new AppError(503, 'AI_UNAVAILABLE', 'No AI model is available right now');
        const remaining = budget - (this.clock() - start);
        if (pick.waitMs > remaining) throw this.busy(pick.waitMs);
        await this.sleep(pick.waitMs);
        continue;
      }
      const state = pick.state;
      const t0 = this.clock();
      try {
        const value = await fn(state.id);
        const latency = this.clock() - t0;
        state.consecutiveFailures = 0;
        state.cooldownUntil = 0;
        state.lastLatency = latency;
        state.lastError = null;
        this.onAttempt?.({ route: opts.route, model: state.id, ok: true, latencyMs: latency, errorCode: null });
        return { value, model: state.id };
      } catch (err) {
        if (!(err instanceof NimError)) throw err;
        const code = this.registerFailure(state, err);
        this.onAttempt?.({ route: opts.route, model: state.id, ok: false, latencyMs: this.clock() - t0, errorCode: code });
        attempts++;
        tried.add(state.id);
      } finally {
        state.inflight--;
        release();
      }
    }
  }

  private registerFailure(s: ModelState, err: NimError): string {
    const now = this.clock();
    let code: string;
    if (err.status === 429) {
      s.cooldownUntil = now + (err.retryAfterMs ?? COOLDOWN_429_DEFAULT);
      s.lastError = 'HTTP_429';
      code = 'HTTP_429';
    } else if (err.status === 401 || err.status === 403 || err.status === 404) {
      s.disabled = true;
      s.lastError = `HTTP_${err.status}`;
      code = `HTTP_${err.status}`;
    } else {
      s.consecutiveFailures++;
      s.cooldownUntil = now + Math.min(COOLDOWN_BASE * 2 ** (s.consecutiveFailures - 1), COOLDOWN_CAP);
      code = err.kind === 'timeout' ? 'TIMEOUT' : err.status ? `HTTP_${err.status}` : err.kind.toUpperCase();
      s.lastError = code;
    }
    const { provider } = parseModelId(s.id);
    const metadata = { provider, model: s.id, kind: err.kind, status: err.status, retryAfterMs: err.retryAfterMs, errorCode: code };
    if (err.status === 401 || err.status === 403 || err.status === 404) log.error('AI provider rejected model request', metadata);
    else log.warn('AI provider request failed', metadata);
    recordFailure('nim', code, s.id);
    return code;
  }

  describe(): ModelStatus[] {
    return this.models.map((id) => describeState(this.stateFor(id), [this.name], this.clock()));
  }

  /** Clear cooldown/failures and re-enable. Returns false if this pool does not know the model. */
  reset(id: string): boolean {
    if (!this.models.includes(id)) return false;
    const s = this.stateFor(id);
    s.cooldownUntil = 0;
    s.consecutiveFailures = 0;
    s.disabled = false;
    s.lastError = null;
    return true;
  }
}

function describeState(s: ModelState, pools: string[], now: number): ModelStatus {
  const cooling = s.cooldownUntil > now;
  return {
    id: s.id,
    pools,
    status: s.disabled ? 'disabled' : cooling ? 'cooling' : 'healthy',
    inflight: s.inflight,
    consecutiveFailures: s.consecutiveFailures,
    lastLatencyMs: s.lastLatency,
    cooldownRemainingMs: cooling ? s.cooldownUntil - now : 0,
    lastError: s.lastError,
  };
}

/** Merge pool descriptions by model id (a model may belong to several pools). */
export function describePools(pools: ModelPool[]): ModelStatus[] {
  const merged = new Map<string, ModelStatus>();
  for (const p of pools) {
    for (const m of p.describe()) {
      const existing = merged.get(m.id);
      if (existing) existing.pools = [...new Set([...existing.pools, ...m.pools])];
      else merged.set(m.id, m);
    }
  }
  return [...merged.values()];
}

import { getDb } from '../../lib/db';
import { log } from '../../lib/logger';

interface AiEvent {
  route: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  errorCode?: string | null;
}

/** Metadata only (no prompts, no user text). Fire-and-forget. */
export function recordAiEvent(e: AiEvent): void {
  try {
    void Promise.resolve(
      getDb().aiEvent.create({
        data: {
          route: e.route.slice(0, 60),
          model: e.model.slice(0, 120),
          ok: e.ok,
          latencyMs: Math.max(0, Math.round(e.latencyMs)),
          errorCode: e.errorCode ? e.errorCode.slice(0, 40) : null,
        },
      }),
    )
      .then(() => undefined)
      .catch((err) => log.warn('ai_events insert failed', { message: err instanceof Error ? err.message : String(err) }));
  } catch {
    /* never let analytics break a request */
  }
}


import { API_BASE_URL } from '@/env';
import { useAuth, getToken } from '@/store/authStore';
import { ApiError } from './errors';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send the Bearer token (default true). Public/auth endpoints pass false. */
  auth?: boolean;
  signal?: AbortSignal;
  /** Total time budget for one attempt. AI endpoints use a longer one. */
  timeoutMs?: number;
  /**
   * Retry once on a NETWORK error. Defaults to true for GET only. Pass true for POSTs that are
   * idempotent on the server (next/answer/verdict/save); never for create-style POSTs (would risk duplicates).
   */
  retry?: boolean;
}

const TIMEOUT_DEFAULT = 30_000;

type UnauthorizedHandler = (reason: 'expired' | 'suspended') => void;
let onUnauthorized: UnauthorizedHandler | null = null;
const setUnauthorizedHandler = (h: UnauthorizedHandler | null) => {
  onUnauthorized = h;
};

function mergeSignals(external: AbortSignal | undefined, timeoutMs: number): { signal: AbortSignal; cleanup: () => void; timedOut: () => boolean } {
  const ctrl = new AbortController();
  let didTimeout = false;
  const timer = setTimeout(() => {
    didTimeout = true;
    ctrl.abort();
  }, timeoutMs);
  const onAbort = () => ctrl.abort();
  if (external) {
    if (external.aborted) ctrl.abort();
    else external.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: ctrl.signal,
    timedOut: () => didTimeout,
    cleanup: () => {
      clearTimeout(timer);
      external?.removeEventListener('abort', onAbort);
    },
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function once<T>(path: string, o: RequestOptions): Promise<T> {
  const { signal, cleanup, timedOut } = mergeSignals(o.signal, o.timeoutMs ?? TIMEOUT_DEFAULT);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (o.auth !== false) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: o.method ?? 'GET',
      headers,
      body: o.body !== undefined ? JSON.stringify(o.body) : undefined,
      signal,
    });
  } catch (err) {
    cleanup();
    if (o.signal?.aborted) throw new ApiError(0, 'ABORTED', 'Request cancelled');
    if (timedOut()) throw new ApiError(0, 'TIMEOUT', 'The realm took too long to answer.');
    throw new ApiError(0, 'NETWORK', 'Cannot reach the realm. Check your connection.', { cause: (err as Error).message });
  }
  try {
    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    if (!res.ok) {
      const e = (json as { error?: { code?: string; message?: string } & Record<string, unknown> } | null)?.error;
      const { code, message, ...extra } = e ?? {};
      throw new ApiError(res.status, code ?? `HTTP_${res.status}`, message ?? `Request failed (${res.status})`, extra);
    }
    return json as T;
  } finally {
    cleanup();
  }
}

export async function api<T>(path: string, o: RequestOptions = {}): Promise<T> {
  const canRetry = o.retry ?? (o.method === undefined || o.method === 'GET');
  try {
    try {
      return await once<T>(path, o);
    } catch (err) {
      if (canRetry && err instanceof ApiError && err.code === 'NETWORK' && !o.signal?.aborted) {
        await sleep(600);
        return await once<T>(path, o);
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof ApiError && o.auth !== false) {
      if (err.status === 401) onUnauthorized?.('expired');
      else if (err.status === 403 && err.code === 'ACCOUNT_SUSPENDED') onUnauthorized?.('suspended');
    }
    throw err;
  }
}

/** Wire the 401 handler: clears the token and lets the router send the user back to the gate. */
export function installAuthExpiry(): void {
  setUnauthorizedHandler((reason) => {
    useAuth.getState().logout(reason === 'suspended' ? 'This account is suspended.' : 'Your session expired. Please sign in again.');
  });
}

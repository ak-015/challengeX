// In-memory ring buffer of the last provider failures for the admin "system" view. No secrets, no user text.
export interface FailureRecord {
  at: string;
  provider: 'nim' | 'search' | 'email';
  target: string | null;
  code: string;
}

const buffer: FailureRecord[] = [];

export function recordFailure(provider: FailureRecord['provider'], code: string, target?: string): void {
  buffer.unshift({ at: new Date().toISOString(), provider, target: target ?? null, code: code.slice(0, 80) });
  if (buffer.length > 20) buffer.length = 20;
}

export function recentFailures(): FailureRecord[] {
  return [...buffer];
}

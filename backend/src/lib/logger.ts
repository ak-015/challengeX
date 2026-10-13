// Structured JSON logger. Redacts sensitive keys recursively so passwords, OTPs,
// tokens and API keys can never reach the logs even if passed by mistake.
const EXACT = new Set([
  'password', 'newpassword', 'passwordhash', 'password_hash', 'otp', 'code', 'codehash', 'code_hash',
  'token', 'accesstoken', 'authorization', 'apikey', 'api_key', 'api-key', 'secret', 'jwt', 'cookie', 'signature',
]);
const PARTIAL = /(password|secret|token|apikey|api_key|authorization)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return '[depth]';
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redact(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = EXACT.has(k.toLowerCase()) || PARTIAL.test(k) ? '[redacted]' : redact(v, depth + 1);
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, msg: string, meta?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'test' && level !== 'error') return;
  const line = JSON.stringify({ level, time: new Date().toISOString(), msg, ...(meta ? (redact(meta) as object) : {}) });
  (level === 'error' ? console.error : console.log)(line);
}

export const log = {
  debug: (msg: string, meta?: Record<string, unknown>) => emit('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => emit('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => emit('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => emit('error', msg, meta),
};

export { redact };

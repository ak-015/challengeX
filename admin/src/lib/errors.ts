export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly extra?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const isAbort = (e: unknown): boolean =>
  (e instanceof DOMException && e.name === 'AbortError') || (e instanceof ApiError && e.code === 'ABORTED');

const THEMED: Record<string, string> = {
  AI_BUSY: 'The realm is crowded. Give it a moment, then try again.',
  AI_BAD_OUTPUT: 'The Challenger’s reply came out garbled. Try again.',
  AI_UNAVAILABLE: 'No oracle is awake right now. Try again shortly.',
  NETWORK: 'The path to the realm is broken. Check your connection and retry.',
  TIMEOUT: 'The realm took too long to answer. Retry.',
  RATE_LIMITED: 'Too many requests. Catch your breath and try again soon.',
  EMAIL_NOT_VERIFIED: 'Your email is not verified yet.',
  ACCOUNT_SUSPENDED: 'This account has been suspended. Contact the administrators if you think this is a mistake.',
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  OTP_INVALID: 'That code is not correct.',
  OTP_EXPIRED: 'That code expired or was already used. Request a new one.',
  OTP_COOLDOWN: 'Wait a moment before asking for another code.',
  OTP_RATE_LIMIT: 'Too many codes requested. Try again in an hour.',
  EMAIL_TAKEN: 'An account with this email already exists.',
  EMAIL_FAILED: 'We could not send the email. Please try again.',
  VALIDATION_ERROR: 'Please check the highlighted fields.',
  UPLOAD_NOT_OWNED: 'That upload could not be verified.',
  NOT_SURVIVING: 'Roadmaps are only forged for ideas that survived (BUILD or PIVOT).',
  CONFLICT: 'Something changed in the meantime. Retry.',
};

/** User-facing message for any error. Server messages are plain text from our own API; we never render HTML. */
export function friendlyMessage(e: unknown): string {
  if (e instanceof ApiError) {
    const themed = THEMED[e.code];
    if (themed && !['VALIDATION_ERROR', 'OTP_COOLDOWN'].includes(e.code)) return themed;
    return e.message || themed || 'Something went wrong.';
  }
  return 'Something went wrong.';
}

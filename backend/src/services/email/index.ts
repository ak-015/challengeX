import { emailProviders, env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { recordFailure } from '../../lib/failures';
import { log } from '../../lib/logger';
import { sendViaBrevo } from './brevo';
import { sendViaResend } from './resend';
import type { EmailMessage } from './types';

export type { EmailMessage } from './types';

/** Brevo first; on ANY failure fall back to Resend. Never uses SMTP. */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  const providers = emailProviders();
  if (!providers.brevo && !providers.resend) {
    if (env().NODE_ENV === 'production') throw new AppError(502, 'EMAIL_FAILED', 'Email delivery is not configured');
    log.warn('no email provider configured; email skipped (development)');
    return;
  }
  if (providers.brevo) {
    try {
      await sendViaBrevo(msg);
      return;
    } catch (err) {
      recordFailure('email', (err as Error).message, 'brevo');
      log.warn('brevo failed, trying fallback', { message: (err as Error).message });
    }
  }
  if (providers.resend) {
    try {
      await sendViaResend(msg);
      return;
    } catch (err) {
      recordFailure('email', (err as Error).message, 'resend');
      log.warn('resend failed', { message: (err as Error).message });
    }
  }
  throw new AppError(502, 'EMAIL_FAILED', 'We could not send the email. Please try again in a moment.');
}

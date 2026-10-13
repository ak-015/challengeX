// ADAPTER: Brevo transactional REST API. VERIFY against https://developers.brevo.com/reference/sendtransacemail
// Requires a VERIFIED SENDER (or authenticated domain) in Brevo for BREVO_SENDER_EMAIL.
import { env } from '../../config/env';
import type { EmailMessage } from './types';

export async function sendViaBrevo(msg: EmailMessage): Promise<void> {
  const e = env();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': e.BREVO_API_KEY ?? '', 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: e.BREVO_SENDER_NAME, email: e.BREVO_SENDER_EMAIL },
        to: [{ email: msg.to }],
        subject: msg.subject,
        htmlContent: msg.html,
        textContent: msg.text,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Brevo HTTP ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}

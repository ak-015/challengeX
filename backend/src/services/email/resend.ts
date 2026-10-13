// ADAPTER: Resend REST API. VERIFY against https://resend.com/docs/api-reference/emails/send-email
// Requires a VERIFIED DOMAIN in Resend for RESEND_FROM (the onboarding@resend.dev sandbox can only mail your own address).
import { env } from '../../config/env';
import type { EmailMessage } from './types';

export async function sendViaResend(msg: EmailMessage): Promise<void> {
  const e = env();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${e.RESEND_API_KEY ?? ''}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: e.RESEND_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Resend HTTP ${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}

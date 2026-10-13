import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashOtp(email: string, purpose: string, code: string, secret: string = env().OTP_SECRET): string {
  return createHmac('sha256', secret).update(`${email.toLowerCase()}|${purpose}|${code}`).digest('hex');
}

export function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length === 0 || ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** 10-char URL-safe slug using unbiased random picks. */
export function randomSlug(length = 10): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(0, ALPHABET.length)];
  return out;
}

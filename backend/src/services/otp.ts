import { env } from '../config/env';
import { generateOtpCode, hashOtp, safeEqualHex } from '../lib/crypto';
import { db, getDb } from '../lib/db';
import { AppError, tooMany } from '../lib/errors';
import { sendEmail } from './email';
import { otpEmail } from './email/template';

type OtpPurpose = 'signup' | 'reset';
const OTP_TTL_MS = 10 * 60_000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_MS = 60_000;
const OTP_MAX_PER_HOUR = 5;

interface OtpRecord {
  code_hash: string;
  expires_at: Date | string;
  attempts: number;
  consumed_at: Date | string | null;
}
type OtpResult = 'ok' | 'expired' | 'locked' | 'wrong' | 'consumed';

/** Pure OTP check (no I/O). Single-use, expiry, attempt cap, constant-time compare. */
function evaluateOtp(
  rec: OtpRecord,
  email: string,
  purpose: OtpPurpose,
  code: string,
  now: number = Date.now(),
  secret?: string,
): OtpResult {
  if (rec.consumed_at) return 'consumed';
  if (rec.attempts >= OTP_MAX_ATTEMPTS) return 'locked';
  if (new Date(rec.expires_at).getTime() <= now) return 'expired';
  return safeEqualHex(rec.code_hash, hashOtp(email, purpose, code, secret)) ? 'ok' : 'wrong';
}

export async function issueOtp(email: string, purpose: OtpPurpose): Promise<void> {
  const prisma = getDb();
  const sinceHour = new Date(Date.now() - 3_600_000);
  const recent = await db(
    prisma.otp.findMany({ where: { email, createdAt: { gte: sinceHour } }, select: { createdAt: true }, orderBy: { createdAt: 'desc' } }),
    'otp recent',
  );
  if (recent.length >= OTP_MAX_PER_HOUR) {
    throw tooMany('OTP_RATE_LIMIT', 'Too many codes requested. Try again in an hour.');
  }
  const last = recent[0];
  if (last) {
    const wait = OTP_COOLDOWN_MS - (Date.now() - new Date(last.createdAt).getTime());
    if (wait > 0) {
      throw tooMany('OTP_COOLDOWN', `Please wait ${Math.ceil(wait / 1000)}s before requesting another code.`, {
        retryAfterSeconds: Math.ceil(wait / 1000),
      });
    }
  }
  // Only one live code per email+purpose.
  await db(prisma.otp.updateMany({ where: { email, purpose, consumedAt: null }, data: { consumedAt: new Date() } }), 'otp invalidate');
  const code = generateOtpCode();
  const row = await db(
    prisma.otp.create({ data: { email, purpose, codeHash: hashOtp(email, purpose, code), expiresAt: new Date(Date.now() + OTP_TTL_MS) }, select: { id: true } }),
    'otp insert',
  );
  // Deliberate console.log (not the logger): the code is printed ONLY in development with DEV_LOG_OTP=true.
  if (env().DEV_LOG_OTP && env().NODE_ENV === 'development') console.log(`[DEV_LOG_OTP] ${purpose} code for ${email}: ${code}`);
  const mail = otpEmail({ code, purpose });
  try {
    await sendEmail({ to: email, ...mail });
  } catch (err) {
    // Don't let a failed send count against the user's hourly allowance.
    await prisma.otp.delete({ where: { id: row.id } }).catch(() => undefined);
    throw err;
  }
}

export async function verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<void> {
  const prisma = getDb();
  const latest = await db(
    prisma.otp.findFirst({ where: { email, purpose }, select: { id: true, codeHash: true, expiresAt: true, attempts: true, consumedAt: true }, orderBy: { createdAt: 'desc' } }),
    'otp latest',
  );
  if (!latest) throw new AppError(400, 'OTP_EXPIRED', 'Code expired or already used. Request a new one.');
  const rec: OtpRecord = { code_hash: latest.codeHash, expires_at: latest.expiresAt, attempts: latest.attempts, consumed_at: latest.consumedAt };
  const result = evaluateOtp(rec, email, purpose, code);
  if (result === 'ok') {
    const claimed = await db(
      prisma.otp.updateMany({ where: { id: latest.id, consumedAt: null }, data: { consumedAt: new Date() } }),
      'otp consume',
    );
    if (claimed.count === 0) throw new AppError(400, 'OTP_EXPIRED', 'Code expired or already used. Request a new one.');
    return;
  }
  if (result === 'wrong') {
    await db(prisma.otp.update({ where: { id: latest.id }, data: { attempts: latest.attempts + 1 } }), 'otp attempts');
    throw new AppError(400, 'OTP_INVALID', 'That code is not correct.', { attemptsLeft: Math.max(0, OTP_MAX_ATTEMPTS - latest.attempts - 1) });
  }
  throw new AppError(400, 'OTP_EXPIRED', 'Code expired or already used. Request a new one.');
}

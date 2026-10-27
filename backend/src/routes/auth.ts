import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async';
import { db, getDb } from '../lib/db';
import { AppError, forbidden, unauthorized } from '../lib/errors';
import { signToken } from '../lib/jwt';
import { currentUser, requireAuth } from '../middleware/auth';
import { authEmailLimiter, authIpLimiter } from '../middleware/rateLimit';
import { issueOtp, verifyOtp } from '../services/otp';

const email = z.string().trim().toLowerCase().email().max(254);
// bcrypt only uses the first 72 BYTES, so the limit is on bytes, not characters.
const password = z
  .string()
  .min(8, 'must be at least 8 characters')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'must be at most 72 bytes');
const displayName = z.string().trim().min(1).max(50);
const code = z.string().trim().regex(/^\d{6}$/, 'must be 6 digits');

const BCRYPT_ROUNDS = 12;
// Compared against when the account does not exist so login timing does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
}

const userDto = (u: PublicUser) => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  avatarUrl: u.avatarUrl,
  role: u.role,
  emailVerified: u.emailVerified,
});

const findUser = (e: string) => db(getDb().user.findUnique({ where: { email: e } }), 'user by email');

const OTP_EXPIRED = () => new AppError(400, 'OTP_EXPIRED', 'Code expired or already used. Request a new one.');

export const authRouter = Router();
authRouter.use(authIpLimiter);

authRouter.post(
  '/signup',
  authEmailLimiter,
  asyncHandler(async (req, res) => {
    const body = z.object({ email, password, displayName }).parse(req.body);
    const existing = await findUser(body.email);
    if (existing?.emailVerified) throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    const hash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
    if (existing) {
      // Unverified account: whoever proves ownership of the inbox (OTP) is the one who keeps it.
      await db(getDb().user.update({ where: { id: existing.id }, data: { passwordHash: hash, displayName: body.displayName } }), 'user refresh');
    } else {
      await db(getDb().user.create({ data: { email: body.email, passwordHash: hash, displayName: body.displayName } }), 'user insert');
    }
    await issueOtp(body.email, 'signup');
    res.status(201).json({ ok: true, email: body.email, message: 'Verification code sent' });
  }),
);

authRouter.post(
  '/verify-otp',
  authEmailLimiter,
  asyncHandler(async (req, res) => {
    const body = z.object({ email, code }).parse(req.body);
    await verifyOtp(body.email, 'signup', body.code);
    const user = await findUser(body.email);
    if (!user) throw OTP_EXPIRED();
    if (user.status === 'suspended') throw forbidden('This account is suspended', 'ACCOUNT_SUSPENDED');
    const verified = await db(getDb().user.update({ where: { id: user.id }, data: { emailVerified: true, lastLoginAt: new Date() } }), 'verify user');
    res.json({ token: signToken(verified.id), user: userDto(verified) });
  }),
);

authRouter.post(
  '/resend-otp',
  authEmailLimiter,
  asyncHandler(async (req, res) => {
    const body = z.object({ email, purpose: z.enum(['signup', 'reset']).default('signup') }).parse(req.body);
    const user = await findUser(body.email);
    // Same response whether or not the account exists (no enumeration).
    const eligible = user && (body.purpose === 'signup' ? !user.emailVerified : user.emailVerified && user.status === 'active');
    if (eligible) await issueOtp(body.email, body.purpose);
    res.json({ ok: true, message: 'If the account exists, a new code was sent' });
  }),
);

authRouter.post(
  '/login',
  authEmailLimiter,
  asyncHandler(async (req, res) => {
    const body = z.object({ email, password: z.string().min(1).max(200) }).parse(req.body);
    const user = await findUser(body.email);
    const ok = await bcrypt.compare(body.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.passwordHash || !ok) throw unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');
    if (user.status === 'suspended') throw forbidden('This account is suspended', 'ACCOUNT_SUSPENDED');
    if (!user.emailVerified) {
      await issueOtp(user.email, 'signup');
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email: a fresh code was sent', { email: user.email });
    }
    await db(getDb().user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }), 'last login');
    res.json({ token: signToken(user.id), user: userDto(user) });
  }),
);

authRouter.post(
  '/forgot',
  authEmailLimiter,
  asyncHandler(async (req, res) => {
    const body = z.object({ email }).parse(req.body);
    const user = await findUser(body.email);
    if (user?.emailVerified && user.status === 'active') await issueOtp(body.email, 'reset');
    res.json({ ok: true, message: 'If the account exists, a reset code was sent' });
  }),
);

authRouter.post(
  '/reset',
  authEmailLimiter,
  asyncHandler(async (req, res) => {
    const body = z.object({ email, code, newPassword: password }).parse(req.body);
    await verifyOtp(body.email, 'reset', body.code);
    const user = await findUser(body.email);
    if (!user || user.status !== 'active') throw OTP_EXPIRED();
    await db(getDb().user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(body.newPassword, BCRYPT_ROUNDS) } }), 'password reset');
    res.json({ ok: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const row = await db(getDb().user.findUnique({ where: { id: me.id } }), 'me');
    if (!row) throw unauthorized('Account not found', 'INVALID_TOKEN');
    res.json({ user: userDto(row) });
  }),
);

authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const body = z.object({ displayName }).parse(req.body);
    const row = await db(getDb().user.update({ where: { id: me.id }, data: { displayName: body.displayName } }), 'me update');
    res.json({ user: userDto(row) });
  }),
);

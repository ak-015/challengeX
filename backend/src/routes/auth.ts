import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async';
import { db, getDb } from '../lib/db';
import { AppError, forbidden, unauthorized } from '../lib/errors';
import { signToken } from '../lib/jwt';
import { toUserRow } from '../lib/rows';
import { currentUser, requireAuth } from '../middleware/auth';
import { authEmailLimiter, authIpLimiter } from '../middleware/rateLimit';
import { issueOtp, verifyOtp } from '../services/otp';

const email = z.string().trim().toLowerCase().email().max(254);
const password = z.string().min(8, 'must be at least 8 characters').max(72, 'must be at most 72 characters');
const displayName = z.string().trim().min(1).max(50);
const code = z.string().trim().regex(/^\d{6}$/, 'must be 6 digits');

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar_url: string | null;
  email_verified: boolean;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
}

const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export const userDto = (u: Pick<UserRow, 'id' | 'email' | 'display_name' | 'avatar_url' | 'role' | 'email_verified'>) => ({
  id: u.id,
  email: u.email,
  displayName: u.display_name,
  avatarUrl: u.avatar_url,
  role: u.role,
  emailVerified: u.email_verified,
});

async function findUser(e: string): Promise<UserRow | null> {
  const p = await db(getDb().user.findUnique({ where: { email: e } }), 'user by email');
  if (!p) return null;
  return toUserRow(p) as UserRow;
}

export const authRouter = Router();
authRouter.use(authIpLimiter);

authRouter.post(
  '/signup',
  authEmailLimiter,
  asyncHandler(async (req, res) => {
    const body = z.object({ email, password, displayName }).parse(req.body);
    const existing = await findUser(body.email);
    if (existing?.email_verified) throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
    const hash = await bcrypt.hash(body.password, 10);
    if (existing) {
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
    if (!user) throw new AppError(400, 'OTP_EXPIRED', 'Code expired or already used. Request a new one.');
    if (user.status === 'suspended') throw forbidden('This account is suspended', 'ACCOUNT_SUSPENDED');
    await db(getDb().user.update({ where: { id: user.id }, data: { emailVerified: true, lastLoginAt: new Date() } }), 'verify user');
    res.json({ token: signToken(user.id), user: userDto(user) });
  }),
);

authRouter.post(
  '/resend-otp',
  authEmailLimiter,
  asyncHandler(async (req, res) => {
    const body = z.object({ email, purpose: z.enum(['signup', 'reset']).default('signup') }).parse(req.body);
    const user = await findUser(body.email);
    // Same response whether or not the account exists (no enumeration).
    const eligible = user && (body.purpose === 'signup' ? !user.email_verified : user.email_verified);
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
    const ok = await bcrypt.compare(body.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !ok) throw unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');
    if (user.status === 'suspended') throw forbidden('This account is suspended', 'ACCOUNT_SUSPENDED');
    if (!user.email_verified) {
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
    if (user?.email_verified && user.status === 'active') await issueOtp(body.email, 'reset');
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
    if (!user) throw new AppError(400, 'OTP_EXPIRED', 'Code expired or already used. Request a new one.');
    await db(getDb().user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(body.newPassword, 10) } }), 'password reset');
    res.json({ ok: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const row = await findUser(me.email);
    const dto = row ?? { id: me.id, email: me.email, display_name: me.displayName, avatar_url: me.avatarUrl, role: me.role, email_verified: true as const };
    res.json({ user: userDto(dto) });
  }),
);

authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = currentUser(req);
    const body = z.object({ displayName }).parse(req.body);
    const p = await db(getDb().user.update({ where: { id: me.id }, data: { displayName: body.displayName } }), 'me update');
    res.json({ user: userDto({ id: p.id, email: p.email, display_name: p.displayName, avatar_url: p.avatarUrl, role: p.role as UserRow['role'], email_verified: p.emailVerified }) });
  }),
);

import type { RequestHandler } from 'express';
import { asyncHandler } from '../lib/async';
import { db, getDb } from '../lib/db';
import { forbidden, unauthorized } from '../lib/errors';
import { verifyToken } from '../lib/jwt';

/**
 * Validates the Bearer token AND re-reads the user from the database on every request, so a
 * suspension, demotion or deletion takes effect immediately (all existing sessions die at once).
 */
export const requireAuth: RequestHandler = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) throw unauthorized();
  let sub: string;
  try {
    sub = verifyToken(header.slice(7)).sub;
  } catch {
    throw unauthorized('Session expired, please sign in again', 'INVALID_TOKEN');
  }
  const data = await db(
    getDb().user.findUnique({
      where: { id: sub },
      select: { id: true, email: true, displayName: true, avatarUrl: true, avatarPublicId: true, emailVerified: true, role: true, status: true },
    }),
    'auth user',
  );
  if (!data) throw unauthorized('Account not found', 'INVALID_TOKEN');
  if (data.status === 'suspended') throw forbidden('This account is suspended', 'ACCOUNT_SUSPENDED');
  if (!data.emailVerified) throw forbidden('Verify your email first', 'EMAIL_NOT_VERIFIED');
  req.user = {
    id: data.id,
    email: data.email,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl,
    avatarPublicId: data.avatarPublicId,
    role: data.role as 'user' | 'admin',
  };
  next();
});

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== 'admin') return next(forbidden('Admin access required'));
  next();
};

export function currentUser(req: Express.Request) {
  if (!req.user) throw unauthorized();
  return req.user;
}


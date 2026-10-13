import type { Request } from 'express';
import rateLimit from 'express-rate-limit';

const handler = (_req: Request, res: import('express').Response) => {
  res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down and try again shortly' } });
};

const base = { standardHeaders: true, legacyHeaders: false, handler } as const;

export const apiLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 1000 });
export const authIpLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 200 });
export const authEmailLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60_000,
  limit: 12,
  keyGenerator: (req: Request) => {
    const email = (req.body as { email?: unknown } | undefined)?.email;
    return typeof email === 'string' && email ? `email:${email.trim().toLowerCase()}` : `ip:${req.ip ?? 'unknown'}`;
  },
});
export const aiLimiter = rateLimit({
  ...base,
  windowMs: 10 * 60_000,
  limit: 80,
  keyGenerator: (req: Request) => `user:${req.user?.id ?? req.ip ?? 'unknown'}`,
});
export const publicLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 60 });
export const adminLimiter = rateLimit({
  ...base,
  windowMs: 60_000,
  limit: 120,
  keyGenerator: (req: Request) => `admin:${req.user?.id ?? req.ip ?? 'unknown'}`,
});

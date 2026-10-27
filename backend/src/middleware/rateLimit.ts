import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Rate limiters. Counters live in process memory, so limits are per server instance.
 * Run a single instance, or put a shared store in front, if you need global limits.
 */

const rateLimitHandler = (_req: Request, res: Response) => {
  res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests, slow down and try again shortly' } });
};

const keyByUserOrIp = (req: Request): string => (req.user ? `user:${req.user.id}` : `ip:${req.ip ?? 'unknown'}`);

const keyByEmailOrIp = (req: Request): string => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' && email ? `email:${email.trim().toLowerCase()}` : `ip:${req.ip ?? 'unknown'}`;
};

const limiter = (windowMs: number, max: number, keyGenerator?: (req: Request) => string) =>
  rateLimit({ windowMs, max, keyGenerator, standardHeaders: true, legacyHeaders: false, handler: rateLimitHandler });

/** Global umbrella on every /api route: 1000 requests / 15 min per IP. */
export const apiLimiter = limiter(15 * 60_000, 1000);
/** Auth endpoints, per IP: 200 requests / 15 min. */
export const authIpLimiter = limiter(15 * 60_000, 200);
/** Auth endpoints, per email: 12 requests / 15 min. */
export const authEmailLimiter = limiter(15 * 60_000, 12, keyByEmailOrIp);
/** AI generation endpoints, per signed-in user: 80 requests / 10 min. */
export const aiLimiter = limiter(10 * 60_000, 80, keyByUserOrIp);
/** Creating public share links, per signed-in user: 30 requests / 10 min. */
export const shareLimiter = limiter(10 * 60_000, 30, keyByUserOrIp);
/** Public (unauthenticated) share reads, per IP: 60 requests / min. */
export const publicLimiter = limiter(60_000, 60);
/** Admin API, per admin: 120 requests / min. */
export const adminLimiter = limiter(60_000, 120, keyByUserOrIp);

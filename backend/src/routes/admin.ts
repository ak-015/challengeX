import { Router } from 'express';
import { z } from 'zod';
import { emailProviders, env } from '../config/env';
import { asyncHandler } from '../lib/async';
import { db, getDb } from '../lib/db';
import { conflict, notFound } from '../lib/errors';
import { recentFailures } from '../lib/failures';
import { parsePage } from '../lib/pagination';
import { iso, toSessionRow } from '../lib/rows';
import { currentUser, requireAdmin, requireAuth } from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimit';
import { describePools } from '../services/ai/modelPool';
import { getAllPools } from '../services/ai/pools';
import { assertAdminChangeAllowed, type AdminAction } from '../services/adminRules';
import { destroyAsset } from '../services/cloudinary/adapter';
import { loadSession, sessionToDto, sessionToListItem } from '../services/engine/sessions';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin, adminLimiter);

const uuid = z.string().uuid();
// Never select passwordHash, OTP data or secrets in admin responses.
const userSelect = { id: true, email: true, displayName: true, avatarUrl: true, emailVerified: true, role: true, status: true, lastLoginAt: true, createdAt: true } as const;

async function audit(adminId: string, action: string, target: string): Promise<void> {
  await db(getDb().adminAudit.create({ data: { adminId, action, target } }), 'admin audit');
}

async function activeAdminCount(): Promise<number> {
  return db(getDb().user.count({ where: { role: 'admin', status: 'active' } }), 'admin count');
}

interface TargetRow {
  id: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  email_verified: boolean;
  avatar_public_id?: string | null;
}

async function loadTarget(id: string): Promise<TargetRow> {
  const row = await db(
    getDb().user.findUnique({ where: { id }, select: { id: true, email: true, role: true, status: true, emailVerified: true, avatarPublicId: true } }),
    'admin target',
  );
  if (!row) throw notFound('User not found');
  return { id: row.id, email: row.email, role: row.role as TargetRow['role'], status: row.status as TargetRow['status'], email_verified: row.emailVerified, avatar_public_id: row.avatarPublicId };
}

/** Replaces the old `admin_stats_json()` SQL function with Prisma aggregations. Same JSON shape. */
async function adminStats() {
  const prisma = getDb();
  const day = 86_400_000;
  const start = new Date(Date.now() - 29 * day);
  start.setHours(0, 0, 0, 0);

  const [users, verifiedUsers, trials, completedTrials, roadmaps, shares, verdictRows, avgRow, signupRows, trialRows, ai24, aiByModel, skipRows] =
    await Promise.all([
      db(prisma.user.count(), 'stats users'),
      db(prisma.user.count({ where: { emailVerified: true } }), 'stats verified'),
      db(prisma.session.count({ where: { kind: 'trial' } }), 'stats trials'),
      db(prisma.session.count({ where: { kind: 'trial', status: 'complete' } }), 'stats completed'),
      db(prisma.roadmap.count(), 'stats roadmaps'),
      db(prisma.share.count(), 'stats shares'),
      db(prisma.session.groupBy({ by: ['verdict'], where: { kind: 'trial', verdict: { not: null } }, _count: { verdict: true } }), 'stats verdicts'),
      db(prisma.session.aggregate({ where: { kind: 'trial', totalScore: { not: null } }, _avg: { totalScore: true } }), 'stats avg'),
      db(prisma.user.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }), 'stats signups'),
      db(prisma.session.findMany({ where: { kind: 'trial', createdAt: { gte: start } }, select: { createdAt: true } }), 'stats trials/day'),
      db(prisma.aiEvent.findMany({ where: { createdAt: { gt: new Date(Date.now() - day) } }, select: { ok: true, model: true, latencyMs: true } }), 'stats ai'),
      db(prisma.aiEvent.groupBy({ by: ['model'], where: { createdAt: { gt: new Date(Date.now() - day) } }, _count: { model: true } }), 'stats ai models'),
      db(prisma.session.findMany({ where: { kind: 'trial' }, select: { skippedCount: true, qa: true } }), 'stats skip'),
    ]);

  const key = (d: Date) => d.toISOString().slice(0, 10);
  const perDay = (dates: Date[]) => {
    const counts = new Map<string, number>();
    for (const d of dates) counts.set(key(d), (counts.get(key(d)) ?? 0) + 1);
    const out: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(start.getTime() + (29 - i) * day);
      const k = key(d);
      out.push({ day: k, count: counts.get(k) ?? 0 });
    }
    return out;
  };

  const quantile = (sorted: number[], q: number): number | null => {
    if (sorted.length === 0) return null;
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return Math.round(sorted[base]! + (sorted[base + 1] !== undefined ? rest * (sorted[base + 1]! - sorted[base]!) : 0));
  };
  const byModel = new Map<string, { calls: number; ok: number; lat: number[] }>();
  for (const e of ai24) {
    const m = byModel.get(e.model) ?? { calls: 0, ok: 0, lat: [] };
    m.calls += 1;
    if (e.ok) {
      m.ok += 1;
      m.lat.push(e.latencyMs);
    }
    byModel.set(e.model, m);
  }

  let skipped = 0;
  let questions = 0;
  for (const s of skipRows) {
    skipped += s.skippedCount;
    questions += Array.isArray(s.qa) ? s.qa.length : 0;
  }

  const aiOk = ai24.filter((e) => e.ok).length;
  return {
    totals: { users, verifiedUsers, trials, completedTrials, roadmaps, shares },
    verdictDistribution: Object.fromEntries(verdictRows.map((r) => [r.verdict as string, r._count.verdict])),
    avgScore: avgRow._avg.totalScore === null || avgRow._avg.totalScore === undefined ? null : Math.round(avgRow._avg.totalScore * 10) / 10,
    signupsPerDay: perDay(signupRows.map((r) => new Date(r.createdAt))),
    trialsPerDay: perDay(trialRows.map((r) => new Date(r.createdAt))),
    ai: {
      last24h: { calls: ai24.length, successRate: ai24.length === 0 ? null : Math.round((aiOk / ai24.length) * 1000) / 1000 },
      byModel: [...byModel.entries()].map(([model, m]) => {
        const lat = [...m.lat].sort((a, b) => a - b);
        const calls = aiByModel.find((g) => g.model === model)?._count.model ?? m.calls;
        return { model, calls, successRate: Math.round((m.ok / m.calls) * 1000) / 1000, p50Ms: quantile(lat, 0.5), p95Ms: quantile(lat, 0.95) };
      }),
    },
    skipRate: questions === 0 ? 0 : Math.round((skipped / questions) * 1000) / 1000,
  };
}

// ---------------------------------------------------------------- stats
adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json(await adminStats());
  }),
);

// ---------------------------------------------------------------- users
adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = parsePage(req.query);
    const q = z.object({ q: z.string().trim().max(100).optional() }).parse(req.query).q?.trim();
    const where = q ? { OR: [{ email: { contains: q, mode: 'insensitive' as const } }, { displayName: { contains: q, mode: 'insensitive' as const } }] } : {};
    const prisma = getDb();
    const [total, rows] = await Promise.all([
      db(prisma.user.count({ where }), 'admin users count'),
      db(prisma.user.findMany({ where, select: userSelect, orderBy: { createdAt: 'desc' }, skip, take }), 'admin users'),
    ]);
    res.json({
      items: rows.map((u) => ({
        id: u.id, email: u.email, displayName: u.displayName, avatarUrl: u.avatarUrl, emailVerified: u.emailVerified,
        role: u.role, status: u.status, lastLoginAt: iso(u.lastLoginAt), createdAt: iso(u.createdAt),
      })),
      page, pageSize, total,
    });
  }),
);

adminRouter.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const admin = currentUser(req);
    const targetId = uuid.parse(req.params.id);
    const body = z
      .object({ status: z.enum(['active', 'suspended']).optional(), role: z.enum(['user', 'admin']).optional() })
      .refine((b) => b.status !== undefined || b.role !== undefined, 'provide status or role')
      .parse(req.body);
    const target = await loadTarget(targetId);

    const actions: AdminAction[] = [];
    if (body.status && body.status !== target.status) actions.push(body.status === 'suspended' ? 'suspend' : 'reactivate');
    if (body.role && body.role !== target.role) actions.push(body.role === 'user' ? 'demote' : 'promote');
    if (actions.includes('promote') && (!target.email_verified || (body.status ?? target.status) !== 'active')) {
      throw conflict('NOT_ELIGIBLE', 'Only verified, active users can become admins');
    }
    const count = await activeAdminCount();
    for (const action of actions) {
      assertAdminChangeAllowed({ actorId: admin.id, target, action, activeAdminCount: count, seededEmails: env().ADMIN_EMAILS });
    }
    if (actions.length > 0) {
      await db(getDb().user.update({ where: { id: targetId }, data: { ...(body.status ? { status: body.status } : {}), ...(body.role ? { role: body.role } : {}) } }), 'admin user update');
      for (const action of actions) await audit(admin.id, `user.${action}`, targetId);
    }
    const row = await db(getDb().user.findUnique({ where: { id: targetId }, select: userSelect }), 'admin user reload');
    if (!row) throw notFound('User not found');
    res.json({ id: row.id, email: row.email, displayName: row.displayName, role: row.role, status: row.status, emailVerified: row.emailVerified });
  }),
);

adminRouter.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const admin = currentUser(req);
    const targetId = uuid.parse(req.params.id);
    const target = await loadTarget(targetId);
    assertAdminChangeAllowed({ actorId: admin.id, target, action: 'delete', activeAdminCount: await activeAdminCount(), seededEmails: env().ADMIN_EMAILS });
    if (target.avatar_public_id) await destroyAsset(target.avatar_public_id);
    await db(getDb().user.delete({ where: { id: targetId } }), 'admin user delete'); // cascades sessions, roadmaps, shares
    await audit(admin.id, 'user.delete', targetId);
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------- sessions
adminRouter.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = parsePage(req.query);
    const f = z
      .object({ kind: z.enum(['trial', 'ideas', 'roadmap']).optional(), verdict: z.enum(['KILL', 'PIVOT', 'BUILD']).optional(), userId: uuid.optional() })
      .parse(req.query);
    const where = { ...(f.kind ? { kind: f.kind } : {}), ...(f.verdict ? { verdict: f.verdict } : {}), ...(f.userId ? { userId: f.userId } : {}) };
    const prisma = getDb();
    const [total, rows] = await Promise.all([
      db(prisma.session.count({ where }), 'admin sessions count'),
      db(
        prisma.session.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take, include: { user: { select: { email: true, displayName: true } } } }),
        'admin sessions',
      ),
    ]);
    res.json({
      items: rows.map((r) => ({ ...sessionToListItem(toSessionRow(r)), userId: r.userId, userEmail: r.user?.email ?? null, userName: r.user?.displayName ?? null })),
      page, pageSize, total,
    });
  }),
);

adminRouter.get(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const s = await loadSession(uuid.parse(req.params.id));
    res.json(sessionToDto(s));
  }),
);

adminRouter.delete(
  '/sessions/:id',
  asyncHandler(async (req, res) => {
    const admin = currentUser(req);
    const s = await loadSession(uuid.parse(req.params.id));
    await db(getDb().share.deleteMany({ where: { refId: s.id } }), 'admin share cleanup');
    await db(getDb().session.delete({ where: { id: s.id } }), 'admin session delete');
    await audit(admin.id, 'session.delete', s.id);
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------- shares
adminRouter.get(
  '/shares',
  asyncHandler(async (req, res) => {
    const { page, pageSize, skip, take } = parsePage(req.query);
    const prisma = getDb();
    const [total, rows] = await Promise.all([
      db(prisma.share.count(), 'admin shares count'),
      db(
        prisma.share.findMany({ orderBy: { createdAt: 'desc' }, skip, take, include: { user: { select: { email: true, displayName: true } } } }),
        'admin shares',
      ),
    ]);
    res.json({
      items: rows.map((r) => ({ slug: r.slug, kind: r.kind, userId: r.userId, userEmail: r.user?.email ?? null, revoked: r.revoked, createdAt: iso(r.createdAt) })),
      page, pageSize, total,
    });
  }),
);

adminRouter.delete(
  '/shares/:slug',
  asyncHandler(async (req, res) => {
    const admin = currentUser(req);
    const slug = z.string().regex(/^[A-Za-z0-9]{10}$/).parse(req.params.slug);
    const claimed = await db(getDb().share.updateMany({ where: { slug }, data: { revoked: true } }), 'admin revoke');
    if (claimed.count === 0) throw notFound('Share not found');
    await audit(admin.id, 'share.revoke', slug);
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------- system
adminRouter.get(
  '/system',
  asyncHandler(async (_req, res) => {
    const e = env();
    res.json({
      models: describePools(getAllPools()),
      search: { provider: e.SEARCH_PROVIDER, configured: e.SEARCH_PROVIDER === 'tavily' ? !!e.TAVILY_API_KEY : !!e.BRAVE_API_KEY },
      email: emailProviders(),
      recentFailures: recentFailures(),
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion: process.version,
    });
  }),
);

// Model ids contain "/", so clients must URL-encode them (e.g. meta%2Fllama-3.1-8b-instruct).
adminRouter.post(
  '/models/:id/reset',
  asyncHandler(async (req, res) => {
    const admin = currentUser(req);
    const modelId = z.string().min(1).max(200).parse(req.params.id);
    const found = getAllPools().map((p) => p.reset(modelId)).some(Boolean);
    if (!found) throw notFound('Model not configured');
    await audit(admin.id, 'model.reset', modelId);
    res.json({ ok: true, models: describePools(getAllPools()) });
  }),
);

import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async';
import { db, getDb } from '../lib/db';
import { parsePage } from '../lib/pagination';
import { isoStr } from '../lib/rows';
import { currentUser, requireAuth } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimit';
import { generateRoadmap, getRoadmap } from '../services/engine/roadmapService';

const opt = (max: number) => z.string().trim().max(max).optional();

export const roadmapsRouter = Router();
roadmapsRouter.use(requireAuth);

roadmapsRouter.post(
  '/roadmaps',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        trialId: z.string().uuid().optional(),
        ideaText: z.string().trim().min(20).max(2000).optional(),
        techStack: opt(200),
        marketing: opt(200),
        team: opt(200),
        timeline: opt(200),
        budget: opt(200),
        platform: opt(200),
        extra: opt(600),
      })
      .refine((b) => !!b.trialId || !!b.ideaText, { message: 'provide trialId or ideaText', path: ['trialId'] })
      .parse(req.body);
    res.status(201).json(await generateRoadmap(currentUser(req).id, body));
  }),
);

roadmapsRouter.get(
  '/roadmaps',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { page, pageSize, skip, take } = parsePage(req.query);
    const where = { userId: user.id };
    const prisma = getDb();
    const [total, rows] = await Promise.all([
      db(prisma.roadmap.count({ where }), 'roadmap list count'),
      db(prisma.roadmap.findMany({ where, select: { id: true, trialId: true, title: true, createdAt: true }, orderBy: { createdAt: 'desc' }, skip, take }), 'roadmap list'),
    ]);
    res.json({ items: rows.map((r) => ({ id: r.id, trialId: r.trialId, title: r.title, createdAt: isoStr(r.createdAt) })), page, pageSize, total });
  }),
);

roadmapsRouter.get(
  '/roadmaps/:id',
  asyncHandler(async (req, res) => {
    res.json(await getRoadmap(currentUser(req).id, z.string().uuid().parse(req.params.id)));
  }),
);

// Completed BUILD / PIVOT trials that a roadmap can be generated from.
roadmapsRouter.get(
  '/roadmap-sources',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await db(
      getDb().session.findMany({
        where: { userId: user.id, kind: 'trial', status: 'complete', verdict: { in: ['BUILD', 'PIVOT'] } },
        select: { id: true, title: true, verdict: true, totalScore: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      'roadmap sources',
    );
    res.json({ items: rows.map((r) => ({ id: r.id, title: r.title, verdict: r.verdict, totalScore: r.totalScore, updatedAt: isoStr(r.updatedAt) })) });
  }),
);

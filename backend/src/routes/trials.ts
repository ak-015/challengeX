import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async';
import { db, getDb } from '../lib/db';
import { parsePage } from '../lib/pagination';
import { toSessionRow } from '../lib/rows';
import { currentUser, requireAuth } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimit';
import { DEFAULT_MODE, MODE_KEYS } from '../services/engine/constants';
import { loadOwnedSession, sessionToDto, sessionToListItem } from '../services/engine/sessions';
import { answerQuestion, createTrial, generateVerdict, nextQuestion, patchUnderstanding, resolveExtension } from '../services/engine/trialService';

const id = z.string().uuid();
export const trialsRouter = Router();
trialsRouter.use(requireAuth);

trialsRouter.post(
  '/',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        idea: z.string().trim().min(20).max(2000),
        mode: z.enum(MODE_KEYS).default(DEFAULT_MODE),
      })
      .parse(req.body);
    res.status(201).json(await createTrial(currentUser(req).id, body));
  }),
);

trialsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { page, pageSize, skip, take } = parsePage(req.query);
    const q = z
      .object({ kind: z.enum(['trial', 'ideas', 'roadmap']).optional(), saved: z.enum(['true', 'false']).optional() })
      .parse(req.query);
    const where = { userId: user.id, ...(q.kind ? { kind: q.kind } : {}), ...(q.saved ? { saved: q.saved === 'true' } : {}) };
    const prisma = getDb();
    const [total, rows] = await Promise.all([
      db(prisma.session.count({ where }), 'trial list count'),
      db(prisma.session.findMany({ where, orderBy: { updatedAt: 'desc' }, skip, take }), 'trial list'),
    ]);
    const items = rows.map((r) => toSessionRow(r));
    res.json({ items: items.map(sessionToListItem), page, pageSize, total });
  }),
);

trialsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(sessionToDto(await loadOwnedSession(currentUser(req).id, id.parse(req.params.id))));
  }),
);

trialsRouter.patch(
  '/:id/understanding',
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        problem: z.string().trim().min(1).max(600).optional(),
        targetUsers: z.string().trim().min(1).max(400).optional(),
        proposedSolution: z.string().trim().min(1).max(600).optional(),
        title: z.string().trim().min(1).max(60).optional(),
      })
      .refine((b) => Object.keys(b).length > 0, 'provide at least one field')
      .parse(req.body);
    res.json(await patchUnderstanding(currentUser(req).id, id.parse(req.params.id), body));
  }),
);

trialsRouter.post(
  '/:id/extend',
  asyncHandler(async (req, res) => {
    const body = z.object({ action: z.enum(['continue', 'verdict']) }).parse(req.body);
    res.json(await resolveExtension(currentUser(req).id, id.parse(req.params.id), body.action));
  }),
);

trialsRouter.post(
  '/:id/next',
  aiLimiter,
  asyncHandler(async (req, res) => {
    res.json(await nextQuestion(currentUser(req).id, id.parse(req.params.id)));
  }),
);

trialsRouter.post(
  '/:id/answer',
  asyncHandler(async (req, res) => {
    const body = z
      .object({ questionId: z.string().uuid(), answer: z.string().trim().max(1500).optional(), skipped: z.boolean().optional() })
      .refine((b) => b.skipped === true || (b.answer !== undefined && b.answer.length > 0), { message: 'provide an answer or skipped:true', path: ['answer'] })
      .parse(req.body);
    res.json(await answerQuestion(currentUser(req).id, id.parse(req.params.id), body));
  }),
);

trialsRouter.post(
  '/:id/verdict',
  aiLimiter,
  asyncHandler(async (req, res) => {
    res.json(await generateVerdict(currentUser(req).id, id.parse(req.params.id)));
  }),
);

trialsRouter.post(
  '/:id/save',
  asyncHandler(async (req, res) => {
    const body = z.object({ saved: z.boolean() }).parse(req.body);
    const s = await loadOwnedSession(currentUser(req).id, id.parse(req.params.id));
    await db(getDb().session.update({ where: { id: s.id }, data: { saved: body.saved } }), 'save toggle');
    res.json({ ok: true, saved: body.saved });
  }),
);

trialsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const s = await loadOwnedSession(user.id, id.parse(req.params.id));
    // A deleted verdict should not stay publicly viewable.
    await db(getDb().share.deleteMany({ where: { refId: s.id, userId: user.id } }), 'share cleanup');
    await db(getDb().session.delete({ where: { id: s.id } }), 'session delete');
    res.json({ ok: true });
  }),
);

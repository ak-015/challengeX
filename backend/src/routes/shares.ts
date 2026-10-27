import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { asyncHandler } from '../lib/async';
import { assertUrlOwned, exportFolder } from '../lib/cloudinary-paths';
import { db, getDb, isUniqueError } from '../lib/db';
import { randomSlug } from '../lib/crypto';
import { AppError, notFound } from '../lib/errors';
import { currentUser, requireAuth } from '../middleware/auth';
import { publicLimiter, shareLimiter } from '../middleware/rateLimit';
import { isoStr } from '../lib/rows';
import { assertOwner, loadSession } from '../services/engine/sessions';
import { buildRoadmapSnapshot, buildVerdictSnapshot } from '../services/shareSnapshot';

export const sharesRouter = Router();

const optionalUrl = z.string().url().max(600).nullable().optional();

sharesRouter.post(
  '/',
  requireAuth,
  shareLimiter,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = z
      .object({ kind: z.enum(['verdict', 'roadmap']), refId: z.string().uuid(), pngUrl: optionalUrl, pdfUrl: optionalUrl })
      .parse(req.body);
    const folder = exportFolder(user.id);
    for (const u of [body.pngUrl, body.pdfUrl]) if (u) assertUrlOwned(u, env().CLOUDINARY_CLOUD_NAME, folder);

    let snapshot: Record<string, unknown>;
    if (body.kind === 'verdict') {
      const s = await loadSession(body.refId);
      assertOwner(s, user.id);
      if (s.kind !== 'trial' || s.status !== 'complete' || !s.verdict) throw new AppError(409, 'NOT_SHAREABLE', 'Only completed verdicts can be shared');
      snapshot = buildVerdictSnapshot(s);
    } else {
      const r = await db(getDb().roadmap.findUnique({ where: { id: body.refId }, select: { userId: true, title: true, graph: true } }), 'roadmap for share');
      if (!r) throw notFound('Roadmap not found');
      assertOwner({ user_id: r.userId }, user.id);
      snapshot = buildRoadmapSnapshot({ title: r.title, graph: r.graph as never });
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = randomSlug(10);
      try {
        const created = await db(
          getDb().share.create({
            data: { slug, userId: user.id, kind: body.kind, refId: body.refId, snapshot: snapshot as never, pngUrl: body.pngUrl ?? null, pdfUrl: body.pdfUrl ?? null },
            select: { slug: true },
          }),
          'share insert',
        );
        res.status(201).json({ slug: created.slug });
        return;
      } catch (err) {
        if (!isUniqueError(err)) throw new AppError(500, 'DB_ERROR', 'Database error');
        // Slug collision: retry with a fresh slug.
      }
    }
    throw new AppError(500, 'SLUG_FAILED', 'Could not allocate a share link, try again');
  }),
);

// Public: snapshot + urls + owner displayName/avatar only.
sharesRouter.get(
  '/:slug',
  publicLimiter,
  asyncHandler(async (req, res) => {
    const slug = z.string().regex(/^[A-Za-z0-9]{10}$/).safeParse(req.params.slug);
    if (!slug.success) throw notFound('Share not found');
    const row = await db(
      getDb().share.findUnique({
        where: { slug: slug.data },
        select: { slug: true, kind: true, snapshot: true, pngUrl: true, pdfUrl: true, revoked: true, createdAt: true, user: { select: { displayName: true, avatarUrl: true } } },
      }),
      'share load',
    );
    if (!row || row.revoked) throw notFound('Share not found');
    res.json({
      slug: row.slug,
      kind: row.kind,
      snapshot: row.snapshot,
      pngUrl: row.pngUrl,
      pdfUrl: row.pdfUrl,
      createdAt: isoStr(row.createdAt),
      owner: { displayName: row.user?.displayName ?? 'Anonymous', avatarUrl: row.user?.avatarUrl ?? null },
    });
  }),
);

sharesRouter.delete(
  '/:slug',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const slug = z.string().regex(/^[A-Za-z0-9]{10}$/).parse(req.params.slug);
    const row = await db(getDb().share.findUnique({ where: { slug }, select: { id: true, userId: true } }), 'share owner');
    if (!row) throw notFound('Share not found');
    assertOwner({ user_id: row.userId }, user.id);
    await db(getDb().share.delete({ where: { id: row.id } }), 'share delete');
    res.json({ ok: true });
  }),
);

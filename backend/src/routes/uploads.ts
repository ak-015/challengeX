import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { asyncHandler } from '../lib/async';
import { db, getDb } from '../lib/db';
import { badRequest } from '../lib/errors';
import { assertPublicIdInFolder, assertUrlOwned, avatarFolder, exportFolder } from '../lib/cloudinary-paths';
import { currentUser, requireAuth } from '../middleware/auth';
import {
  AVATAR_MAX_BYTES,
  EXPORT_MAX_BYTES,
  avatarTransformation,
  destroyAsset,
  getResource,
  signUpload,
} from '../services/cloudinary/adapter';

const crop = z
  .object({
    x: z.number().int().min(0).max(20000),
    y: z.number().int().min(0).max(20000),
    width: z.number().int().min(16).max(8000),
    height: z.number().int().min(16).max(8000),
  })
  .optional();

export const uploadsRouter = Router();
uploadsRouter.use(requireAuth);

// The server fixes folder, formats and transformation. Client-supplied params are never signed.
uploadsRouter.post(
  '/sign',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = z.object({ purpose: z.enum(['avatar', 'export']), crop }).parse(req.body);
    if (body.purpose === 'avatar') {
      const signed = signUpload(
        { allowed_formats: 'jpg,png,webp', folder: avatarFolder(user.id), transformation: avatarTransformation(body.crop) },
        AVATAR_MAX_BYTES,
      );
      res.json(signed);
      return;
    }
    res.json(signUpload({ allowed_formats: 'png,pdf', folder: exportFolder(user.id) }, EXPORT_MAX_BYTES));
  }),
);

export const profileRouter = Router();
profileRouter.use(requireAuth);

profileRouter.post(
  '/avatar',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = z.object({ secureUrl: z.string().url().max(500), publicId: z.string().min(1).max(200) }).parse(req.body);
    const folder = avatarFolder(user.id);
    assertPublicIdInFolder(body.publicId, folder);
    assertUrlOwned(body.secureUrl, env().CLOUDINARY_CLOUD_NAME, folder);

    // Trust Cloudinary's own record, not the client's claim.
    const asset = await getResource(body.publicId);
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(asset.format.toLowerCase())) throw badRequest('AVATAR_FORMAT', 'Avatar must be jpg, png or webp');
    if (asset.bytes > AVATAR_MAX_BYTES) {
      await destroyAsset(body.publicId);
      throw badRequest('AVATAR_TOO_LARGE', 'Avatar must be 2MB or smaller');
    }
    const oldPublicId = user.avatarPublicId;
    await db(getDb().user.update({ where: { id: user.id }, data: { avatarUrl: asset.secureUrl, avatarPublicId: asset.publicId } }), 'avatar save');
    if (oldPublicId && oldPublicId !== asset.publicId) void destroyAsset(oldPublicId);
    res.json({ avatarUrl: asset.secureUrl });
  }),
);

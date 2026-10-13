import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async';
import { currentUser, requireAuth } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimit';
import { generateIdeas } from '../services/engine/ideasService';

const list = z.array(z.string().trim().min(1).max(60)).max(12).default([]);
const opt = (max: number) => z.string().trim().max(max).optional();

export const ideasRouter = Router();

ideasRouter.post(
  '/',
  requireAuth,
  aiLimiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        hobbies: list,
        interests: list,
        skills: list,
        field: opt(100),
        problemArea: opt(200),
        audience: opt(200),
        teamSize: opt(40),
        hoursPerWeek: opt(40),
        budget: opt(80),
        platform: opt(80),
        region: opt(80),
        goal: opt(200),
        avoid: opt(300),
        extra: opt(600),
      })
      .refine((b) => b.hobbies.length > 0 || b.interests.length > 0 || b.skills.length > 0 || !!b.field, {
        message: 'provide at least one of hobbies, interests, skills or field',
        path: ['hobbies'],
      })
      .parse(req.body);
    res.status(201).json(await generateIdeas(currentUser(req).id, body));
  }),
);

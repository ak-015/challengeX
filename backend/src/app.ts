import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { accessLog } from './middleware/accessLog';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimit';
import { requestId } from './middleware/requestId';
import { adminRouter } from './routes/admin';
import { authRouter } from './routes/auth';
import { ideasRouter } from './routes/ideas';
import { oauthRouter } from './routes/oauth';
import { roadmapsRouter } from './routes/roadmaps';
import { sharesRouter } from './routes/shares';
import { trialsRouter } from './routes/trials';
import { profileRouter, uploadsRouter } from './routes/uploads';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render terminates TLS in front of us

  app.use(requestId);
  // Health first: instant, no DB, no auth - safe for Render's health check and cold-start wake-ups.
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, uptime: Math.round(process.uptime()) });
  });

  app.use(helmet());
  const allowed = new Set(env().FRONTEND_ORIGIN);
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      maxAge: 600,
    }),
  );
  app.use(compression());
  app.use(accessLog);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use('/api', apiLimiter);

  app.use('/api/auth', authRouter);
  app.use('/api/auth/oauth', oauthRouter);
  app.use('/api/uploads', uploadsRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/shares', sharesRouter);
  app.use('/api/trials', trialsRouter);
  app.use('/api/ideas', ideasRouter);
  app.use('/api', roadmapsRouter); // /roadmaps, /roadmaps/:id, /roadmap-sources
  app.use('/api/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

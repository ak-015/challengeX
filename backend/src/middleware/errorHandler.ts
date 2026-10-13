import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../lib/errors';
import { log } from '../lib/logger';

export const notFoundHandler: RequestHandler = (req, res) => {
  log.warn('request failed', { requestId: req.requestId, method: req.method, path: req.path, status: 404, errorCode: 'NOT_FOUND' });
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof ZodError) {
    const first = err.issues[0];
    const where = first?.path.length ? `${first.path.join('.')}: ` : '';
    log.info('request rejected', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: 400,
      errorCode: 'VALIDATION_ERROR',
      message: `${where}${first?.message ?? 'Invalid input'}`,
    });
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `${where}${first?.message ?? 'Invalid input'}` } });
    return;
  }
  if (err instanceof AppError) {
    const metadata = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: err.status,
      errorCode: err.code,
      message: err.message,
    };
    if (err.status >= 500) log.error('request failed', metadata);
    else log.info('request rejected', metadata);
    const retryAfterMs = err.extra?.retryAfterMs;
    if (typeof retryAfterMs === 'number' && retryAfterMs > 0) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
    }
    const body: Record<string, unknown> = { code: err.code, message: err.message };
    if (err.extra) Object.assign(body, err.extra);
    res.status(err.status).json({ error: body });
    return;
  }
  const type = (err as { type?: string })?.type;
  if (type === 'entity.too.large') {
    log.warn('request failed', { requestId: req.requestId, method: req.method, path: req.path, status: 413, errorCode: 'PAYLOAD_TOO_LARGE' });
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
    return;
  }
  if (type === 'entity.parse.failed') {
    log.warn('request failed', { requestId: req.requestId, method: req.method, path: req.path, status: 400, errorCode: 'INVALID_JSON' });
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
    return;
  }
  const e = err as Error;
  log.error('unhandled error', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    status: 500,
    errorCode: 'INTERNAL',
    message: e?.message,
    stack: env().NODE_ENV === 'production' ? undefined : e?.stack,
  });
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
};

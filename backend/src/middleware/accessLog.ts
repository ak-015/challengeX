import type { RequestHandler } from 'express';
import { log } from '../lib/logger';

// Logs method, path (no query string, no body, no headers), status and duration only.
export const accessLog: RequestHandler = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    log.info('request', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
    });
  });
  next();
};

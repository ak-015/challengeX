import 'dotenv/config';
import { loadEnv } from './config/env';

function boot() {
  let cfg;
  try {
    cfg = loadEnv();
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }

  // Imports that read env lazily are loaded after validation so a bad config fails with a clear message.
  const { createApp } = require('./app') as typeof import('./app');
  const { log } = require('./lib/logger') as typeof import('./lib/logger');
  const { allConfiguredModels } = require('./services/ai/pools') as typeof import('./services/ai/pools');
  const { bootCheckModels } = require('./services/ai/nimClient') as typeof import('./services/ai/nimClient');

  const app = createApp();
  const server = app.listen(cfg.PORT, () => {
    log.info('server listening', { port: cfg.PORT, env: cfg.NODE_ENV });
    void bootCheckModels(allConfiguredModels()); // log only, never crashes
  });

  let closing = false;
  const shutdown = (signal: string) => {
    if (closing) return;
    closing = true;
    log.info('shutting down', { signal });
    server.close(() => {
      const { getDb } = require('./lib/db') as typeof import('./lib/db');
      try {
        void getDb().$disconnect().finally(() => process.exit(0));
      } catch {
        process.exit(0);
      }
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => log.error('unhandled rejection', { message: String((reason as Error)?.message ?? reason) }));
}

boot();

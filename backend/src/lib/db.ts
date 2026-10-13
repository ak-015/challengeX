import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from './errors';
import { log } from './logger';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Single universal database client (Prisma + Postgres).
 * Works with ANY Postgres provider (Supabase, Neon, Render, Railway, self-hosted, ...)
 * via one env var: DATABASE_URL.
 */
export function getDb(): PrismaClient {
  if (!globalThis.__prisma) {
    // Reads DATABASE_URL itself; env() call keeps fail-fast validation ordering.
    env();
    globalThis.__prisma = new PrismaClient();
  }
  return globalThis.__prisma;
}

export function resetDbForTests(): void {
  globalThis.__prisma = undefined;
}

const PRISMA_NOT_FOUND = 'P2025';
const PRISMA_UNIQUE = 'P2002';

/** True when the error is Prisma's "record not found" (update/delete on missing row). */
export function isNotFoundError(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === PRISMA_NOT_FOUND;
}

/** True when the error is a unique-constraint violation (e.g. duplicate share slug). */
export function isUniqueError(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === PRISMA_UNIQUE;
}

/**
 * Wraps a Prisma promise (or any promise): Prisma errors become a generic
 * DB_ERROR (details go to logs only). Use for every DB call.
 */
export async function db<T>(promise: Promise<T>, what: string): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    if (isNotFoundError(err) || isUniqueError(err)) throw err; // callers branch on these
    const message = err instanceof Error ? err.message : String(err);
    log.error('db error', { what, message });
    throw new AppError(500, 'DB_ERROR', 'Database error');
  }
}


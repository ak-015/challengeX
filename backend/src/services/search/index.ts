import { env } from '../../config/env';
import { recordFailure } from '../../lib/failures';
import { TtlLru } from '../../lib/lru';
import { BraveProvider } from './brave';
import { TavilyProvider } from './tavily';
import type { SearchProvider, SearchResult } from './types';

export type { SearchResult } from './types';

export interface SearchServiceOptions {
  timeoutMs?: number;
  retries?: number;
  cacheTtlMs?: number;
  cacheMax?: number;
  clock?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export class SearchService {
  private readonly cache: TtlLru<SearchResult[]>;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly provider: SearchProvider, opts: SearchServiceOptions = {}) {
    this.timeoutMs = opts.timeoutMs ?? 3000;
    this.retries = opts.retries ?? 1;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.cache = new TtlLru(opts.cacheMax ?? 200, opts.cacheTtlMs ?? 3_600_000, opts.clock);
  }

  get providerName(): string {
    return this.provider.name;
  }

  async search(query: string, opts: { max?: number } = {}): Promise<SearchResult[]> {
    const max = opts.max ?? 5;
    const key = `${this.provider.name}|${max}|${query.trim().toLowerCase()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
      try {
        const raw = await this.provider.search(query, { max, signal: ctrl.signal });
        const seen = new Set<string>();
        const deduped: SearchResult[] = [];
        for (const r of raw) {
          const host = hostOf(r.url);
          if (seen.has(host)) continue;
          seen.add(host);
          deduped.push(r);
        }
        const results = deduped.slice(0, max);
        this.cache.set(key, results);
        return results;
      } catch (err) {
        lastErr = err;
        recordFailure('search', (err as Error).name === 'AbortError' ? 'TIMEOUT' : (err as Error).message, this.provider.name);
        if (attempt < this.retries) await this.sleep(300);
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('search failed');
  }
}

let singleton: SearchService | undefined;

export function getSearch(): SearchService {
  if (!singleton) {
    const e = env();
    const provider: SearchProvider =
      e.SEARCH_PROVIDER === 'brave' ? new BraveProvider(e.BRAVE_API_KEY ?? '') : new TavilyProvider(e.TAVILY_API_KEY ?? '');
    singleton = new SearchService(provider);
  }
  return singleton;
}

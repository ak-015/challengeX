// ADAPTER: Brave Search. VERIFY against https://api-dashboard.search.brave.com/app/documentation/web-search
import type { SearchProvider, SearchResult } from './types';

export class BraveProvider implements SearchProvider {
  readonly name = 'brave';
  constructor(private readonly apiKey: string) {}

  async search(query: string, opts: { max: number; signal?: AbortSignal }): Promise<SearchResult[]> {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${opts.max}`;
    const res = await fetch(url, {
      headers: { accept: 'application/json', 'x-subscription-token': this.apiKey },
      signal: opts.signal,
    });
    if (!res.ok) throw new Error(`Brave HTTP ${res.status}`);
    const json = (await res.json()) as { web?: { results?: { title?: string; url?: string; description?: string }[] } };
    return (json.web?.results ?? [])
      .filter((r) => typeof r.url === 'string' && r.url)
      .map((r) => ({ title: String(r.title ?? '').slice(0, 200), url: r.url as string, snippet: String(r.description ?? '').slice(0, 400) }));
  }
}

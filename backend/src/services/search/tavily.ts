// ADAPTER: Tavily. VERIFY against https://docs.tavily.com/documentation/api-reference/endpoint/search
import type { SearchProvider, SearchResult } from './types';

export class TavilyProvider implements SearchProvider {
  readonly name = 'tavily';
  constructor(private readonly apiKey: string) {}

  async search(query: string, opts: { max: number; signal?: AbortSignal }): Promise<SearchResult[]> {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ query, max_results: opts.max, search_depth: 'basic' }),
      signal: opts.signal,
    });
    if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
    const json = (await res.json()) as { results?: { title?: string; url?: string; content?: string }[] };
    return (json.results ?? [])
      .filter((r) => typeof r.url === 'string' && r.url)
      .map((r) => ({ title: String(r.title ?? '').slice(0, 200), url: r.url as string, snippet: String(r.content ?? '').slice(0, 400) }));
  }
}

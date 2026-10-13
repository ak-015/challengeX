export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProvider {
  readonly name: string;
  search(query: string, opts: { max: number; signal?: AbortSignal }): Promise<SearchResult[]>;
}

import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Play, Eye, Trash2, BookmarkCheck } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api';
import { trialsService } from '@/services/trials';
import { Spinner, EmptyState, ErrorState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { StatusBadge, VerdictBadge } from '@/components/ui/Badge';
import { MODES } from '@/types/api';
import type { ModeKey, SessionKind, SessionListItem, SessionStatus } from '@/types/api';

const STATUS_FILTERS: { value: '' | SessionStatus; label: string }[] = [
  { value: '', label: 'All Trials' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Completed' },
];

// Backend statuses are only 'in_progress' | 'complete'. Paused/Abandoned map to
// nothing server-side — surfaced honestly as unavailable filters.
const UNSUPPORTED_STATUSES = ['Paused', 'Abandoned'];

type SortKey = 'updated_desc' | 'updated_asc' | 'score_desc' | 'title_asc';

export function HistoryPage() {
  const qc = useQueryClient();
  const { push } = useToast();
  const [params] = useSearchParams();
  const kindParam = (params.get('kind') as SessionKind | null) ?? 'trial';

  const [kind, setKind] = useState<SessionKind>(kindParam);
  const [status, setStatus] = useState<'' | SessionStatus>('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('updated_desc');
  const [page, setPage] = useState(1);
  const [savedOnly, setSavedOnly] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['trials', kind, savedOnly, page],
    queryFn: () => trialsService.list({ kind, saved: savedOnly || undefined, page, pageSize: 12 }),
    retry: false,
  });

  const filtered = useMemo(() => {
    let items: SessionListItem[] = data?.items ?? [];
    if (status) items = items.filter((i) => i.status === status);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(q));
    }
    const sorted = [...items];
    if (sort === 'updated_desc') sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    if (sort === 'updated_asc') sorted.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
    if (sort === 'score_desc') sorted.sort((a, b) => (b.totalScore ?? -1) - (a.totalScore ?? -1));
    if (sort === 'title_asc') sorted.sort((a, b) => a.title.localeCompare(b.title));
    return sorted;
  }, [data, status, search, sort]);

  const remove = async (id: string) => {
    try {
      await trialsService.remove(id);
      push('success', 'Record deleted.');
      await qc.invalidateQueries({ queryKey: ['trials'] });
    } catch (err) {
      push('error', errorMessage(err));
    }
  };

  const toggleSave = async (item: SessionListItem) => {
    try {
      await trialsService.save(item.id, !item.saved);
      await qc.invalidateQueries({ queryKey: ['trials'] });
    } catch (err) {
      push('error', errorMessage(err));
    }
  };

  const viewPath = (item: SessionListItem) => {
    if (item.kind === 'trial') return item.status === 'complete' ? `/challenge/${item.id}/verdict` : `/challenge/${item.id}/trial`;
    if (item.kind === 'roadmap') return '/roadmaps';
    return '/history?kind=ideas';
  };

  if (isLoading) return <Spinner label="Summoning your records…" />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;


  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl text-parchment">Previous Trials</h1>
        <p className="mt-2 font-narrative text-lg text-parchment-dim italic">
          Every verdict you have faced, every roadmap you have forged.
        </p>
      </header>

      {/* Controls */}
      <div className="gothic-panel p-4 sm:p-5 space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-parchment-faint" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title…"
              aria-label="Search trials"
              className="gothic-input pl-9"
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Sort" className="gothic-input sm:w-52">
            <option value="updated_desc">Newest first</option>
            <option value="updated_asc">Oldest first</option>
            <option value="score_desc">Highest score</option>
            <option value="title_asc">Title A–Z</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Status filters">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatus(f.value)}
              aria-pressed={status === f.value}
              className={`rounded-full border px-4 py-1.5 text-xs font-heading uppercase tracking-widest transition-all ${
                status === f.value
                  ? 'border-[var(--border-visible)] bg-crimson-soft text-parchment'
                  : 'border-[var(--border-subtle)] text-parchment-dim hover:text-parchment'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setSavedOnly((v) => !v)}
            aria-pressed={savedOnly}
            className={`rounded-full border px-4 py-1.5 text-xs font-heading uppercase tracking-widest transition-all ${
              savedOnly ? 'border-[var(--border-visible)] bg-crimson-soft text-parchment' : 'border-[var(--border-subtle)] text-parchment-dim hover:text-parchment'
            }`}
          >
            Saved Only
          </button>
          {UNSUPPORTED_STATUSES.map((label) => (
            <span
              key={label}
              title="Not supported by the backend (only 'in_progress' and 'complete' exist)"
              className="rounded-full border border-dashed border-[var(--border-subtle)] px-4 py-1.5 text-xs font-heading uppercase tracking-widest text-parchment-faint cursor-not-allowed"
            >
              {label} (n/a)
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Record type filters">
          {(['trial', 'ideas', 'roadmap'] as SessionKind[]).map((k) => (
            <button
              key={k}
              onClick={() => { setKind(k); setPage(1); }}
              aria-pressed={kind === k}
              className={`rounded border px-3 py-1 text-[11px] font-heading uppercase tracking-widest transition-all ${
                kind === k ? 'border-[var(--border-visible)] text-crimson-glow' : 'border-[var(--border-subtle)] text-parchment-faint hover:text-parchment-dim'
              }`}
            >
              {k === 'trial' ? 'Trials' : k === 'ideas' ? 'Ideas' : 'Roadmaps'}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No records found"
          message="Nothing matches your filters yet. Begin a new trial to fill this hall."
          action={<Link to="/challenge/new" className="gothic-btn-primary text-sm">Start a Trial</Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((item) => (
            <article key={item.id} className="gothic-panel p-5 flex flex-col gap-3 hover:shadow-crimson-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-heading text-base text-parchment truncate">{item.title}</h3>
                  <p className="text-[11px] text-parchment-faint font-heading uppercase tracking-widest mt-0.5">
                    {item.kind} · {item.mode ? MODES[item.mode as ModeKey]?.label ?? item.mode : '—'} ·{' '}
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge status={item.status} />
                  {item.verdict && <VerdictBadge verdict={item.verdict} />}
                </div>
              </div>

              {item.totalScore !== null && (
                <p className="text-sm text-parchment-dim">
                  Score: <span className="text-parchment font-heading">{item.totalScore}/100</span>
                  {item.kind === 'trial' && item.skippedCount > 0 && (
                    <span className="text-amber-400"> · {item.skippedCount} skipped</span>
                  )}
                </p>
              )}

              <div className="mt-auto flex flex-wrap gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <Link
                  to={viewPath(item)}
                  className="inline-flex items-center gap-1.5 rounded border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-heading uppercase tracking-widest text-parchment-dim hover:text-parchment hover:border-[var(--border-visible)]"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden /> View Details
                </Link>
                {item.status === 'in_progress' && (
                  <Link
                    to={`/challenge/${item.id}/trial`}
                    className="inline-flex items-center gap-1.5 rounded border border-crimson/40 bg-crimson-soft px-3 py-1.5 text-xs font-heading uppercase tracking-widest text-parchment hover:border-[var(--border-visible)]"
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden /> Continue
                  </Link>
                )}
                <button
                  onClick={() => toggleSave(item)}
                  className="inline-flex items-center gap-1.5 rounded border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-heading uppercase tracking-widest text-parchment-dim hover:text-parchment"
                  aria-pressed={item.saved}
                >
                  <BookmarkCheck className={`h-3.5 w-3.5 ${item.saved ? 'text-crimson-glow' : ''}`} aria-hidden />
                  {item.saved ? 'Saved' : 'Save'}
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="inline-flex items-center gap-1.5 rounded border border-red-900/50 px-3 py-1.5 text-xs font-heading uppercase tracking-widest text-red-400 hover:bg-red-950/40 ml-auto"
                  aria-label={`Delete ${item.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {data && data.total > data.pageSize && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="text-xs py-2">
            Previous
          </Button>
          <span className="text-sm text-parchment-dim font-heading">
            Page {data.page} of {Math.ceil(data.total / data.pageSize)}
          </span>
          <Button
            variant="ghost"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(data.total / data.pageSize)}
            className="text-xs py-2"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

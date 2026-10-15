import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Gauge } from '@/components/verdict/Gauge';
import { VerdictBadge } from '@/components/verdict/VerdictBadge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Spinner } from '@/components/ui/Spinner';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { SessionKind, SessionListItem } from '@/lib/apiTypes';
import { MODES } from '@/lib/constants';
import { trials } from '@/lib/endpoints';
import { friendlyMessage, isAbort } from '@/lib/errors';
import { exactDate, relativeTime } from '@/lib/format';
import { cn } from '@/lib/cn';

type Tab = 'all' | 'trial' | 'ideas' | 'roadmap' | 'saved';
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'trial', label: 'Trials' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'roadmap', label: 'Roadmaps' },
  { id: 'saved', label: 'Saved' },
];
const KIND_ICON: Record<SessionKind, IconName> = { trial: 'sword', ideas: 'bulb', roadmap: 'map' };
const KIND_LABEL: Record<SessionKind, string> = { trial: 'Trial', ideas: 'Ideas', roadmap: 'Roadmap' };
const PAGE = 20;

/** Status chips — only the states the data model actually has (in_progress / complete). */
type StatusFilter = 'all' | 'in_progress' | 'complete';
const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All Trials' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'complete', label: 'Completed' },
];
const SORTS = [
  { id: 'recent', label: 'Recently updated' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'title', label: 'Title A – Z' },
  { id: 'score', label: 'Highest score' },
] as const;
type SortId = (typeof SORTS)[number]['id'];

export function Component() {
  useDocumentTitle('History');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Initial tab can come from the URL (e.g. sidebar "Saved Ideas" links to ?tab=saved).
  const initialTab: Tab = TABS.some((t) => t.id === searchParams.get('tab')) ? (searchParams.get('tab') as Tab) : 'all';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortId>('recent');
  const [items, setItems] = useState<SessionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [del, setDel] = useState<SessionListItem | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const load = useCallback(async (t: Tab, p: number) => {
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const r = await trials.list({ kind: t === 'trial' || t === 'ideas' || t === 'roadmap' ? t : undefined, saved: t === 'saved' ? true : undefined, page: p, pageSize: PAGE }, { signal: ctrl.current.signal });
      setItems((cur) => (p === 1 ? r.items : [...cur, ...r.items.filter((n) => !cur.some((c) => c.id === n.id))]));
      setTotal(r.total);
      setPage(p);
    } catch (e) {
      if (!isAbort(e)) setError(friendlyMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setItems([]);
    void load(tab, 1);
    return () => ctrl.current?.abort();
  }, [tab, load]);

  // Keep the tab in sync when the URL changes from outside (sidebar links).
  useEffect(() => {
    const t: Tab = TABS.some((x) => x.id === searchParams.get('tab')) ? (searchParams.get('tab') as Tab) : 'all';
    setTab((cur) => (cur === t ? cur : t));
  }, [searchParams]);

  const reopen = async (it: SessionListItem) => {
    if (it.kind === 'trial') return navigate(it.status === 'complete' ? `/verdict/${it.id}` : `/trial/${it.id}`);
    if (it.kind === 'ideas') return navigate(`/ideas?id=${it.id}`);
    setOpening(it.id);
    try {
      const s = await trials.get(it.id);
      const rid = s.verdictPayload?.roadmapId;
      if (rid) navigate(`/roadmap/${rid}`);
      else setError('That roadmap could not be found.');
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setOpening(null);
    }
  };

  const confirmDelete = async () => {
    if (!del) return;
    setDelBusy(true);
    setDelErr(null);
    try {
      await trials.remove(del.id);
      setItems((cur) => cur.filter((i) => i.id !== del.id));
      setTotal((t) => Math.max(0, t - 1));
      setDel(null);
    } catch (e) {
      setDelErr(friendlyMessage(e));
    } finally {
      setDelBusy(false);
    }
  };

  // Client-side search + status + sort over the loaded page (the API has no search/sort params).
  const visible = items
    .filter((it) => (status === 'all' ? true : it.status === status))
    .filter((it) => (query.trim() ? it.title.toLowerCase().includes(query.trim().toLowerCase()) : true))
    .slice()
    .sort((a, b) => {
      if (sort === 'oldest') return a.updatedAt.localeCompare(b.updatedAt);
      if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sort === 'score') return (b.totalScore ?? -1) - (a.totalScore ?? -1);
      return b.updatedAt.localeCompare(a.updatedAt);
    });

  const more = items.length < total;
  return (
    <div className="safe-pad mx-auto max-w-4xl space-y-5 py-6">
      <div className="text-center">
        <p className="eyebrow mb-2">The Archives</p>
        <Heading level={1}>
          Load Previous <span className="text-crimson-text">Trials</span>
        </Heading>
        <div className="rune-divider mt-3" aria-hidden="true">
          <span />
        </div>
        <p className="mx-auto mt-3 max-w-xl font-prose text-lg text-ash-dim">
          Revisit your past ideas, trials, and results. Learn from what worked, what didn’t, and continue your journey.
        </p>
      </div>

      {/* search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ash-faint">
            <Icon name="history" size={18} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your previous trials…"
            aria-label="Search your previous trials"
            className="field pl-10"
          />
        </div>
        <label className="flex items-center gap-2">
          <span className="font-label text-xs uppercase tracking-wider text-ash-faint">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortId)} className="field sm:w-52" aria-label="Sort trials">
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div role="tablist" aria-label="Filter history" className="flex flex-wrap justify-center gap-1 rounded-md border border-[rgba(229,9,32,0.5)] p-1">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => { setTab(t.id); setSearchParams(t.id === 'all' ? {} : { tab: t.id }, { replace: true }); }} className={cn('min-h-[44px] min-w-[72px] flex-1 rounded px-3 font-label text-xs font-bold uppercase tracking-wider sm:text-sm', tab === t.id ? 'bg-crimson-btn text-white' : 'text-ash hover:bg-[rgba(229,9,32,0.15)]')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* status chips */}
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Filter by status">
        {STATUS_FILTERS.map((s) => (
          <button key={s.id} type="button" aria-pressed={status === s.id} data-selected={status === s.id || undefined} className="chip" onClick={() => setStatus(s.id)}>
            {status === s.id && <Icon name="check" size={13} />}
            {s.label}
          </button>
        ))}
      </div>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="flex flex-wrap items-center justify-center gap-3 rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
            {error}
            <Button size="sm" variant="ghost" onClick={() => void load(tab, 1)}><Icon name="retry" size={16} /> Retry</Button>
          </p>
        )}
      </div>

      {!loading && !error && items.length === 0 && (
        <GlassPanel className="space-y-3 p-8 text-center">
          <Icon name="scroll" size={40} className="mx-auto text-crimson-text" />
          <p className="font-display text-xl text-ash">The archives are empty</p>
          <p className="font-prose text-ash-dim">{tab === 'saved' ? 'Nothing saved yet. Save a verdict to keep it here.' : 'Challenge an idea and it will be recorded here.'}</p>
          <Button onClick={() => navigate('/altar', { state: { intro: true } })}>Challenge an idea</Button>
        </GlassPanel>
      )}

      {!loading && !error && items.length > 0 && visible.length === 0 && (
        <GlassPanel className="space-y-3 p-8 text-center">
          <Icon name="history" size={36} className="mx-auto text-ash-faint" />
          <p className="font-display text-lg text-ash">Nothing matches</p>
          <p className="font-prose text-ash-dim">Try a different search or clear the filters.</p>
          <Button size="sm" variant="ghost" onClick={() => (setQuery(''), setStatus('all'))}>
            Clear filters
          </Button>
        </GlassPanel>
      )}

      {/* loading skeletons */}
      {loading && items.length === 0 && (
        <ul className="space-y-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="glass flex items-center gap-4 p-4" style={{ borderRadius: 10 }}>
              <span className="skeleton h-11 w-11 shrink-0 rounded-full" />
              <span className="min-w-0 flex-1 space-y-2">
                <span className="skeleton block h-4 w-2/3" />
                <span className="skeleton block h-3 w-1/3" />
              </span>
              <span className="skeleton hidden h-9 w-24 rounded sm:block" />
            </li>
          ))}
        </ul>
      )}

      <ul className="space-y-3">
        {visible.map((it) => (
          <li key={it.id}>
            <GlassPanel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center" corners={false}>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-crimson text-crimson-text" title={KIND_LABEL[it.kind]}>
                <Icon name={KIND_ICON[it.kind]} size={22} />
                <span className="sr-only">{KIND_LABEL[it.kind]}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-base font-bold text-ash">{it.title || 'Untitled'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  {it.mode && <span className="rounded-full border border-[rgba(112,52,58,0.9)] px-2 py-0.5 font-label text-ash">{MODES[it.mode].label}</span>}
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 font-label',
                      it.status === 'complete' ? 'border-[rgba(63,207,127,0.6)] text-[#8ff0b4]' : 'border-[rgba(255,210,122,0.6)] text-[#ffd27a]',
                    )}
                  >
                    {it.status === 'complete' ? 'Completed' : 'In Progress'}
                  </span>
                  {it.saved && (
                    <span className="inline-flex items-center gap-1 font-label text-[#ffd27a]">
                      <Icon name="star" size={12} /> Saved
                    </span>
                  )}
                  <time dateTime={it.updatedAt} title={exactDate(it.updatedAt)} className="font-prose text-ash-dim">
                    {relativeTime(it.updatedAt)}
                  </time>
                </div>
              </div>
              {it.kind === 'trial' && it.verdict && it.totalScore !== null && (
                <div className="flex items-center gap-2">
                  <Gauge score={it.totalScore} verdict={it.verdict} animate={false} size={56} label={false} />
                  <VerdictBadge verdict={it.verdict} size="sm" />
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void reopen(it)} loading={opening === it.id}>
                  {it.status === 'in_progress' ? 'Continue' : 'View Details'}
                </Button>
                <Button size="sm" variant="quiet" onClick={() => (setDelErr(null), setDel(it))} aria-label={`Delete ${it.title}`}>
                  <Icon name="trash" size={16} /> Delete
                </Button>
              </div>
            </GlassPanel>
          </li>
        ))}
      </ul>

      {loading && <p role="status" className="flex items-center justify-center gap-3 font-label text-ash"><Spinner /> Searching the archives…</p>}
      {more && !loading && !error && (
        <div className="text-center"><Button variant="ghost" onClick={() => void load(tab, page + 1)}>Load more</Button></div>
      )}

      {del && <ConfirmDialog title="Delete this record?" message={`“${del.title || 'Untitled'}” and any public share of it will be removed for good.`} busy={delBusy} error={delErr} onConfirm={() => void confirmDelete()} onCancel={() => setDel(null)} />}
    </div>
  );
}

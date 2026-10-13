import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export function Component() {
  useDocumentTitle('History');
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('all');
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

  const more = items.length < total;
  return (
    <div className="safe-pad mx-auto max-w-4xl space-y-5 py-6">
      <div className="text-center"><Heading level={1}>History</Heading></div>

      <div role="tablist" aria-label="Filter history" className="flex flex-wrap justify-center gap-1 rounded-md border border-[rgba(225,29,46,0.5)] p-1">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn('min-h-[44px] min-w-[72px] flex-1 rounded px-3 font-label text-xs font-bold uppercase tracking-wider sm:text-sm', tab === t.id ? 'bg-crimson-btn text-white' : 'text-ash hover:bg-[rgba(225,29,46,0.15)]')}>
            {t.label}
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

      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.id}>
            <GlassPanel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center" corners={false}>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-crimson text-crimson-text" title={KIND_LABEL[it.kind]}>
                <Icon name={KIND_ICON[it.kind]} size={22} />
                <span className="sr-only">{KIND_LABEL[it.kind]}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-label text-base font-bold text-ash">{it.title || 'Untitled'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  {it.mode && <span className="rounded-full border border-[rgba(185,176,168,0.6)] px-2 py-0.5 font-label text-ash">{MODES[it.mode].label}</span>}
                  <span className="rounded-full border border-[rgba(185,176,168,0.6)] px-2 py-0.5 font-label text-ash">{it.status === 'complete' ? 'Complete' : 'In progress'}</span>
                  {it.saved && <span className="inline-flex items-center gap-1 font-label text-[#ffd27a]"><Icon name="star" size={12} /> Saved</span>}
                  <time dateTime={it.updatedAt} title={exactDate(it.updatedAt)} className="font-prose text-ash-dim">{relativeTime(it.updatedAt)}</time>
                </div>
              </div>
              {it.kind === 'trial' && it.verdict && it.totalScore !== null && (
                <div className="flex items-center gap-2">
                  <Gauge score={it.totalScore} verdict={it.verdict} animate={false} size={56} label={false} />
                  <VerdictBadge verdict={it.verdict} size="sm" />
                </div>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void reopen(it)} loading={opening === it.id}>Reopen</Button>
                <Button size="sm" variant="quiet" onClick={() => (setDelErr(null), setDel(it))} aria-label={`Delete ${it.title}`}><Icon name="trash" size={16} /> Delete</Button>
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

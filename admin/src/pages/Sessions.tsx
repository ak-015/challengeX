import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi, type AdminSessionItem, type AdminUser } from '../adminApi';
import { useAsync, useDebounced } from '../useAsync';
import { AdminTable, type Col } from '../ui/AdminTable';
import { Drawer } from '../ui/Dialogs';
import { Pagination } from '../ui/Pagination';
import { Pill } from '../ui/Pill';
import { ErrorState } from '../ui/States';
import { Button } from '@/components/ui/Button';
import { CategoryTag } from '@/components/ui/CategoryTag';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Spinner } from '@/components/ui/Spinner';
import { VerdictBadge } from '@/components/verdict/VerdictBadge';
import type { SessionDto } from '@/lib/apiTypes';
import { MODES } from '@/lib/constants';
import { friendlyMessage } from '@/lib/errors';
import { exactDate, relativeTime } from '@/lib/format';

const selectCls = 'field !min-h-[44px]';

/** Pick a user by searching name/email (the API filters sessions by user id). */
function UserPicker({ value, onChange }: { value: string; onChange: (id: string, label?: string) => void }) {
  const [text, setText] = useState('');
  const dq = useDebounced(text, 350);
  const [label, setLabel] = useState<string | null>(null);
  const { data, loading } = useAsync(async (s) => (dq.trim().length >= 2 ? (await adminApi.users({ q: dq, pageSize: 6 }, { signal: s })).items : ([] as AdminUser[])), [dq]);
  return (
    <div className="relative">
      <label htmlFor="sess-user" className="mb-1 block font-label text-sm text-ash">User</label>
      {value ? (
        <div className="flex min-h-[44px] items-center justify-between gap-2 rounded-md border border-crimson bg-[#3a0509] px-3">
          <span className="min-w-0 truncate font-prose text-sm text-ash">{label ?? `user ${value.slice(0, 8)}…`}</span>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center text-ash" aria-label="Clear user filter" onClick={() => (onChange(''), setLabel(null))}>×</button>
        </div>
      ) : (
        <>
          <input id="sess-user" className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search a user…" autoComplete="off" />
          {dq.trim().length >= 2 && (
            <ul className="glass absolute z-20 mt-1 max-h-60 w-full overflow-auto !rounded-md p-1" role="listbox" aria-label="Matching users">
              {loading && <li className="p-2 text-sm text-ash-dim"><Spinner size={14} /> Searching…</li>}
              {!loading && data?.length === 0 && <li className="p-2 text-sm text-ash-dim">No match</li>}
              {data?.map((u) => (
                <li key={u.id} role="option" aria-selected={false}>
                  <button type="button" className="min-h-[44px] w-full break-all rounded px-2 text-left font-prose text-sm text-ash hover:bg-[rgba(225,29,46,0.18)]" onClick={() => (setLabel(u.email), onChange(u.id, u.email), setText(''))}>
                    {u.displayName} · {u.email}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Detail({ id }: { id: string }) {
  const { data, error, loading, reload } = useAsync((s) => adminApi.session(id, { signal: s }), [id]);
  if (loading) return <p role="status" className="flex items-center gap-2 text-ash"><Spinner /> Loading…</p>;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;
  return <DetailBody s={data} />;
}

const Sec = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-5">
    <h3 className="mb-2 border-b border-[rgba(225,29,46,0.4)] pb-1 font-label text-xs font-bold uppercase tracking-wider text-crimson-text">{title}</h3>
    {children}
  </section>
);

function DetailBody({ s }: { s: SessionDto }) {
  const u = (s.understanding ?? {}) as Record<string, unknown>;
  const p = (s.verdictPayload ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Pill>{s.kind}</Pill>
        <Pill tone={s.status === 'complete' ? 'ok' : 'warn'}>{s.status === 'complete' ? 'Complete' : 'In progress'}</Pill>
        {s.mode && <Pill>{MODES[s.mode].label}</Pill>}
        {s.verdict && s.totalScore !== null && <VerdictBadge verdict={s.verdict} size="sm" />}
        {s.totalScore !== null && <Pill>{s.totalScore}/100</Pill>}
        <Pill>{s.skippedCount} skipped</Pill>
      </div>
      <p className="mb-4 font-prose text-xs text-ash-dim">Created {exactDate(s.createdAt)} · updated {exactDate(s.updatedAt)} · id {s.id}</p>

      {s.ideaText && <Sec title="Idea"><p className="whitespace-pre-wrap break-words font-prose text-ash">{s.ideaText}</p></Sec>}
      {(str(u.problem) || str(u.proposedSolution)) && (
        <Sec title="Understanding">
          <dl className="space-y-2 font-prose text-sm text-ash">
            {([['Problem', u.problem], ['Target users', u.targetUsers], ['Proposed solution', u.proposedSolution]] as const).map(([k, v]) => (
              <div key={k}><dt className="font-label text-xs uppercase text-ash-dim">{k}</dt><dd className="break-words">{str(v)}</dd></div>
            ))}
          </dl>
        </Sec>
      )}
      {s.qa.length > 0 && (
        <Sec title={`Questions & answers (${s.qa.length})`}>
          <ol className="space-y-3">
            {s.qa.map((q) => (
              <li key={q.id} className="rounded border border-[rgba(185,176,168,0.3)] bg-black/40 p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2"><span className="font-label text-xs text-ash-dim">Q{q.index}</span><CategoryTag category={q.category} />{q.assessment && <Pill tone={q.assessment.risk === 'high' ? 'bad' : q.assessment.risk === 'medium' ? 'warn' : 'ok'}>{q.assessment.risk} risk</Pill>}</div>
                <p className="break-words font-label text-sm font-semibold text-ash">{q.text}</p>
                <p className="mt-1 whitespace-pre-wrap break-words font-prose text-sm text-ash-dim">{q.skipped ? <em>skipped</em> : (q.answer ?? <em>unanswered</em>)}</p>
                {q.assessment && <p className="mt-1 break-words font-prose text-xs text-ash-mute">Assumption: {q.assessment.assumption}</p>}
              </li>
            ))}
          </ol>
        </Sec>
      )}
      {s.assumptions.length > 0 && (
        <Sec title={`Assumptions (${s.assumptions.length})`}>
          <ul className="space-y-1.5 font-prose text-sm text-ash">
            {s.assumptions.map((a) => <li key={a.id} className="break-words"><Pill tone={a.risk === 'high' ? 'bad' : 'warn'}>{a.risk}</Pill> <span className="text-ash-dim">[{a.category}]</span> {a.text}</li>)}
          </ul>
        </Sec>
      )}
      {s.competitors && s.competitors.length > 0 && (
        <Sec title="Competitors">
          <ul className="space-y-1.5 font-prose text-sm text-ash">{s.competitors.map((c) => <li key={c.name} className="break-words"><strong>{c.name}</strong> ({c.source === 'search' ? 'search' : 'AI estimate'}): {c.whatTheyDo}</li>)}</ul>
        </Sec>
      )}
      {str(p.summary) && <Sec title="Verdict summary"><p className="font-prose text-ash">{str(p.summary)}</p></Sec>}
      {s.verdictPayload && (
        <Sec title="Verdict payload (raw)">
          <details>
            <summary className="min-h-[44px] cursor-pointer font-label text-sm text-ash underline">Show JSON</summary>
            <pre className="scroll-thin mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded border border-[rgba(185,176,168,0.3)] bg-black/60 p-3 text-xs text-ash">{JSON.stringify(s.verdictPayload, null, 2)}</pre>
          </details>
        </Sec>
      )}
    </div>
  );
}

export default function Sessions() {
  const [params, setParams] = useSearchParams();
  const [kind, setKind] = useState('');
  const [verdict, setVerdict] = useState('');
  const [userId, setUserId] = useState(params.get('user') ?? '');
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useAsync((s) => adminApi.sessions({ kind, verdict, userId, page }, { signal: s }), [kind, verdict, userId, page]);

  const [detail, setDetail] = useState<AdminSessionItem | null>(null);
  const [del, setDel] = useState<AdminSessionItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (userId) next.set('user', userId);
    else next.delete('user');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const confirmDelete = async () => {
    if (!del) return;
    setBusy(true);
    setDelErr(null);
    try {
      await adminApi.deleteSession(del.id);
      setNotice(`Deleted “${del.title || del.id}”. Recorded in the audit log.`);
      setDel(null);
      reload();
    } catch (e) {
      setDelErr(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cols: Col<AdminSessionItem>[] = [
    { key: 'title', header: 'Title', card: 'title', cell: (r) => <span className="break-words font-label text-sm font-semibold text-ash">{r.title || 'Untitled'}</span> },
    { key: 'user', header: 'User', cell: (r) => <span className="break-all">{r.userEmail ?? r.userId.slice(0, 8)}</span> },
    { key: 'kind', header: 'Kind', cell: (r) => <Pill>{r.kind}</Pill> },
    { key: 'mode', header: 'Mode', cell: (r) => (r.mode ? MODES[r.mode].label : 'n/a') },
    { key: 'score', header: 'Score', cell: (r) => (r.totalScore === null ? 'n/a' : r.totalScore) },
    { key: 'verdict', header: 'Verdict', cell: (r) => (r.verdict ? <VerdictBadge verdict={r.verdict} size="sm" /> : 'n/a') },
    { key: 'skipped', header: 'Skipped', cell: (r) => r.skippedCount },
    { key: 'status', header: 'Status', cell: (r) => <Pill tone={r.status === 'complete' ? 'ok' : 'warn'}>{r.status === 'complete' ? 'Complete' : 'In progress'}</Pill> },
    { key: 'created', header: 'Created', cell: (r) => <time dateTime={r.createdAt} title={exactDate(r.createdAt)}>{relativeTime(r.createdAt)}</time> },
    { key: 'updated', header: 'Updated', cell: (r) => <time dateTime={r.updatedAt} title={exactDate(r.updatedAt)}>{relativeTime(r.updatedAt)}</time> },
  ];

  return (
    <div className="space-y-4">
      <Heading level={2}>Sessions</Heading>
      <GlassPanel corners={false} className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label htmlFor="f-kind" className="mb-1 block font-label text-sm text-ash">Kind</label>
          <select id="f-kind" className={selectCls} value={kind} onChange={(e) => (setKind(e.target.value), setPage(1))}>
            <option value="">All kinds</option><option value="trial">Trials</option><option value="ideas">Ideas</option><option value="roadmap">Roadmaps</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-verdict" className="mb-1 block font-label text-sm text-ash">Verdict</label>
          <select id="f-verdict" className={selectCls} value={verdict} onChange={(e) => (setVerdict(e.target.value), setPage(1))}>
            <option value="">Any verdict</option><option value="KILL">KILL</option><option value="PIVOT">PIVOT</option><option value="BUILD">BUILD</option>
          </select>
        </div>
        <UserPicker value={userId} onChange={(id) => (setUserId(id), setPage(1))} />
      </GlassPanel>

      <div aria-live="polite">{notice && <p role="status" className="rounded border border-[#3fcf7f] bg-[#0b2417] p-3 text-sm text-[#b8f5cf]">{notice}</p>}</div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <GlassPanel corners={false} className="overflow-hidden">
          <AdminTable
            caption="Sessions (metadata only)"
            columns={cols}
            rows={data?.items ?? null}
            rowKey={(r) => r.id}
            loading={loading}
            empty={{ title: 'No sessions match', text: 'Change the filters.' }}
            actions={(r) => (
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Details</Button>
                <Button size="sm" variant="danger" onClick={() => (setDelErr(null), setDel(r))}>Delete</Button>
              </div>
            )}
          />
          {data && <Pagination page={page} pageSize={data.pageSize} total={data.total} onPage={setPage} busy={loading} />}
        </GlassPanel>
      )}

      {detail && (
        <Drawer title={detail.title || 'Session'} onClose={() => setDetail(null)}>
          <Detail id={detail.id} />
        </Drawer>
      )}
      {del && <ConfirmDialog title="Delete this session?" message={`“${del.title || del.id}” by ${del.userEmail ?? 'a user'} and any public share of it will be removed permanently.`} busy={busy} error={delErr} onConfirm={() => void confirmDelete()} onCancel={() => setDel(null)} />}
    </div>
  );
}

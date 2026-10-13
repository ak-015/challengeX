import { useEffect, useState } from 'react';
import { adminApi, type ModelStatus } from '../adminApi';
import { formatUptime, modelStatusText } from '../rules';
import { usePolled } from '../useAsync';
import { Pill } from '../ui/Pill';
import { ErrorState } from '../ui/States';
import { Skeleton } from '../ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import { friendlyMessage } from '@/lib/errors';
import { exactDate, relativeTime } from '@/lib/format';

const REFRESH_MS = 10_000;

function ModelPill({ m, fetchedAt, now }: { m: ModelStatus; fetchedAt: number; now: number }) {
  // Live countdown between refreshes: the server reports the remaining time at fetch time.
  const remaining = Math.max(0, m.cooldownRemainingMs - (now - fetchedAt));
  if (m.status === 'disabled') return <Pill tone="bad" icon="close">Disabled</Pill>;
  if (m.status === 'cooling' && remaining > 0) return <Pill tone="warn" icon="warning">{modelStatusText({ status: 'cooling', cooldownRemainingMs: remaining })}</Pill>;
  return <Pill tone="ok" icon="check">Healthy</Pill>;
}

export default function System() {
  const [auto, setAuto] = useState(true);
  const { data, error, loading, refreshing, updatedAt, refresh, setData } = usePolled((s) => adminApi.system({ signal: s }), REFRESH_MS, auto);
  const [now, setNow] = useState(Date.now());
  const [target, setTarget] = useState<ModelStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const reset = async () => {
    if (!target) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await adminApi.resetModel(target.id);
      setData((d) => (d ? { ...d, models: r.models } : d));
      setNotice(`Reset ${target.id}. Recorded in the audit log.`);
      setTarget(null);
    } catch (e) {
      setErr(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const fetchedAt = updatedAt ?? now;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading level={2}>System</Heading>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2 font-label text-sm text-ash">
            <input type="checkbox" className="h-5 w-5 accent-[#c41423]" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
            Auto-refresh every 10 s
          </label>
          <Button size="sm" variant="ghost" onClick={() => void refresh()} loading={refreshing}>
            <Icon name="retry" size={16} /> Refresh now
          </Button>
        </div>
      </div>
      <p className="font-prose text-xs text-ash-dim" aria-live="polite">
        {auto ? 'Auto-refresh is on.' : 'Auto-refresh is paused.'} {updatedAt ? `Last updated ${new Date(updatedAt).toLocaleTimeString()}.` : ''}
      </p>
      <div aria-live="polite">{notice && <p role="status" className="rounded border border-[#3fcf7f] bg-[#0b2417] p-3 text-sm text-[#b8f5cf]">{notice}</p>}</div>

      {error && !data ? (
        <ErrorState error={error} onRetry={() => void refresh()} />
      ) : (
        <>
          {error ? <p role="alert" className="rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">Refresh failed: {friendlyMessage(error)} Showing the last data.</p> : null}

          <section aria-label="Process">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                ['Uptime', data ? formatUptime(data.uptimeSeconds + Math.max(0, Math.round((now - fetchedAt) / 1000))) : '…'],
                ['Node version', data?.nodeVersion ?? '…'],
                ['Search provider', data ? `${data.search.provider}` : '…'],
                ['Models', data ? String(data.models.length) : '…'],
              ].map(([k, v]) => (
                <GlassPanel key={k} corners={false} className="p-4">
                  <p className="font-label text-xs uppercase tracking-wider text-ash-dim">{k}</p>
                  <p className="mt-1 break-words font-display text-xl font-bold text-white">{loading ? <Skeleton className="h-6 w-20" /> : v}</p>
                </GlassPanel>
              ))}
            </div>
          </section>

          <section aria-label="Providers" className="grid gap-3 md:grid-cols-3">
            {([
              ['Search', data ? data.search.configured : null, data ? `Provider: ${data.search.provider}` : ''],
              ['Email: Brevo (primary)', data ? data.email.brevo : null, ''],
              ['Email: Resend (fallback)', data ? data.email.resend : null, ''],
            ] as const).map(([k, ok, sub]) => (
              <GlassPanel key={k} corners={false} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-label text-sm font-bold text-ash">{k}</p>
                  {sub && <p className="font-prose text-xs text-ash-dim">{sub}</p>}
                  <p className="font-prose text-xs text-ash-mute">Configured status only. Keys are never sent to the browser.</p>
                </div>
                {ok === null ? <Skeleton className="h-6 w-20" /> : ok ? <Pill tone="ok" icon="check">Configured: yes</Pill> : <Pill tone="bad" icon="close">Configured: no</Pill>}
              </GlassPanel>
            ))}
          </section>

          <GlassPanel corners={false} className="overflow-hidden">
            <h3 className="px-4 pt-4 font-label text-base font-bold text-ash">Model pool</h3>
            {loading || !data ? (
              <div className="p-4"><Skeleton className="h-28 w-full" /></div>
            ) : (
              <div className="scroll-thin overflow-x-auto p-2">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <caption className="sr-only">Model pool state</caption>
                  <thead>
                    <tr className="border-b border-[rgba(225,29,46,0.4)]">
                      {['Model', 'Pools', 'State', 'In flight', 'Failures', 'Last latency', 'Last error', 'Actions'].map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 font-label text-xs font-bold uppercase tracking-wider text-ash-dim">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.models.map((m) => (
                      <tr key={m.id} className="border-b border-[rgba(185,176,168,0.15)] align-top">
                        <th scope="row" className="break-all px-3 py-2 text-left font-label text-sm font-semibold text-ash">{m.id}</th>
                        <td className="px-3 py-2 font-prose text-sm text-ash">{m.pools.join(', ')}</td>
                        <td className="px-3 py-2"><ModelPill m={m} fetchedAt={fetchedAt} now={now} /></td>
                        <td className="px-3 py-2 font-prose text-sm text-ash">{m.inflight}</td>
                        <td className="px-3 py-2 font-prose text-sm text-ash">{m.consecutiveFailures}</td>
                        <td className="px-3 py-2 font-prose text-sm text-ash">{m.lastLatencyMs === null ? 'n/a' : `${m.lastLatencyMs} ms`}</td>
                        <td className="px-3 py-2 font-prose text-sm text-ash">{m.lastError ?? 'none'}</td>
                        <td className="px-3 py-2"><Button size="sm" variant="ghost" onClick={() => (setErr(null), setTarget(m))}>Reset</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassPanel>

          <GlassPanel corners={false} className="overflow-hidden">
            <h3 className="px-4 pt-4 font-label text-base font-bold text-ash">Last provider failures (no secrets)</h3>
            {data && data.recentFailures.length === 0 ? (
              <p className="p-4 font-prose text-ash-dim">No failures since the server started.</p>
            ) : (
              <div className="scroll-thin overflow-x-auto p-2">
                <table className="w-full min-w-[520px] border-collapse text-left">
                  <caption className="sr-only">Recent provider failures</caption>
                  <thead>
                    <tr className="border-b border-[rgba(225,29,46,0.4)]">
                      {['When', 'Provider', 'Target', 'Code'].map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 font-label text-xs font-bold uppercase tracking-wider text-ash-dim">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.recentFailures ?? []).map((f, i) => (
                      <tr key={`${f.at}-${i}`} className="border-b border-[rgba(185,176,168,0.15)]">
                        <th scope="row" className="px-3 py-2 text-left font-prose text-sm font-normal text-ash"><time dateTime={f.at} title={exactDate(f.at)}>{relativeTime(f.at)}</time></th>
                        <td className="px-3 py-2"><Pill>{f.provider}</Pill></td>
                        <td className="break-all px-3 py-2 font-prose text-sm text-ash">{f.target ?? 'n/a'}</td>
                        <td className="break-all px-3 py-2 font-prose text-sm text-ash">{f.code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassPanel>
        </>
      )}

      {target && <ConfirmDialog title="Reset this model?" message={`Clears the cooldown and failure count of ${target.id} and re-enables it if it was disabled. A bad model ID will be disabled again on its next 401/403/404.`} confirmLabel="Reset" busy={busy} error={err} onConfirm={() => void reset()} onCancel={() => setTarget(null)} />}
    </div>
  );
}

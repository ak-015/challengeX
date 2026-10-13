import { adminApi } from '../adminApi';
import { percent, verdictBars } from '../rules';
import { useAsync } from '../useAsync';
import { Bars, Sparkline, StatCard } from '../ui/Charts';
import { ErrorState } from '../ui/States';
import { Skeleton } from '../ui/Skeleton';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { VERDICT_STYLE } from '@/lib/constants';

export default function Dashboard() {
  const { data, error, loading, reload } = useAsync((s) => adminApi.stats({ signal: s }), []);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const t = data?.totals;
  const bars = data ? verdictBars(data.verdictDistribution) : [];
  const ai = data?.ai;

  return (
    <div className="space-y-5">
      <Heading level={2}>Dashboard</Heading>

      <section aria-label="Totals" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatCard label="Users" value={t?.users ?? 0} loading={loading} />
        <StatCard label="Verified users" value={t?.verifiedUsers ?? 0} sub={t && t.users ? `${Math.round((t.verifiedUsers / t.users) * 100)}% of users` : undefined} loading={loading} />
        <StatCard label="Trials" value={t?.trials ?? 0} loading={loading} />
        <StatCard label="Completed trials" value={t?.completedTrials ?? 0} sub={t && t.trials ? `${Math.round((t.completedTrials / t.trials) * 100)}% completion` : undefined} loading={loading} />
        <StatCard label="Roadmaps" value={t?.roadmaps ?? 0} loading={loading} />
        <StatCard label="Shares" value={t?.shares ?? 0} loading={loading} />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassPanel corners={false} className="space-y-4 p-4 lg:col-span-2">
          <h3 className="font-label text-base font-bold text-ash">Verdict distribution</h3>
          {loading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <Bars rows={bars.map((b) => ({ label: b.verdict, value: b.count, display: `${b.count} (${b.pct}%)`, color: VERDICT_STYLE[b.verdict].ring }))} />
          )}
        </GlassPanel>
        <GlassPanel corners={false} className="space-y-3 p-4">
          <h3 className="font-label text-base font-bold text-ash">Quality signals</h3>
          <div>
            <p className="font-label text-xs uppercase tracking-wider text-ash-dim">Average score</p>
            <p className="font-display text-3xl font-bold text-white">{loading ? '…' : data?.avgScore === null || data?.avgScore === undefined ? 'n/a' : `${data.avgScore} / 100`}</p>
          </div>
          <div>
            <p className="font-label text-xs uppercase tracking-wider text-ash-dim">Skip rate</p>
            <p className="font-display text-3xl font-bold text-white">{loading ? '…' : percent(data?.skipRate)}</p>
            <p className="font-prose text-xs text-ash-dim">Skipped questions ÷ questions asked</p>
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassPanel corners={false} className="p-4">
          {loading || !data ? <Skeleton className="h-36 w-full" /> : <Sparkline title="Signups per day" data={data.signupsPerDay} />}
        </GlassPanel>
        <GlassPanel corners={false} className="p-4">
          {loading || !data ? <Skeleton className="h-36 w-full" /> : <Sparkline title="Trials per day" data={data.trialsPerDay} color="#7cc4ff" />}
        </GlassPanel>
      </div>

      <GlassPanel corners={false} className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-label text-base font-bold text-ash">AI health (last 24 h)</h3>
          <p className="font-prose text-sm text-ash-dim">{loading ? '…' : `${ai?.last24h.calls ?? 0} calls · ${percent(ai?.last24h.successRate)} success`}</p>
        </div>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : ai && ai.byModel.length > 0 ? (
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[480px] border-collapse text-left">
              <caption className="sr-only">AI success rate and latency per model, last 24 hours</caption>
              <thead>
                <tr className="border-b border-[rgba(225,29,46,0.4)]">
                  {['Model', 'Calls', 'Success', 'p50', 'p95'].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-label text-xs font-bold uppercase tracking-wider text-ash-dim">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ai.byModel.map((m) => (
                  <tr key={m.model} className="border-b border-[rgba(185,176,168,0.15)]">
                    <th scope="row" className="break-all px-3 py-2 text-left font-label text-sm font-semibold text-ash">{m.model}</th>
                    <td className="px-3 py-2 font-prose text-sm text-ash">{m.calls}</td>
                    <td className="px-3 py-2 font-prose text-sm text-ash">{percent(m.successRate)}</td>
                    <td className="px-3 py-2 font-prose text-sm text-ash">{m.p50Ms === null ? 'n/a' : `${m.p50Ms} ms`}</td>
                    <td className="px-3 py-2 font-prose text-sm text-ash">{m.p95Ms === null ? 'n/a' : `${m.p95Ms} ms`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="font-prose text-ash-dim">No AI calls recorded in the last 24 hours.</p>
        )}
      </GlassPanel>
    </div>
  );
}

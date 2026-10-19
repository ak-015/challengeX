import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Swords, Lightbulb, Map, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { trialsService } from '@/services/trials';
import { roadmapsService } from '@/services/roadmaps';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import { VerdictBadge } from '@/components/ui/Badge';
import { errorMessage } from '@/services/api';
import { assets } from '@/utils/assets';
import { MODES } from '@/types/api';
import type { ModeKey } from '@/types/api';

export function DashboardPage() {
  const { user } = useAuth();

  const trials = useQuery({
    queryKey: ['trials', 'dashboard'],
    queryFn: () => trialsService.list({ kind: 'trial', pageSize: 5 }),
    retry: false,
  });
  const roadmaps = useQuery({
    queryKey: ['roadmaps', 'dashboard'],
    queryFn: () => roadmapsService.list({ pageSize: 3 }),
    retry: false,
  });

  if (trials.isLoading) return <Spinner label="Opening your sanctum…" />;
  if (trials.error) return <ErrorState message={errorMessage(trials.error)} onRetry={() => trials.refetch()} />;

  const items = trials.data?.items ?? [];
  const completed = items.filter((i) => i.status === 'complete').length;
  const inProgress = items.filter((i) => i.status === 'in_progress').length;
  const best = items.reduce((m, i) => Math.max(m, i.totalScore ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="relative overflow-hidden rounded-xl border border-[var(--border-subtle)]">
        <img src={assets.realmSecondary} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/75 to-transparent" aria-hidden />
        <div className="relative p-6 sm:p-10">
          <p className="text-xs font-heading uppercase tracking-[0.25em] text-crimson-glow">Sanctum</p>
          <h1 className="font-display text-2xl sm:text-4xl text-parchment mt-1">
            Welcome back, {user?.displayName ?? 'Founder'}.
          </h1>
          <p className="mt-2 max-w-xl font-narrative text-lg text-parchment-dim italic">
            The forge is hot. What will you challenge today?
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/challenge/new" className="gothic-btn-primary text-sm">New Trial</Link>
            <Link to="/paths" className="gothic-btn-ghost text-sm">All Paths</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Trials Total', value: trials.data?.total ?? 0, icon: Swords },
          { label: 'Completed', value: completed, icon: TrendingUp },
          { label: 'In Progress', value: inProgress, icon: Swords },
          { label: 'Best Score', value: best || '—', icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="gothic-panel p-4 sm:p-5">
            <s.icon className="h-4 w-4 text-crimson-glow" aria-hidden />
            <div className="mt-2 font-display text-2xl sm:text-3xl text-parchment">{s.value}</div>
            <div className="text-[10px] font-heading uppercase tracking-[0.2em] text-parchment-faint">{s.label}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 gothic-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg text-parchment">Recent Trials</h2>
            <Link to="/history" className="text-xs font-heading uppercase tracking-widest text-crimson-glow hover:underline inline-flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>
          {items.length === 0 ? (
            <EmptyState
              title="No trials yet"
              message="Your first verdict awaits. Submit an idea and face the questions."
              action={<Link to="/challenge/new" className="gothic-btn-primary text-sm">Start a Trial</Link>}
            />
          ) : (
            <ul className="divide-y divide-[var(--border-subtle)]">
              {items.map((t) => (
                <li key={t.id}>
                  <Link
                    to={t.status === 'complete' ? `/challenge/${t.id}/verdict` : `/challenge/${t.id}/trial`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-surface-hover rounded px-2 -mx-2 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-heading text-sm text-parchment truncate">{t.title}</p>
                      <p className="text-[11px] text-parchment-faint uppercase tracking-widest">
                        {t.mode ? MODES[t.mode as ModeKey]?.label ?? t.mode : ''} · {new Date(t.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {t.totalScore !== null && <span className="font-heading text-sm text-parchment">{t.totalScore}</span>}
                      {t.verdict && <VerdictBadge verdict={t.verdict} />}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-6">
          <div className="gothic-panel p-6">
            <h2 className="font-heading text-lg text-parchment mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link to="/challenge/new" className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] p-3 hover:border-[var(--border-visible)] hover:bg-surface-hover transition-all">
                <Swords className="h-4 w-4 text-crimson-glow" aria-hidden />
                <span className="font-heading text-sm text-parchment-dim">Challenge an Idea</span>
              </Link>
              <Link to="/ideas/generate" className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] p-3 hover:border-[var(--border-visible)] hover:bg-surface-hover transition-all">
                <Lightbulb className="h-4 w-4 text-crimson-glow" aria-hidden />
                <span className="font-heading text-sm text-parchment-dim">Generate Ideas</span>
              </Link>
              <Link to="/roadmaps/new" className="flex items-center gap-3 rounded-md border border-[var(--border-subtle)] p-3 hover:border-[var(--border-visible)] hover:bg-surface-hover transition-all">
                <Map className="h-4 w-4 text-crimson-glow" aria-hidden />
                <span className="font-heading text-sm text-parchment-dim">Get a Roadmap</span>
              </Link>
            </div>
          </div>

          <div className="gothic-panel p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading text-lg text-parchment">Roadmaps</h2>
              <Link to="/roadmaps" className="text-xs font-heading uppercase tracking-widest text-crimson-glow hover:underline">All</Link>
            </div>
            {roadmaps.isLoading ? (
              <p className="text-sm text-parchment-faint">Loading…</p>
            ) : (roadmaps.data?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-parchment-faint italic">None yet.</p>
            ) : (
              <ul className="space-y-2">
                {roadmaps.data!.items.slice(0, 3).map((r) => (
                  <li key={r.id}>
                    <Link to={`/roadmaps/${r.id}`} className="block text-sm text-parchment-dim hover:text-parchment truncate">
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

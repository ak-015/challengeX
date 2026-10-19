import { Link } from 'react-router-dom';
import { Bell, FlaskConical, Bookmark } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { trialsService } from '@/services/trials';
import { EmptyState } from '@/components/ui/States';
import { VerdictBadge } from '@/components/ui/Badge';

/** The backend has no notifications API — this screen states that honestly. */
export function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl text-parchment flex items-center gap-3">
          <Bell className="h-7 w-7 text-crimson-glow" aria-hidden /> Notifications
        </h1>
      </header>
      <div className="gothic-panel">
        <EmptyState
          title="No notifications API available"
          message="The existing backend does not expose a notifications endpoint, so none are shown here. This screen will light up once that capability exists — see docs/backend-capability-report.md."
          action={<Link to="/dashboard" className="gothic-btn-ghost text-sm">Back to Dashboard</Link>}
        />
      </div>
    </div>
  );
}

/** Experiments are embedded in verdict payloads (validationExperiment), not a standalone API. */
export function ExperimentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['trials', 'completed', 'experiments'],
    queryFn: () => trialsService.list({ kind: 'trial', pageSize: 50 }),
    retry: false,
  });

  const completed = (data?.items ?? []).filter((i) => i.status === 'complete');

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl text-parchment flex items-center gap-3">
          <FlaskConical className="h-7 w-7 text-crimson-glow" aria-hidden /> Experiments
        </h1>
        <p className="mt-2 font-narrative text-lg text-parchment-dim italic">
          Each completed verdict carries a cheapest-validation experiment. Open a verdict to read its full experiment.
        </p>
      </header>

      {!isLoading && completed.length === 0 ? (
        <div className="gothic-panel">
          <EmptyState
            title="No completed trials yet"
            message="Finish a trial to receive its validation experiment (metric, sample size, duration and decision rules)."
            action={<Link to="/challenge/new" className="gothic-btn-primary text-sm">Start a Trial</Link>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {completed.map((t) => (
            <Link
              key={t.id}
              to={`/challenge/${t.id}/verdict`}
              className="gothic-panel p-5 flex items-center justify-between gap-3 hover:shadow-crimson-sm transition-shadow"
            >
              <div className="min-w-0">
                <h2 className="font-heading text-sm text-parchment truncate">{t.title}</h2>
                <p className="text-[11px] text-parchment-faint uppercase tracking-widest">
                  Verdict rendered {new Date(t.updatedAt).toLocaleDateString()}
                </p>
              </div>
              {t.verdict && <VerdictBadge verdict={t.verdict} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Saved records reuse GET /trials?saved=true — a real backend filter. */
export function SavedPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['trials', 'saved'],
    queryFn: () => trialsService.list({ saved: true, pageSize: 50 }),
    retry: false,
  });

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl sm:text-4xl text-parchment flex items-center gap-3">
          <Bookmark className="h-7 w-7 text-crimson-glow" aria-hidden /> Saved
        </h1>
      </header>
      {!isLoading && items.length === 0 ? (
        <div className="gothic-panel">
          <EmptyState
            title="Nothing saved yet"
            message="Use the Save action on any trial card in History to pin it here."
            action={<Link to="/history" className="gothic-btn-ghost text-sm">Open History</Link>}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <Link
              key={t.id}
              to={t.status === 'complete' ? `/challenge/${t.id}/verdict` : `/challenge/${t.id}/trial`}
              className="gothic-panel p-5 flex items-center justify-between gap-3 hover:shadow-crimson-sm transition-shadow"
            >
              <div className="min-w-0">
                <h2 className="font-heading text-sm text-parchment truncate">{t.title}</h2>
                <p className="text-[11px] text-parchment-faint uppercase tracking-widest">{t.kind}</p>
              </div>
              {t.verdict && <VerdictBadge verdict={t.verdict} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

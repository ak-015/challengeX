import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Map, Plus } from 'lucide-react';
import { errorMessage } from '@/services/api';
import { roadmapsService } from '@/services/roadmaps';
import { Spinner, EmptyState, ErrorState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';

export function RoadmapsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['roadmaps', page],
    queryFn: () => roadmapsService.list({ page, pageSize: 12 }),
    retry: false,
  });

  if (isLoading) return <Spinner label="Gathering your roadmaps…" />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl text-parchment">Roadmaps</h1>
          <p className="mt-2 font-narrative text-lg text-parchment-dim italic">
            Phased plans with milestones, decision forks and deliverables.
          </p>
        </div>
        <Link to="/roadmaps/new" className="gothic-btn-primary text-sm">
          <Plus className="h-4 w-4" aria-hidden /> New Roadmap
        </Link>
      </header>

      {!data || data.items.length === 0 ? (
        <EmptyState
          title="No roadmaps yet"
          message="Finish a trial with a BUILD or PIVOT verdict — or bring your own idea — and forge your first roadmap."
          action={<Link to="/roadmaps/new" className="gothic-btn-primary text-sm">Get a Roadmap</Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((r) => (
            <Link
              key={r.id}
              to={`/roadmaps/${r.id}`}
              className="gothic-panel p-5 flex flex-col gap-2 hover:shadow-crimson-sm hover:border-[var(--border-visible)] transition-all group"
            >
              <span className="text-crimson-glow group-hover:shadow-crimson-sm">
                <Map className="h-5 w-5" aria-hidden />
              </span>
              <h2 className="font-heading text-base text-parchment leading-snug">{r.title}</h2>
              <p className="mt-auto pt-2 text-xs text-parchment-faint font-heading uppercase tracking-widest">
                {new Date(r.createdAt).toLocaleDateString()}
              </p>
            </Link>
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
          <Button variant="ghost" onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(data.total / data.pageSize)} className="text-xs py-2">
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Lightbulb, ArrowLeft } from 'lucide-react';
import { errorMessage } from '@/services/api';
import { trialsService } from '@/services/trials';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import type { GeneratedIdea } from '@/types/api';

/** A previously generated set of ideas (history → "View Details"). */
export function IdeaDetailPage() {
  const { id = '' } = useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['trial', id],
    queryFn: () => trialsService.get(id),
    enabled: !!id,
    retry: false,
  });

  if (isLoading) return <Spinner label="Opening the idea set…" />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;

  const payload = data?.verdictPayload as { ideas?: GeneratedIdea[] } | null | undefined;
  const ideas = payload?.ideas ?? [];
  if (!data || ideas.length === 0) {
    return (
      <EmptyState
        title="No ideas found in this record"
        message="This record does not contain generated ideas."
        action={<Link to="/history?kind=ideas" className="gothic-btn-ghost text-sm">Back to History</Link>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/history?kind=ideas" className="inline-flex items-center gap-1.5 text-xs font-heading uppercase tracking-widest text-crimson-glow hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> History
      </Link>
      <header className="mb-8 mt-3">
        <h1 className="font-display text-2xl sm:text-4xl text-parchment">{data.title}</h1>
        <p className="mt-1 text-xs font-heading uppercase tracking-widest text-parchment-faint">
          Generated {new Date(data.createdAt).toLocaleDateString()}
        </p>
      </header>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ideas.map((idea, i) => (
          <article key={`${idea.title}-${i}`} className="gothic-panel flex flex-col gap-3 p-5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-heading text-base leading-snug text-parchment">{idea.title}</h2>
              <span className="shrink-0 rounded bg-crimson-soft p-1.5 text-crimson-glow"><Lightbulb className="h-4 w-4" aria-hidden /></span>
            </div>
            <p className="font-narrative text-sm italic text-parchment-dim">{idea.oneLiner}</p>
            <dl className="mt-auto space-y-2 text-xs">
              {([
                ['Problem', idea.problem],
                ['Target Users', idea.targetUsers],
                ['Why You Fit', idea.whyYouFit],
                ['First Step', idea.firstStep],
                ['Main Risk', idea.mainRisk],
              ] as const).map(([k, v]) => (
                <div key={k}>
                  <dt className={`font-heading uppercase tracking-widest ${k === 'Main Risk' ? 'text-crimson-glow' : 'text-parchment-faint'}`}>{k}</dt>
                  <dd className="mt-0.5 text-parchment-dim">{v}</dd>
                </div>
              ))}
            </dl>
            <Link
              to="/challenge/new"
              state={{ idea: `${idea.title} — ${idea.oneLiner}` }}
              className="gothic-btn-ghost mt-2 py-2 text-xs"
            >
              Challenge This Idea
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

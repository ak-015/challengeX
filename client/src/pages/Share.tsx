import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Share2 } from 'lucide-react';
import { sharesService } from '@/services/shares';
import { errorMessage } from '@/services/api';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import { VerdictBadge } from '@/components/ui/Badge';

/** Public snapshot viewer — GET /shares/:slug requires no authentication. */
export function SharePage() {
  const { slug = '' } = useParams();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['share', slug],
    queryFn: () => sharesService.get(slug),
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) return <Spinner label="Opening shared record…" />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return <EmptyState title="Share not found" message="This link may have been revoked." />;

  const snapshot = data.snapshot as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="gothic-panel p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <Share2 className="h-5 w-5 text-crimson-glow" aria-hidden />
          <div>
            <p className="text-xs font-heading uppercase tracking-[0.25em] text-crimson-glow">Public {data.kind} share</p>
            <h1 className="font-display text-2xl text-parchment">
              {(snapshot['title'] as string) ?? `${data.kind} snapshot`}
            </h1>
          </div>
          {typeof snapshot['verdict'] === 'string' && <VerdictBadge verdict={snapshot['verdict'] as 'KILL' | 'PIVOT' | 'BUILD'} />}
        </div>

        <div className="flex items-center gap-3 text-sm text-parchment-dim border-t border-[var(--border-subtle)] pt-4">
          {data.owner.avatarUrl && <img src={data.owner.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />}
          <span>
            Shared by <span className="text-parchment font-heading">{data.owner.displayName}</span> on{' '}
            {new Date(data.createdAt).toLocaleDateString()}
          </span>
        </div>

        {data.pngUrl && (
          <div className="mt-6">
            <img src={data.pngUrl} alt="Shared report export" className="w-full rounded-md border border-[var(--border-subtle)]" />
          </div>
        )}

        <pre className="mt-6 max-h-96 overflow-auto rounded-md bg-black/40 border border-[var(--border-subtle)] p-4 text-xs text-parchment-dim whitespace-pre-wrap break-words">
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </div>
    </div>
  );
}

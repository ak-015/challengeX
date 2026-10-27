import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Share2 } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/services/api';
import { roadmapsService } from '@/services/roadmaps';
import { sharesService } from '@/services/shares';
import { useToast } from '@/hooks/useToast';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { RoadmapGraph } from '@/components/roadmap/RoadmapGraph';

export function RoadmapDetailPage() {
  const { id = '' } = useParams();
  const { push } = useToast();
  const [sharing, setSharing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['roadmap', id],
    queryFn: () => roadmapsService.get(id),
    enabled: !!id,
    retry: false,
  });

  const share = async () => {
    setSharing(true);
    try {
      const r = await sharesService.create({ kind: 'roadmap', refId: id });
      const url = `${window.location.origin}/share/${r.slug}`;
      await navigator.clipboard.writeText(url).catch(() => undefined);
      push('success', `Share link copied: ${url}`);
    } catch (err) {
      push('error', errorMessage(err));
    } finally {
      setSharing(false);
    }
  };

  if (isLoading) return <Spinner label="Loading roadmap…" />;
  if (error) return <ErrorState message={errorMessage(error)} onRetry={() => refetch()} />;
  if (!data) return <EmptyState title="Roadmap not found" message="This roadmap does not exist or you do not own it." />;

  return (
    <div className="w-full">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-heading uppercase tracking-[0.25em] text-crimson-glow">Roadmap</p>
          <h1 className="font-display text-2xl sm:text-4xl text-parchment">{data.title}</h1>
          <p className="mt-1 text-xs text-parchment-faint font-heading uppercase tracking-widest">
            Created {new Date(data.createdAt).toLocaleDateString()} · {data.graph.nodes.length} nodes ·{' '}
            {data.graph.edges.length} edges
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={share} loading={sharing}>
            <Share2 className="h-4 w-4" aria-hidden /> Share
          </Button>
          <Link to="/roadmaps/new" className="gothic-btn-ghost text-sm">New Roadmap</Link>
        </div>
      </header>


      <RoadmapGraph graph={data.graph} />
    </div>
  );
}

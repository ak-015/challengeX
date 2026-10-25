import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Flag, GitBranch, CheckCircle2, ArrowRight, Share2 } from 'lucide-react';
import { useState } from 'react';
import { errorMessage } from '@/services/api';
import { roadmapsService } from '@/services/roadmaps';
import { sharesService } from '@/services/shares';
import { useToast } from '@/hooks/useToast';
import { Spinner, ErrorState, EmptyState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { STAGES } from '@/types/api';
import type { GraphNode, Stage } from '@/types/api';

const stageLabel: Record<Stage, string> = {
  validate: 'Validate', spec: 'Spec', design: 'Design',
  blueprint: 'Blueprint', prototype: 'Prototype', launch: 'Launch',
};

const difficultyStyle: Record<string, string> = {
  low: 'border-emerald-800/50 text-emerald-300',
  medium: 'border-amber-800/50 text-amber-300',
  high: 'border-red-800/60 text-red-300',
};

function NodeCard({ node }: { node: GraphNode }) {
  const Icon = node.type === 'milestone' ? Flag : node.type === 'decision' ? GitBranch : CheckCircle2;
  return (
    <div className={`rounded-md border bg-surface-elevated p-4 ${difficultyStyle[node.difficulty]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-heading uppercase tracking-widest">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {node.type}{node.decisionField ? ` · ${node.decisionField}` : ''}
        </span>
        <span className={`border px-1.5 py-0.5 rounded text-[10px] uppercase tracking-widest ${difficultyStyle[node.difficulty]}`}>
          {node.difficulty}
        </span>
      </div>
      <h4 className="mt-2 font-heading text-sm text-parchment">{node.title}</h4>
      <p className="mt-1 text-xs text-parchment-dim leading-relaxed">{node.description}</p>
      <p className="mt-1.5 text-[11px] text-parchment-faint">⏱ {node.durationEstimate}</p>
      {node.deliverables.length > 0 && (
        <ul className="mt-2 space-y-0.5 border-t border-[var(--border-subtle)] pt-2">
          {node.deliverables.map((d) => (
            <li key={d} className="text-[11px] text-parchment-dim flex gap-1.5">
              <ArrowRight className="h-3 w-3 mt-0.5 shrink-0 text-crimson-glow" aria-hidden /> {d}
            </li>
          ))}
        </ul>
      )}
      {node.difficulty === 'high' && node.difficultyNote && (
        <p className="mt-2 text-[11px] text-amber-400/90 italic border-t border-[var(--border-subtle)] pt-2">
          ⚠ {node.difficultyNote}
          {node.betterPath && <> → better path: <span className="text-parchment-dim">{node.betterPath}</span></>}
        </p>
      )}
    </div>
  );
}

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

  const byStage = STAGES.map((stage) => ({
    stage,
    nodes: data.graph.nodes.filter((n) => n.stage === stage),
  }));

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


      {/* Stage columns — horizontally scrollable on mobile */}
      <div className="space-y-8">
        {byStage.map(({ stage, nodes }, si) => (
          <section key={stage}>
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-visible)] bg-crimson-soft font-display text-xs text-crimson-glow">
                {si + 1}
              </span>
              <h2 className="font-heading text-lg uppercase tracking-widest text-parchment">{stageLabel[stage]}</h2>
              <div className="h-px flex-1 bg-[var(--border-subtle)]" aria-hidden />
            </div>
            {nodes.length === 0 ? (
              <p className="text-sm text-parchment-faint italic">No nodes in this stage.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {nodes.map((n) => <NodeCard key={n.id} node={n} />)}
              </div>
            )}
          </section>
        ))}
      </div>

      {/* Alternate paths (decision branches) */}
      {data.graph.edges.filter((e) => e.kind === 'alternate').length > 0 && (
        <section className="mt-10 gothic-panel p-6">
          <h2 className="font-heading text-sm uppercase tracking-[0.2em] text-crimson-glow mb-3">
            Alternate Paths Offered
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2 text-sm">
            {data.graph.edges
              .filter((e) => e.kind === 'alternate')
              .map((e) => (
                <li key={`${e.from}>${e.to}`} className="flex items-center gap-2 text-parchment-dim">
                  <GitBranch className="h-3.5 w-3.5 text-crimson-glow shrink-0" aria-hidden />
                  <span className="font-mono text-xs">{e.from}</span>
                  <ArrowRight className="h-3 w-3" aria-hidden />
                  <span className="font-mono text-xs">{e.to}</span>
                  {e.label && <span className="text-parchment-faint italic truncate">— {e.label}</span>}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}

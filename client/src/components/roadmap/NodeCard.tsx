import { ArrowRight, CheckCircle2, Flag, GitBranch } from 'lucide-react';
import type { GraphNode } from '@/types/api';

const difficultyStyle: Record<string, string> = {
  low: 'border-emerald-800/50 text-emerald-300',
  medium: 'border-amber-800/50 text-amber-300',
  high: 'border-red-800/60 text-red-300',
};

/** Full details of one roadmap step. */
export function NodeCard({ node }: { node: GraphNode }) {
  const Icon = node.type === 'milestone' ? Flag : node.type === 'decision' ? GitBranch : CheckCircle2;
  return (
    <div className={`rounded-md border bg-surface-elevated p-4 ${difficultyStyle[node.difficulty]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-heading uppercase tracking-widest">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {node.type}
          {node.decisionField ? ` · ${node.decisionField}` : ''}
        </span>
        <span className={`border px-1.5 py-0.5 rounded text-[10px] uppercase tracking-widest ${difficultyStyle[node.difficulty]}`}>{node.difficulty}</span>
      </div>
      <h4 className="mt-2 font-display text-sm text-parchment">{node.title}</h4>
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
          {node.betterPath && (
            <>
              {' '}
              → better path: <span className="text-parchment-dim">{node.betterPath}</span>
            </>
          )}
        </p>
      )}
    </div>
  );
}

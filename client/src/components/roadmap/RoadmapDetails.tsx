import { useMemo } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Icon } from '@/components/ui/Icon';
import type { Graph } from '@/lib/apiTypes';
import { STAGE_STYLE } from '@/lib/constants';
import { orderedRecommendedPath } from '@/lib/pdfReport';

/**
 * Read-only, accessible list of EVERY roadmap step with its full detail (description, deliverables,
 * difficulty, duration, "why this is hard" note and the suggested better path). Shown under the graph
 * on the public share page so a shared roadmap carries the same complete detail as the exported PDF.
 */
export function RoadmapDetails({ title, graph }: { title: string; graph: Graph }) {
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const alternates = useMemo(() => graph.edges.filter((e) => e.kind === 'alternate'), [graph]);

  return (
    <section aria-labelledby="roadmap-details-h" className="mx-auto mt-6 max-w-3xl space-y-4">
      <h2 id="roadmap-details-h" className="font-display text-xl font-bold text-ash">
        Every step — {title}
      </h2>
      <ol className="space-y-3">
        {orderedRecommendedPath(graph).map((id) => {
          const n = byId.get(id);
          if (!n) return null;
          const st = STAGE_STYLE[n.stage];
          return (
            <li key={n.id}>
              <GlassPanel className="space-y-2 p-4" corners={false}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wider" style={{ color: st.color, borderColor: st.color }}>
                    {st.label} · {n.type}
                  </span>
                  <span className="font-label text-[11px] capitalize text-ash-dim">Difficulty: {n.difficulty}</span>
                  {n.durationEstimate && <span className="font-label text-[11px] text-ash-dim">· {n.durationEstimate}</span>}
                </div>
                <h3 className="font-label text-base font-bold text-ash">{n.title}</h3>
                <p className="font-prose text-sm text-ash-dim">{n.description}</p>
                {n.deliverables.length > 0 && (
                  <ul className="list-disc pl-5 font-prose text-sm text-ash">
                    {n.deliverables.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                )}
                {n.difficultyNote && (
                  <div className="rounded border border-[#f2c14a] bg-[#2a1d05] p-2.5">
                    <dt className="flex items-center gap-1.5 font-label text-xs font-bold uppercase tracking-wider text-[#ffd27a]">
                      <Icon name="warning" size={14} /> Why this is hard
                    </dt>
                    <dd className="mt-1 font-prose text-sm text-ash">{n.difficultyNote}</dd>
                  </div>
                )}
                {n.betterPath && byId.get(n.betterPath) && (
                  <p className="rounded border border-[rgba(185,176,168,0.4)] p-2.5 font-prose text-sm text-ash">
                    <strong className="font-label text-xs uppercase tracking-wider text-ash-dim">Suggested better path: </strong>
                    {byId.get(n.betterPath)?.title}
                  </p>
                )}
              </GlassPanel>
            </li>
          );
        })}
      </ol>
      {alternates.length > 0 && (
        <GlassPanel className="space-y-2 p-4" corners={false}>
          <h3 className="font-label text-sm font-bold uppercase tracking-wider text-ash">Branches &amp; alternate directions</h3>
          <ul className="space-y-1 font-prose text-sm text-ash-dim">
            {alternates.map((e) => (
              <li key={`${e.from}>${e.to}`}>
                {byId.get(e.from)?.title ?? e.from} → <strong className="text-ash">{byId.get(e.to)?.title ?? e.to}</strong>
                {e.label ? ` (${e.label})` : ''}
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}
    </section>
  );
}

import { useMemo } from 'react';
import type { Graph } from '@/lib/apiTypes';
import { STAGES, STAGE_STYLE } from '@/lib/constants';
import { layoutGraph, type Dir } from '@/lib/roadmapLayout';

const STROKE = { recommended: '#ff3b4d', alternate: '#c9c0b8', normal: '#8a7a78' } as const;

/** Off-screen 1080x1350 branded static render of the roadmap (SVG from the same dagre layout). Loaded lazily. */
export default function RoadmapExportCard({ title, graph }: { title: string; graph: Graph }) {
  const AREA_W = 968;
  const AREA_H = 900;
  const best = useMemo(() => {
    const pick = (dir: Dir) => {
      const l = layoutGraph(graph, dir);
      return { dir, l, scale: Math.min(AREA_W / l.width, AREA_H / l.height) };
    };
    const a = pick('LR');
    const b = pick('TB');
    return a.scale >= b.scale ? a : b;
  }, [graph]);
  const { l, scale } = best;
  const ox = (AREA_W - l.width * scale) / 2;
  const kind = new Map(graph.edges.map((e) => [`${e.from}>${e.to}`, e.kind]));

  return (
    <div style={{ width: 1080, height: 1350, background: '#070506', color: '#f5efe9', padding: 56, boxSizing: 'border-box', border: '6px solid #c4121f', display: 'flex', flexDirection: 'column', gap: 20, fontFamily: 'Georgia, serif' }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 26, letterSpacing: 6, color: '#ff8a93', fontWeight: 700 }}>CHALLENGEX · ROADMAP</div>
      <div style={{ fontFamily: 'Cinzel Decorative, Cinzel, serif', fontSize: 42, fontWeight: 700, lineHeight: 1.15, color: '#fff' }}>{title}</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {STAGES.map((s) => (
          <span key={s} style={{ border: `2px solid ${STAGE_STYLE[s].color}`, color: STAGE_STYLE[s].color, borderRadius: 999, padding: '4px 14px', fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 700 }}>
            {STAGE_STYLE[s].label}
          </span>
        ))}
      </div>
      <svg width={AREA_W} height={AREA_H} viewBox={`0 0 ${AREA_W} ${AREA_H}`} style={{ display: 'block' }}>
        <g transform={`translate(${ox} 0) scale(${scale})`}>
          {l.edges.map((e) => {
            const k = kind.get(`${e.from}>${e.to}`) ?? 'normal';
            const pts = e.points.map((p) => `${p.x},${p.y}`).join(' ');
            return <polyline key={`${e.from}>${e.to}`} points={pts} fill="none" stroke={STROKE[k]} strokeWidth={k === 'recommended' ? 5 : 3} strokeDasharray={k === 'alternate' ? '10 8' : undefined} />;
          })}
          {graph.nodes.map((n) => {
            const b = l.boxes.get(n.id);
            if (!b) return null;
            const c = STAGE_STYLE[n.stage].color;
            return (
              <g key={n.id} transform={`translate(${b.x} ${b.y})`}>
                {n.type === 'decision' ? (
                  <polygon points={`${b.h * 0.28},0 ${b.w - b.h * 0.28},0 ${b.w},${b.h / 2} ${b.w - b.h * 0.28},${b.h} ${b.h * 0.28},${b.h} 0,${b.h / 2}`} fill="#14080a" stroke={c} strokeWidth="4" />
                ) : (
                  <rect width={b.w} height={b.h} rx={n.type === 'milestone' ? 44 : 10} fill="#14080a" stroke={c} strokeWidth="4" />
                )}
                <text x={b.w / 2} y={b.h / 2 - 6} textAnchor="middle" fill="#fff" fontSize="23" fontWeight="700" fontFamily="Cinzel, serif">
                  {n.title.length > 24 ? `${n.title.slice(0, 23)}…` : n.title}
                </text>
                <text x={b.w / 2} y={b.h / 2 + 26} textAnchor="middle" fill={c} fontSize="19" fontFamily="Cinzel, serif">
                  {STAGE_STYLE[n.stage].label} · {n.difficulty}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', fontFamily: 'Cinzel, serif', fontSize: 22, color: '#ff8a93', borderTop: '2px solid #7a0a12', paddingTop: 14 }}>
        <span>Challenge your idea. Prove it. Build it.</span>
        <span style={{ fontWeight: 700, letterSpacing: 3 }}>CHALLENGEX</span>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { STAGES } from '@/types/api';
import type { Graph, GraphEdge, GraphNode, Stage } from '@/types/api';
import { NodeCard } from './NodeCard';

const STAGE_LABEL: Record<Stage, string> = {
  validate: 'Validate',
  spec: 'Spec',
  design: 'Design',
  blueprint: 'Blueprint',
  prototype: 'Prototype',
  launch: 'Launch',
};

const COL_W = 270; // distance between columns (room for the curves)
const NODE_W = 196;
const NODE_H = 84;
const ROW_H = 118;
const PAD = 24;
const HEADER_H = 44;

const DIFFICULTY_COLOR: Record<GraphNode['difficulty'], string> = { low: '#34a56f', medium: '#d9a441', high: '#e5384a' };
const EDGE_STYLE: Record<GraphEdge['kind'], { color: string; width: number; dash?: string }> = {
  recommended: { color: '#ff2638', width: 2.4 },
  normal: { color: '#8a7f73', width: 1.5 },
  alternate: { color: '#d9a441', width: 1.6, dash: '6 5' },
};
const TYPE_MARK: Record<GraphNode['type'], string> = { step: '●', decision: '◆', milestone: '★' };

interface Placed {
  node: GraphNode;
  x: number;
  y: number;
}

/**
 * Workflow-style placement: a step sits one column to the right of the furthest step that leads into it,
 * so every connection runs left to right. Inside a column a step is placed at the average height of its inputs.
 */
function layout(graph: Graph): { placed: Map<string, Placed>; width: number; height: number } {
  const preds = new Map<string, string[]>();
  for (const n of graph.nodes) preds.set(n.id, []);
  for (const e of graph.edges) preds.get(e.to)?.push(e.from);

  const indeg = new Map(graph.nodes.map((n) => [n.id, preds.get(n.id)?.length ?? 0]));
  const order: string[] = [];
  const queue = graph.nodes.filter((n) => indeg.get(n.id) === 0).map((n) => n.id);
  while (queue.length) {
    const id = queue.shift() as string;
    order.push(id);
    for (const e of graph.edges) {
      if (e.from !== id) continue;
      indeg.set(e.to, (indeg.get(e.to) ?? 1) - 1);
      if (indeg.get(e.to) === 0) queue.push(e.to);
    }
  }
  for (const n of graph.nodes) if (!order.includes(n.id)) order.push(n.id); // safety net for malformed data

  const column = new Map<string, number>();
  for (const id of order) column.set(id, Math.max(-1, ...(preds.get(id) ?? []).map((p) => column.get(p) ?? -1)) + 1);

  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const placed = new Map<string, Placed>();
  const nextFree = new Map<number, number>();
  let lastColumn = 0;
  let maxY = HEADER_H + PAD;
  for (const id of order) {
    const c = column.get(id) ?? 0;
    lastColumn = Math.max(lastColumn, c);
    const known = (preds.get(id) ?? []).map((p) => placed.get(p)).filter((p): p is Placed => !!p);
    const free = nextFree.get(c) ?? HEADER_H + PAD;
    const y = Math.max(known.length ? known.reduce((s, p) => s + p.y, 0) / known.length : free, free);
    nextFree.set(c, y + ROW_H);
    maxY = Math.max(maxY, y);
    placed.set(id, { node: byId.get(id) as GraphNode, x: PAD + c * COL_W, y });
  }
  return { placed, width: PAD * 2 + lastColumn * COL_W + NODE_W, height: maxY + NODE_H + PAD };
}

/** Output port (right middle) of the source to input port (left middle) of the target. */
function curve(a: Placed, b: Placed): { d: string; mx: number; my: number } {
  const sx = a.x + NODE_W;
  const sy = a.y + NODE_H / 2;
  const tx = b.x - 6; // leave room for the arrow head
  const ty = b.y + NODE_H / 2;
  const k = Math.max(40, (tx - sx) / 2);
  return { d: `M${sx},${sy} C${sx + k},${sy} ${tx - k},${ty} ${tx},${ty}`, mx: (sx + tx) / 2, my: (sy + ty) / 2 };
}

export function RoadmapGraph({ graph }: { graph: Graph }) {
  const { placed, width, height } = useMemo(() => layout(graph), [graph]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const selected = selectedId ? placed.get(selectedId)?.node : undefined;

  const touches = (e: GraphEdge) => !!selectedId && (e.from === selectedId || e.to === selectedId);

  // Each stage is labelled above the columns its steps occupy.
  const stageSpans = STAGES.map((s) => {
    const xs = [...placed.values()].filter((p) => p.node.stage === s).map((p) => p.x);
    return xs.length ? { stage: s, x1: Math.min(...xs), x2: Math.max(...xs) + NODE_W } : null;
  }).filter((s): s is { stage: Stage; x1: number; x2: number } => !!s);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-[11px] font-heading uppercase tracking-widest text-parchment-dim">
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Legend">
          <li className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-6 bg-[#ff2638]" /> Recommended</li>
          <li className="flex items-center gap-1.5"><span className="inline-block h-0.5 w-6 bg-[#8a7f73]" /> Next</li>
          <li className="flex items-center gap-1.5"><span className="inline-block w-6 border-t-2 border-dashed border-[#d9a441]" /> Alternate</li>
          <li>● step ◆ decision ★ milestone</li>
        </ul>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Zoom out" className="rounded border border-[var(--border-subtle)] p-1 hover:text-parchment" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(1)))}>
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" className="rounded border border-[var(--border-subtle)] p-1 hover:text-parchment" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))}>
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        className="overflow-auto rounded-md border border-[var(--border-subtle)] bg-black/30"
        style={{ maxHeight: '75vh' }}
        onWheel={(event) => {
          const viewport = event.currentTarget;
          if (event.deltaY === 0) return;
          const nextScrollLeft = Math.max(
            0,
            Math.min(viewport.scrollLeft + event.deltaY, viewport.scrollWidth - viewport.clientWidth),
          );
          if (nextScrollLeft !== viewport.scrollLeft) {
            event.preventDefault();
            viewport.scrollLeft = nextScrollLeft;
          }
        }}
      >
        <svg width={width * zoom} height={height * zoom} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Roadmap graph">
          <defs>
            {(Object.keys(EDGE_STYLE) as GraphEdge['kind'][]).map((k) => (
              <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" fill={EDGE_STYLE[k].color} />
              </marker>
            ))}
          </defs>

          {stageSpans.map(({ stage, x1, x2 }, i) => (
            <g key={stage}>
              <rect x={x1 - 12} y={0} width={x2 - x1 + 24} height={height} fill={i % 2 ? 'rgba(255,255,255,0.015)' : 'rgba(229,9,32,0.03)'} />
              <text x={(x1 + x2) / 2} y={27} textAnchor="middle" fill="#a79a8b" fontSize="12" letterSpacing="2" style={{ textTransform: 'uppercase', fontFamily: '"Cinzel Decorative", serif' }}>
                {STAGES.indexOf(stage) + 1}. {STAGE_LABEL[stage]}
              </text>
            </g>
          ))}

          {graph.edges.map((e) => {
            const a = placed.get(e.from);
            const b = placed.get(e.to);
            if (!a || !b) return null;
            const st = EDGE_STYLE[e.kind];
            const p = curve(a, b);
            const dim = !!selectedId && !touches(e);
            return (
              <g key={`${e.from}>${e.to}`} opacity={dim ? 0.18 : 1}>
                <path d={p.d} fill="none" stroke={st.color} strokeWidth={touches(e) ? st.width + 1 : st.width} strokeDasharray={st.dash} markerEnd={`url(#arrow-${e.kind})`} />
                {e.label && e.kind === 'alternate' && (
                  <text x={p.mx} y={p.my - 5} textAnchor="middle" fontSize="10" fill="#d9a441" stroke="#0a0405" strokeWidth="3" paintOrder="stroke">
                    {e.label.length > 28 ? `${e.label.slice(0, 27)}…` : e.label}
                  </text>
                )}
              </g>
            );
          })}

          {[...placed.values()].map(({ node, x, y }) => {
            const active = node.id === selectedId;
            return (
              <g key={node.id}>
                <foreignObject x={x} y={y} width={NODE_W} height={NODE_H}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    aria-label={`${node.type}: ${node.title}`}
                    onClick={() => setSelectedId(active ? null : node.id)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        setSelectedId(active ? null : node.id);
                      }
                    }}
                    style={{
                      height: '100%',
                      boxSizing: 'border-box',
                      cursor: 'pointer',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: active ? '#2a0d12' : '#170909',
                      border: `1.5px solid ${active ? '#ff2638' : DIFFICULTY_COLOR[node.difficulty]}`,
                      borderLeftWidth: 5,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#a79a8b', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{TYPE_MARK[node.type]} {node.type}</span>
                      <span style={{ color: DIFFICULTY_COLOR[node.difficulty] }}>{node.difficulty}</span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 12.5, lineHeight: 1.25, color: '#e9dfd0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{node.title}</div>
                    <div style={{ marginTop: 3, fontSize: 10, color: '#71665e' }}>⏱ {node.durationEstimate}</div>
                  </div>
                </foreignObject>
                {/* connection ports: input on the left edge, output on the right edge */}
                <circle cx={x} cy={y + NODE_H / 2} r={4.5} fill="#0a0405" stroke="#8a7f73" strokeWidth="1.5" />
                <circle cx={x + NODE_W} cy={y + NODE_H / 2} r={4.5} fill="#0a0405" stroke="#8a7f73" strokeWidth="1.5" />
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-xs text-parchment-faint">Select a step to see its details and highlight the paths in and out of it. Scroll sideways on small screens.</p>

      {selected && (
        <div className="mt-4 max-w-xl">
          <NodeCard node={selected} />
        </div>
      )}
    </div>
  );
}
// LAZY MODULE (pulls in @dagrejs/dagre): only imported from the roadmap canvas / export card chunks.
import * as dagreNs from '@dagrejs/dagre';
import type { Graph, GraphNode } from './apiTypes';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dagre: any = (dagreNs as any).default ?? dagreNs;

export type Dir = 'LR' | 'TB';
export interface Box {
  id: string;
  x: number; // top-left
  y: number;
  w: number;
  h: number;
}
export interface PlacedEdge {
  from: string;
  to: string;
  points: { x: number; y: number }[];
}
export interface Layout {
  boxes: Map<string, Box>;
  edges: PlacedEdge[];
  width: number;
  height: number;
}

export const NODE_SIZE: Record<GraphNode['type'], { w: number; h: number }> = {
  step: { w: 232, h: 112 },
  decision: { w: 236, h: 132 },
  milestone: { w: 232, h: 100 },
};

/** dagre auto-layout. Left->right on desktop, top->bottom on narrow screens. Guaranteed non-overlapping boxes. */
export function layoutGraph(graph: Graph, dir: Dir): Layout {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: dir, nodesep: dir === 'LR' ? 44 : 36, ranksep: dir === 'LR' ? 96 : 70, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of graph.nodes) {
    const s = NODE_SIZE[n.type];
    g.setNode(n.id, { width: s.w, height: s.h });
  }
  for (const e of graph.edges) g.setEdge(e.from, e.to);
  dagre.layout(g);

  const boxes = new Map<string, Box>();
  for (const n of graph.nodes) {
    const p = g.node(n.id) as { x: number; y: number; width: number; height: number };
    boxes.set(n.id, { id: n.id, x: p.x - p.width / 2, y: p.y - p.height / 2, w: p.width, h: p.height });
  }
  const edges: PlacedEdge[] = graph.edges.map((e) => {
    const d = g.edge(e.from, e.to) as { points?: { x: number; y: number }[] } | undefined;
    return { from: e.from, to: e.to, points: d?.points ?? [] };
  });
  const gr = g.graph() as { width: number; height: number };
  return { boxes, edges, width: gr.width, height: gr.height };
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Returns null at a map edge so the wheel event can scroll the page instead. */
export function wheelPanPosition(position: number, delta: number, viewportSize: number, contentSize: number): number | null {
  const minimum = Math.min(0, viewportSize - contentSize);
  if ((delta < 0 && position >= -1) || (delta > 0 && position <= minimum + 1)) return null;
  return Math.max(minimum, Math.min(0, position - delta));
}

/** Nodes reachable from the start through non-alternate edges (the default / recommended route). */
export function defaultPath(graph: Graph): Set<string> {
  const hasIn = new Set(graph.edges.map((e) => e.to));
  const start = graph.nodes.find((n) => !hasIn.has(n.id));
  const out = new Map<string, string[]>();
  for (const e of graph.edges) if (e.kind !== 'alternate') out.set(e.from, [...(out.get(e.from) ?? []), e.to]);
  const seen = new Set<string>();
  const stack = start ? [start.id] : [];
  while (stack.length) {
    const id = stack.pop() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(out.get(id) ?? []));
  }
  return seen;
}

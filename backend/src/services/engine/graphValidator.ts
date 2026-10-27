export const STAGES = ['validate', 'spec', 'design', 'blueprint', 'prototype', 'launch'] as const;
type Stage = (typeof STAGES)[number];
export const DECISION_FIELDS = ['techStack', 'marketing', 'team', 'timeline', 'budget', 'platform'] as const;
export type DecisionField = (typeof DECISION_FIELDS)[number];

interface GraphNode {
  id: string;
  stage: Stage;
  type: 'step' | 'decision' | 'milestone';
  title: string;
  description: string;
  durationEstimate: string;
  deliverables: string[];
  difficulty: 'low' | 'medium' | 'high';
  difficultyNote?: string | null;
  betterPath?: string | null;
  decisionField?: DecisionField | null;
}
interface GraphEdge {
  from: string;
  to: string;
  kind: 'recommended' | 'alternate' | 'normal';
  label?: string | null;
}
export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * Returns a list of human-readable violations (empty = valid).
 * Rules: 12-26 nodes, all six stages, unique ids, real edge endpoints, acyclic, exactly one start, >=1 end,
 * decision nodes have exactly 1 recommended + >=1 alternate edge, a decision node per undecided field,
 * and every high-difficulty node on the default (non-alternate) path has difficultyNote + a reachable betterPath.
 */
export function validateGraph(g: Graph, undecided: DecisionField[]): string[] {
  const errs: string[] = [];
  if (g.nodes.length < 12 || g.nodes.length > 26) errs.push(`node count must be 12-26, got ${g.nodes.length}`);

  const ids = new Set<string>();
  for (const n of g.nodes) {
    if (ids.has(n.id)) errs.push(`duplicate node id "${n.id}"`);
    ids.add(n.id);
  }
  const stages = new Set(g.nodes.map((n) => n.stage));
  for (const s of STAGES) if (!stages.has(s)) errs.push(`stage "${s}" has no node`);

  let structural = errs.some((e) => e.startsWith('duplicate'));
  const seenEdges = new Set<string>();
  for (const e of g.edges) {
    if (!ids.has(e.from) || !ids.has(e.to)) {
      errs.push(`edge ${e.from} -> ${e.to} references a node that does not exist`);
      structural = true;
    } else if (e.from === e.to) {
      errs.push(`edge ${e.from} -> ${e.to} is a self-loop`);
      structural = true;
    }
    const key = `${e.from}>${e.to}`;
    if (seenEdges.has(key)) {
      errs.push(`duplicate edge ${key}`);
      structural = true;
    }
    seenEdges.add(key);
  }
  if (structural) return errs;

  const out = new Map<string, GraphEdge[]>(g.nodes.map((n) => [n.id, []]));
  const indeg = new Map<string, number>(g.nodes.map((n) => [n.id, 0]));
  for (const e of g.edges) {
    out.get(e.from)?.push(e);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  // Cycle detection (Kahn)
  const deg = new Map(indeg);
  const queue = g.nodes.filter((n) => (deg.get(n.id) ?? 0) === 0).map((n) => n.id);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift() as string;
    visited++;
    for (const e of out.get(id) ?? []) {
      deg.set(e.to, (deg.get(e.to) ?? 0) - 1);
      if (deg.get(e.to) === 0) queue.push(e.to);
    }
  }
  if (visited !== g.nodes.length) {
    errs.push('graph contains a cycle');
    return errs;
  }

  const starts = g.nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0);
  const ends = g.nodes.filter((n) => (out.get(n.id) ?? []).length === 0);
  if (starts.length !== 1) errs.push(`expected exactly one start node (no incoming edges), found ${starts.length}: ${starts.map((s) => s.id).join(', ')}`);
  if (ends.length < 1) errs.push('expected at least one end node');

  for (const n of g.nodes) {
    if (n.type !== 'decision') continue;
    const outs = out.get(n.id) ?? [];
    const rec = outs.filter((e) => e.kind === 'recommended').length;
    const alt = outs.filter((e) => e.kind === 'alternate').length;
    if (rec !== 1) errs.push(`decision "${n.id}" needs exactly 1 recommended outgoing edge, has ${rec}`);
    if (alt < 1) errs.push(`decision "${n.id}" needs at least 1 alternate outgoing edge`);
  }

  for (const f of undecided) {
    if (!g.nodes.some((n) => n.type === 'decision' && n.decisionField === f)) {
      errs.push(`field "${f}" is undecided: add a decision node with decisionField "${f}" (1 recommended + at least 1 alternate edge)`);
    }
  }

  // Default path = reachable from the start through non-alternate edges.
  if (starts.length === 1) {
    const onPath = new Set<string>();
    const stack = [(starts[0] as GraphNode).id];
    while (stack.length) {
      const id = stack.pop() as string;
      if (onPath.has(id)) continue;
      onPath.add(id);
      for (const e of out.get(id) ?? []) if (e.kind !== 'alternate') stack.push(e.to);
    }
    for (const n of g.nodes) {
      if (n.difficulty !== 'high' || !onPath.has(n.id)) continue;
      if (!n.difficultyNote?.trim()) errs.push(`high-difficulty node "${n.id}" on the chosen path needs a difficultyNote`);
      const better = n.betterPath?.trim();
      if (!better) {
        errs.push(`high-difficulty node "${n.id}" on the chosen path needs a betterPath (id of an alternate node)`);
        continue;
      }
      if (!ids.has(better)) {
        errs.push(`betterPath "${better}" of node "${n.id}" is not a node id`);
        continue;
      }
      const reachable = g.edges.some(
        (e) => e.kind === 'alternate' && e.to === better && (e.from === n.id || g.edges.some((x) => x.from === e.from && x.to === n.id)),
      );
      if (!reachable) errs.push(`betterPath "${better}" of node "${n.id}" must be the target of an alternate edge from that node or from its direct predecessor`);
    }
  }
  return errs;
}

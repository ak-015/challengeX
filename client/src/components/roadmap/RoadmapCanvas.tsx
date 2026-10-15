import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { BaseEdge, EdgeLabelRenderer, MarkerType, ReactFlow, ReactFlowProvider, getSmoothStepPath, useReactFlow, type Edge, type EdgeProps, type Node } from '@xyflow/react';
import { DecisionNode, MilestoneNode, StepNode, type RoadmapNodeData } from './nodes';
import './roadmap.css';
import { Icon } from '@/components/ui/Icon';
import type { Graph, GraphNode } from '@/lib/apiTypes';
import { STAGES, STAGE_STYLE, type Stage } from '@/lib/constants';
import { useMedia } from '@/hooks/useMedia';
import { cn } from '@/lib/cn';
import { defaultPath, layoutGraph, wheelPanPosition } from '@/lib/roadmapLayout';

interface EdgeData extends Record<string, unknown> {
  kind: 'recommended' | 'alternate' | 'normal';
  label?: string | null;
  hot: boolean;
  dim: boolean;
}

const STROKE = { recommended: '#ff3b4d', alternate: '#b9b0a8', normal: '#8a7a78' } as const;

function CcEdge(p: EdgeProps) {
  const d = p.data as EdgeData;
  const [path, lx, ly] = getSmoothStepPath({ sourceX: p.sourceX, sourceY: p.sourceY, targetX: p.targetX, targetY: p.targetY, sourcePosition: p.sourcePosition, targetPosition: p.targetPosition, borderRadius: 14 });
  const color = d.hot ? '#ffd27a' : STROKE[d.kind];
  return (
    <>
      <BaseEdge
        id={p.id}
        path={path}
        markerEnd={p.markerEnd}
        className={d.kind === 'recommended' ? 'cc-edge-rec' : undefined}
        style={{ stroke: color, strokeWidth: d.kind === 'recommended' ? 3.5 : d.kind === 'alternate' ? 2 : 1.5, strokeDasharray: d.kind === 'alternate' ? '7 6' : undefined, opacity: d.dim ? 0.2 : 1 }}
      />
      {d.label && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded border bg-[rgba(7,5,6,0.92)] px-1.5 py-0.5 font-label text-[10px] font-bold"
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)`, color: d.kind === 'recommended' ? '#ff8a93' : '#e8e2dc', borderColor: d.kind === 'recommended' ? '#ff3b4d' : '#8a7a78', opacity: d.dim ? 0.3 : 1 }}
          >
            {d.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { step: StepNode, decision: DecisionNode, milestone: MilestoneNode };
const edgeTypes = { cc: CcEdge };

function Inner({ graph }: { graph: Graph; readOnly?: boolean }) {
  const horizontal = !useMedia('(max-width: 767px)');
  const { zoomIn, zoomOut, zoomTo, fitView, getViewport, setViewport } = useReactFlow();
  const flowRef = useRef<HTMLDivElement>(null);
  const [showAlt, setShowAlt] = useState(true);
  const [stage, setStage] = useState<Stage | 'all'>('all');
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [better, setBetter] = useState<string | null>(null);

  const layout = useMemo(() => layoutGraph(graph, horizontal ? 'LR' : 'TB'), [graph, horizontal]);
  const startBox = useMemo(() => {
    const targets = new Set(graph.edges.map((edge) => edge.to));
    const start = graph.nodes.find((node) => !targets.has(node.id)) ?? graph.nodes[0];
    return start ? layout.boxes.get(start.id) : undefined;
  }, [graph, layout]);
  const path = useMemo(() => defaultPath(graph), [graph]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  const visible = useMemo(() => (showAlt ? new Set(graph.nodes.map((n) => n.id)) : path), [showAlt, graph, path]);

  /** The "better path" highlight: the alternate edge into `better` that starts at the risky node or its direct predecessor. */
  const hotEdges = useMemo(() => {
    const hot = new Set<string>();
    if (!better) return hot;
    for (const e of graph.edges) if (e.kind === 'alternate' && e.to === better) hot.add(`${e.from}>${e.to}`);
    return hot;
  }, [better, graph]);

  const nodes: Node[] = useMemo(
    () =>
      graph.nodes
        .filter((n) => visible.has(n.id))
        .map((n) => {
          const b = layout.boxes.get(n.id);
          const data: RoadmapNodeData = {
            node: n,
            horizontal,
            dim: stage !== 'all' && n.stage !== stage,
            onPath: path.has(n.id),
            highlight: better === n.id,
            onBetter: (id) => setBetter((cur) => (cur === id ? null : id)),
          };
          return { id: n.id, type: n.type, position: { x: b?.x ?? 0, y: b?.y ?? 0 }, data, ariaLabel: `${n.title}. ${STAGE_STYLE[n.stage].label} stage. ${n.type}. Difficulty ${n.difficulty}.`, draggable: false, connectable: false };
        }),
    [graph, layout, horizontal, stage, better, visible, path],
  );

  const edges: Edge[] = useMemo(
    () =>
      graph.edges
        .filter((e) => visible.has(e.from) && visible.has(e.to) && (showAlt || e.kind !== 'alternate'))
        .map((e) => {
          const src = byId.get(e.from);
          const label = e.label || (src?.type === 'decision' ? (e.kind === 'recommended' ? 'Recommended' : e.kind === 'alternate' ? 'Alternate' : null) : null);
          const data: EdgeData = {
            kind: e.kind,
            label,
            hot: hotEdges.has(`${e.from}>${e.to}`),
            dim: stage !== 'all' && byId.get(e.from)?.stage !== stage && byId.get(e.to)?.stage !== stage,
          };
          return {
            id: `${e.from}>${e.to}`,
            source: e.from,
            target: e.to,
            type: 'cc',
            data,
            markerEnd: { type: MarkerType.ArrowClosed, color: data.hot ? '#ffd27a' : STROKE[e.kind], width: 18, height: 18 },
          };
        }),
    [graph, visible, showAlt, byId, hotEdges, stage],
  );

  const select = useCallback((_: unknown, n: Node) => setSelected(byId.get(n.id) ?? null), [byId]);

  useEffect(() => {
    const flow = flowRef.current;
    if (!flow || !startBox) return;
    const zoom = 1;
    const padding = 32;
    const proposedX = horizontal ? padding - startBox.x * zoom : (flow.clientWidth - startBox.w * zoom) / 2 - startBox.x * zoom;
    const proposedY = horizontal ? (flow.clientHeight - startBox.h * zoom) / 2 - startBox.y * zoom : padding - startBox.y * zoom;
    const x = Math.min(0, Math.max(flow.clientWidth - layout.width * zoom, proposedX));
    const y = Math.min(0, Math.max(flow.clientHeight - layout.height * zoom, proposedY));
    void setViewport({ x, y, zoom }, { duration: 0 });
  }, [horizontal, layout, startBox, setViewport]);

  const onWheelCapture = useCallback((event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      void zoomTo(Math.max(0.85, Math.min(1.6, getViewport().zoom * factor)), { duration: 0 });
      return;
    }
    const flow = flowRef.current;
    if (!flow) return;
    const delta = horizontal
      ? Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      : Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (!delta) return;
    const viewport = getViewport();
    const size = horizontal ? flow.clientWidth : flow.clientHeight;
    const contentSize = (horizontal ? layout.width : layout.height) * viewport.zoom;
    const position = horizontal ? viewport.x : viewport.y;
    const next = wheelPanPosition(position, delta, size, contentSize);
    if (next === null) return;
    event.preventDefault();
    void setViewport({ ...viewport, ...(horizontal ? { x: next } : { y: next }) }, { duration: 0 });
  }, [getViewport, horizontal, layout, setViewport, zoomTo]);

  useEffect(() => {
    const flow = flowRef.current;
    if (!flow) return;
    flow.addEventListener('wheel', onWheelCapture, { capture: true, passive: false });
    return () => flow.removeEventListener('wheel', onWheelCapture, true);
  }, [onWheelCapture]);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [120, 0],
      ArrowRight: [-120, 0],
      ArrowUp: [0, 120],
      ArrowDown: [0, -120],
    };
    const movement = moves[event.key];
    if (!movement) return;
    if (event.target instanceof HTMLElement && event.target.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    const viewport = getViewport();
    void setViewport({ ...viewport, x: viewport.x + movement[0], y: viewport.y + movement[1] }, { duration: 0 });
  }, [getViewport, setViewport]);

  const tool = 'inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-md border border-[rgba(229,9,32,0.6)] bg-[rgba(7,5,6,0.9)] px-3 font-label text-xs font-bold text-ash hover:border-crimson-text';

  return (
    <div className="space-y-3">
      {/* stage strip + filter */}
      <ol className="flex flex-wrap items-center justify-center gap-1.5" aria-label="Stages">
        {STAGES.map((s, i) => (
          <li key={s} className="flex items-center gap-1.5">
            <button type="button" aria-pressed={stage === s} onClick={() => setStage(stage === s ? 'all' : s)} className="min-h-[36px] rounded-full border px-3 font-label text-xs font-bold uppercase tracking-wider" style={{ color: STAGE_STYLE[s].color, borderColor: STAGE_STYLE[s].color, background: stage === s ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.5)' }}>
              {STAGE_STYLE[s].label}
            </button>
            {i < STAGES.length - 1 && <Icon name="chevronRight" size={14} className="text-ash-dim" />}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Roadmap controls">
        <button type="button" className={tool} onClick={() => void zoomIn({ duration: 200 })} aria-label="Zoom in"><Icon name="zoomIn" size={18} /></button>
        <button type="button" className={tool} onClick={() => void zoomOut({ duration: 200 })} aria-label="Zoom out"><Icon name="zoomOut" size={18} /></button>
        <button type="button" className={tool} onClick={() => void fitView({ duration: 300, padding: 0.12, minZoom: 0.15, maxZoom: 0.85 })} aria-label="Fit view"><Icon name="fit" size={18} /> Fit</button>
        <label className={cn(tool, 'cursor-pointer')}>
          <input type="checkbox" className="h-4 w-4 accent-[#c41423]" checked={showAlt} onChange={(e) => setShowAlt(e.target.checked)} /> Show alternate paths
        </label>
        {stage !== 'all' && <button type="button" className={tool} onClick={() => setStage('all')}>Clear filter</button>}
        {better && <button type="button" className={tool} onClick={() => setBetter(null)}>Clear highlight</button>}
      </div>

      <div
        ref={flowRef}
        className="cc-flow glass relative h-[68dvh] min-h-[420px] overflow-hidden !rounded-lg"
        role="region"
        aria-label="Roadmap flowchart. Use Tab to move between steps and arrow keys to pan."
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={select}
          minZoom={0.85}
          maxZoom={1.6}
          translateExtent={[[0, 0], [layout.width, layout.height]]}
          nodesDraggable={false}
          nodesConnectable={false}
          zoomOnScroll={false}
          zoomActivationKeyCode={null}
          preventScrolling={false}
          zoomOnDoubleClick={false}
          panOnDrag
          zoomOnPinch
          colorMode="dark"
          key={horizontal ? 'lr' : 'tb'}
        />
      </div>
      <p className="text-center font-label text-xs text-ash-dim">Scroll to move along the roadmap · Ctrl + scroll to zoom</p>

      {/* legend */}
      <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-label text-xs text-ash" aria-label="Legend">
        <li className="flex items-center gap-2"><svg width="34" height="8" aria-hidden="true"><line x1="0" y1="4" x2="34" y2="4" stroke="#ff3b4d" strokeWidth="3.5" /></svg> Recommended</li>
        <li className="flex items-center gap-2"><svg width="34" height="8" aria-hidden="true"><line x1="0" y1="4" x2="34" y2="4" stroke="#b9b0a8" strokeWidth="2" strokeDasharray="7 6" /></svg> Alternate</li>
        <li className="flex items-center gap-2"><svg width="34" height="8" aria-hidden="true"><line x1="0" y1="4" x2="34" y2="4" stroke="#8a7a78" strokeWidth="1.5" /></svg> Normal</li>
        <li className="flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill="#3fcf7f" /></svg> Easy</li>
        <li className="flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="2" fill="#f2c14a" /></svg> Medium</li>
        <li className="flex items-center gap-1.5"><svg width="12" height="12" aria-hidden="true"><polygon points="6,0 12,12 0,12" fill="#ff5a67" /></svg> Hard</li>
        <li className="flex items-center gap-1.5"><span aria-hidden="true" className="inline-block h-3 w-3 rotate-45 border-2 border-[#ff5a67]" /> Decision</li>
      </ul>

      {/* details drawer */}
      {selected && (
        <aside role="dialog" aria-label={`Details: ${selected.title}`} className="glass scroll-thin fixed inset-x-0 bottom-0 z-[60] max-h-[75dvh] overflow-y-auto rounded-b-none p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-4 md:right-4 md:top-[72px] md:max-h-none md:w-[380px] md:rounded-lg md:pb-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <span className="rounded-full border px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wider" style={{ color: STAGE_STYLE[selected.stage].color, borderColor: STAGE_STYLE[selected.stage].color }}>{STAGE_STYLE[selected.stage].label} · {selected.type}</span>
              <h2 className="mt-2 font-display text-xl font-bold text-ash">{selected.title}</h2>
            </div>
            <button type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-ash" aria-label="Close details" onClick={() => setSelected(null)}><Icon name="close" /></button>
          </div>
          <p className="font-prose text-ash">{selected.description}</p>
          <dl className="mt-4 space-y-3">
            <div><dt className="font-label text-xs uppercase tracking-wider text-ash-dim">Duration</dt><dd className="font-prose text-ash">{selected.durationEstimate}</dd></div>
            <div><dt className="font-label text-xs uppercase tracking-wider text-ash-dim">Difficulty</dt><dd className="font-prose capitalize text-ash">{selected.difficulty}</dd></div>
            {selected.deliverables.length > 0 && (
              <div>
                <dt className="font-label text-xs uppercase tracking-wider text-ash-dim">Deliverables</dt>
                <dd><ul className="list-disc pl-5 font-prose text-ash">{selected.deliverables.map((x) => <li key={x}>{x}</li>)}</ul></dd>
              </div>
            )}
            {selected.difficultyNote && (
              <div className="rounded border border-[#f2c14a] bg-[#2a1d05] p-3">
                <dt className="flex items-center gap-1.5 font-label text-xs font-bold uppercase tracking-wider text-[#ffd27a]"><Icon name="warning" size={14} /> Why this is hard</dt>
                <dd className="mt-1 font-prose text-ash">{selected.difficultyNote}</dd>
              </div>
            )}
            {selected.betterPath && byId.get(selected.betterPath) && (
              <div className="rounded border border-[rgba(73,32,36,0.9)] p-3">
                <dt className="font-label text-xs font-bold uppercase tracking-wider text-ash-dim">Suggested better path</dt>
                <dd className="mt-1 font-prose text-ash">{byId.get(selected.betterPath)?.title}</dd>
                <button type="button" className="mt-2 min-h-[44px] rounded border border-[#f2c14a] px-3 font-label text-xs font-bold text-[#ffd27a]" onClick={() => (setBetter(selected.betterPath ?? null), setSelected(null))}>Highlight on the map</button>
              </div>
            )}
          </dl>
        </aside>
      )}
    </div>
  );
}

export default function RoadmapCanvas({ graph, readOnly }: { graph: Graph; readOnly?: boolean }) {
  return (
    <ReactFlowProvider>
      <Inner graph={graph} readOnly={readOnly} />
    </ReactFlowProvider>
  );
}

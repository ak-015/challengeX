import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Icon } from '@/components/ui/Icon';
import type { GraphNode } from '@/lib/apiTypes';
import { STAGE_STYLE } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { NODE_SIZE } from '@/lib/roadmapLayout';

export interface RoadmapNodeData extends Record<string, unknown> {
  node: GraphNode;
  horizontal: boolean;
  dim: boolean;
  onPath: boolean;
  highlight: boolean;
  onBetter: (id: string) => void;
}

const DIFF = {
  low: { label: 'Easy', color: '#3fcf7f' },
  medium: { label: 'Medium', color: '#f2c14a' },
  high: { label: 'Hard', color: '#ff5a67' },
} as const;

function Body({ d }: { d: RoadmapNodeData }) {
  const n = d.node;
  const st = STAGE_STYLE[n.stage];
  const diff = DIFF[n.difficulty];
  return (
    <div className="flex h-full w-full flex-col justify-center gap-1 px-4 py-2 text-left">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full border px-2 py-0.5 font-label text-[10px] font-bold uppercase tracking-wider" style={{ color: st.color, borderColor: st.color }}>
          {st.label}
        </span>
        <span className="inline-flex items-center gap-1 font-label text-[11px] text-ash">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            {n.difficulty === 'low' ? <circle cx="5" cy="5" r="4.5" fill={diff.color} /> : n.difficulty === 'medium' ? <rect x="0.5" y="0.5" width="9" height="9" rx="2" fill={diff.color} /> : <polygon points="5,0 10,10 0,10" fill={diff.color} />}
          </svg>
          {diff.label}
        </span>
      </div>
      <p className="line-clamp-2 font-label text-[13px] font-bold leading-tight text-ash">{n.title}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="font-prose text-[11px] text-ash-dim">{n.durationEstimate}</span>
        {n.difficulty === 'high' && (
          <span className="inline-flex items-center gap-1 font-label text-[11px] font-bold text-[#ff8a93]">
            <Icon name="warning" size={12} /> Risky
          </span>
        )}
      </div>
      {n.difficulty === 'high' && n.betterPath && (
        <button
          type="button"
          className="nodrag nopan mt-0.5 self-start rounded-full border border-[#f2c14a] px-2 py-0.5 font-label text-[10px] font-bold text-[#ffd27a] hover:bg-[rgba(242,193,74,0.15)]"
          onClick={(e) => {
            e.stopPropagation();
            d.onBetter(n.betterPath as string);
          }}
        >
          Suggested better path
        </button>
      )}
    </div>
  );
}

const handles = (horizontal: boolean) => (
  <>
    <Handle type="target" position={horizontal ? Position.Left : Position.Top} isConnectable={false} />
    <Handle type="source" position={horizontal ? Position.Right : Position.Bottom} isConnectable={false} />
  </>
);

const shell = (d: RoadmapNodeData) => cn('relative transition-opacity', d.dim && 'opacity-25');

export function StepNode({ data, selected }: NodeProps) {
  const d = data as RoadmapNodeData;
  const s = NODE_SIZE.step;
  return (
    <div className={shell(d)} style={{ width: s.w, height: s.h }}>
      <div className={cn('glass h-full w-full !rounded-lg', selected && '!border-white', d.highlight && '!border-[#f2c14a]', d.onPath && 'ring-1 ring-[rgba(255,58,75,0.6)]')}>
        <Body d={d} />
      </div>
      {handles(d.horizontal)}
    </div>
  );
}

export function MilestoneNode({ data, selected }: NodeProps) {
  const d = data as RoadmapNodeData;
  const s = NODE_SIZE.milestone;
  return (
    <div className={shell(d)} style={{ width: s.w, height: s.h }}>
      <div className={cn('h-full w-full rounded-[40px] border-2 bg-[rgba(70,8,14,0.92)]', selected ? 'border-white' : d.highlight ? 'border-[#f2c14a]' : 'border-[#ff5a67]')}>
        <div className="flex h-full items-center gap-2 pl-4 pr-2">
          <Icon name="star" size={18} className="shrink-0 text-[#ffd27a]" />
          <div className="min-w-0 flex-1">
            <Body d={d} />
          </div>
        </div>
      </div>
      {handles(d.horizontal)}
    </div>
  );
}

/** Decision: a hexagon, so it reads differently from steps. */
export function DecisionNode({ data, selected }: NodeProps) {
  const d = data as RoadmapNodeData;
  const s = NODE_SIZE.decision;
  const pts = `${s.h * 0.28},2 ${s.w - s.h * 0.28},2 ${s.w - 2},${s.h / 2} ${s.w - s.h * 0.28},${s.h - 2} ${s.h * 0.28},${s.h - 2} 2,${s.h / 2}`;
  return (
    <div className={shell(d)} style={{ width: s.w, height: s.h }}>
      <svg className="absolute inset-0" width={s.w} height={s.h} aria-hidden="true">
        <polygon points={pts} fill="rgba(14,6,8,0.94)" stroke={selected ? '#fff' : d.highlight ? '#f2c14a' : '#ff5a67'} strokeWidth="2" />
      </svg>
      <div className="relative h-full px-6">
        <p className="absolute left-1/2 top-1 -translate-x-1/2 font-label text-[10px] font-bold uppercase tracking-widest text-[#ffd27a]">Decision</p>
        <Body d={d} />
      </div>
      {handles(d.horizontal)}
    </div>
  );
}

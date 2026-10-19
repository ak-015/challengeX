import clsx from 'clsx';
import type { Verdict } from '@/types/api';

const verdictStyles: Record<Verdict, string> = {
  BUILD: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50',
  PIVOT: 'bg-amber-900/30 text-amber-300 border-amber-700/50',
  KILL: 'bg-red-950/60 text-red-400 border-red-800/60',
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded border font-heading text-xs tracking-widest uppercase',
        verdictStyles[verdict],
      )}
    >
      {verdict}
    </span>
  );
}

const statusStyles: Record<string, string> = {
  in_progress: 'bg-sky-900/30 text-sky-300 border-sky-700/50',
  complete: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/50',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded border font-heading text-xs tracking-widest uppercase',
        statusStyles[status] ?? 'bg-surface-elevated text-parchment-dim border-[var(--border-subtle)]',
      )}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      {label && (
        <div className="flex justify-between text-xs text-parchment-dim mb-1 font-heading">
          <span>{label}</span>
          <span>
            {value}/{max}
          </span>
        </div>
      )}
      <div className="h-2 w-full bg-[#1a0d0d] rounded-full overflow-hidden border border-[var(--border-subtle)]">
        <div
          className="h-full bg-gradient-to-r from-crimson-dark via-crimson to-crimson-glow transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

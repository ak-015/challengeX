import type { DayCount } from '../adminApi';
import { seriesValues } from '../rules';
import { cn } from '@/lib/cn';
import { GlassPanel } from '@/components/ui/GlassPanel';

export function StatCard({ label, value, sub, loading }: { label: string; value: string | number; sub?: string; loading?: boolean }) {
  return (
    <GlassPanel corners={false} className="p-4">
      <p className="font-label text-xs uppercase tracking-wider text-ash-dim">{label}</p>
      <p className={cn('mt-1 font-display text-3xl font-bold text-white', loading && 'skeleton text-transparent')}>{loading ? '000' : value}</p>
      {sub && <p className="mt-0.5 font-prose text-xs text-ash-dim">{sub}</p>}
    </GlassPanel>
  );
}

/** Hand-written SVG line + area chart for a 30-day series. Includes a hidden data table for screen readers. */
export function Sparkline({ title, data, color = '#ff5a67' }: { title: string; data: DayCount[]; color?: string }) {
  const W = 320;
  const H = 96;
  const P = 8;
  const vals = seriesValues(data);
  const n = vals.length;
  const max = Math.max(1, ...vals);
  const total = vals.reduce((a, b) => a + b, 0);
  const x = (i: number) => (n <= 1 ? W / 2 : P + (i * (W - 2 * P)) / (n - 1));
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const line = vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = n > 0 ? `${line} L${x(n - 1).toFixed(1)} ${H - P} L${x(0).toFixed(1)} ${H - P} Z` : '';
  const peakIdx = vals.indexOf(Math.max(...vals, 0));
  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-label text-sm font-bold text-ash">{title}</span>
        <span className="font-prose text-xs text-ash-dim">
          {total} in 30 days · peak {max}
          {data[peakIdx] ? ` on ${data[peakIdx].day}` : ''}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${title}: ${total} in the last 30 days, peak ${max} per day`}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={P} x2={W - P} y1={H - P - f * (H - 2 * P)} y2={H - P - f * (H - 2 * P)} stroke="#3a2a2c" strokeWidth="1" />
        ))}
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="#6a5a58" strokeWidth="1" />
        {area && <path d={area} fill={color} opacity="0.18" />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {n > 0 && <circle cx={x(n - 1)} cy={y(vals[n - 1] ?? 0)} r="3.5" fill="#fff" stroke={color} strokeWidth="2" />}
      </svg>
      <div className="flex justify-between font-prose text-[11px] text-ash-mute" aria-hidden="true">
        <span>{data[0]?.day}</span>
        <span>{data[n - 1]?.day}</span>
      </div>
      <table className="sr-only">
        <caption>{title}, daily values</caption>
        <thead>
          <tr><th scope="col">Day</th><th scope="col">Count</th></tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}><th scope="row">{d.day}</th><td>{d.count}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Horizontal bars with a text label and the number next to each bar. */
export function Bars({ rows }: { rows: { label: string; value: number; display: string; color: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 font-label text-sm text-ash">
            <span className="font-bold">{r.label}</span>
            <span>{r.display}</span>
          </div>
          <div className="h-3 overflow-hidden rounded bg-[#2a1214]" aria-hidden="true">
            <div className="h-full rounded" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

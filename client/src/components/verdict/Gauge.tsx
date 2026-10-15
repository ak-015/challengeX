import { useEffect, useState } from 'react';
import { useCountUp } from '@/hooks/useCountUp';
import { useReducedMotion } from '@/hooks/useMedia';
import type { Verdict } from '@/lib/constants';
import { VERDICT_STYLE } from '@/lib/constants';
import { GAUGE_C, GAUGE_R, gaugeOffset } from '@/lib/gauge';

/** Big circular red gauge: stroke-dashoffset animates 0 -> score while the number counts up. */
export function Gauge({ score, verdict, animate = true, size = 220, label = true }: { score: number; verdict: Verdict | null; animate?: boolean; size?: number; label?: boolean }) {
  const reduced = useReducedMotion();
  const run = animate && !reduced;
  const [shown, setShown] = useState(run ? 0 : score);
  const n = useCountUp(score, 1600, run);
  const ring = verdict ? VERDICT_STYLE[verdict].ring : '#e50920';

  useEffect(() => {
    if (!run) {
      setShown(score);
      return;
    }
    const t = requestAnimationFrame(() => setShown(score));
    return () => cancelAnimationFrame(t);
  }, [score, run]);

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg viewBox="0 0 220 220" width={size} height={size} role="img" aria-label={`Market readiness score ${score} out of 100${verdict ? `, verdict ${verdict}` : ''}`}>
        <circle cx="110" cy="110" r={GAUGE_R + 14} fill="none" stroke="rgba(229,9,32,0.25)" strokeWidth="1" />
        <circle cx="110" cy="110" r={GAUGE_R} fill="none" stroke="#2a1214" strokeWidth="16" />
        <circle
          cx="110"
          cy="110"
          r={GAUGE_R}
          fill="none"
          stroke={ring}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={GAUGE_C}
          strokeDashoffset={gaugeOffset(shown)}
          transform="rotate(-90 110 110)"
          style={{ transition: run ? 'stroke-dashoffset 1.6s cubic-bezier(0.2, 0.8, 0.2, 1)' : undefined }}
        />
        {Array.from({ length: 10 }, (_, i) => {
          const a = ((i * 36 - 90) * Math.PI) / 180;
          return <line key={i} x1={110 + Math.cos(a) * (GAUGE_R + 22)} y1={110 + Math.sin(a) * (GAUGE_R + 22)} x2={110 + Math.cos(a) * (GAUGE_R + 28)} y2={110 + Math.sin(a) * (GAUGE_R + 28)} stroke="#8a6a6c" strokeWidth="2" />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl font-bold text-white" style={{ fontSize: size * 0.24 }} aria-hidden="true">
          {n}
        </span>
        {label && <span className="font-label text-xs tracking-[0.2em] text-ash-dim">OF 100</span>}
      </div>
    </div>
  );
}

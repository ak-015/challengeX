import { useReducedMotion } from '@/hooks/useMedia';

/** Anvil + hammer + ember sparks. Loops while the verdict is being generated. */
export function ForgeAnimation() {
  const reduced = useReducedMotion();
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-6 text-center">
      <svg viewBox="0 0 240 200" width="240" height="200" aria-hidden="true">
        <ellipse cx="120" cy="178" rx="90" ry="12" fill="url(#glow-red)" />
        <path d="M50 120 H190 L176 140 H150 L156 168 H84 L90 140 H64 Z" fill="#1b1514" stroke="#5a443f" strokeWidth="2" />
        <path d="M44 112 H196 L186 124 H54 Z" fill="#2a201f" stroke="#7a5a54" strokeWidth="2" />
        <rect x="70" y="118" width="100" height="3" fill="#ff3a4b" opacity=".7" />
        <g className={reduced ? undefined : 'anvil-hit'} style={{ transformOrigin: '170px 60px' }}>
          <rect x="90" y="40" width="90" height="26" rx="4" fill="#3a2d2b" stroke="#8a6a64" strokeWidth="2" transform="rotate(0)" />
          <rect x="176" y="48" width="48" height="10" rx="3" fill="#5a3a22" stroke="#8a6a64" />
        </g>
        {!reduced &&
          [-34, -14, 10, 30].map((dx, i) => (
            <circle key={i} cx={118 + i * 6} cy="112" r="2.6" fill="#ffb347" className="forge-spark" style={{ ['--dx' as string]: `${dx}px`, animationDelay: `${i * 0.22}s` }} />
          ))}
      </svg>
      <p className="font-display text-xl font-bold tracking-wide text-ash sm:text-2xl">The Verdict is being forged…</p>
      <p className="font-prose text-ash-dim">Weighing every answer, every rival, every skipped question.</p>
      <div className="w-full max-w-xs px-3">
        <div role="progressbar" aria-label="Generating verdict" aria-valuetext="In progress" className="forge-progress">
          <span className={reduced ? 'forge-progress-static' : 'forge-progress-active'} />
        </div>
      </div>
    </div>
  );
}

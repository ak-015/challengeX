import { Hexagram, RuneRing, TickRing } from './runes';

/** Faint rune circle fixed to the top-left of every screen. Transform-only slow rotation. */
export function RuneWatermark() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[1] h-[260px] w-[260px] -translate-x-[38%] -translate-y-[38%] opacity-[0.14] sm:h-[420px] sm:w-[420px]" style={{ color: 'var(--crimson-text)' }}>
      <svg viewBox="-110 -110 220 220" className="spin-slow h-full w-full">
        <circle r={104} fill="none" stroke="currentColor" strokeWidth={1.2} />
        <circle r={78} fill="none" stroke="currentColor" strokeWidth={1} />
        <TickRing r={104} count={72} len={3} />
        <RuneRing r={91} count={28} scale={1.1} />
        <Hexagram r={72} strokeWidth={1.2} />
        <circle r={44} fill="none" stroke="currentColor" strokeWidth={1} />
      </svg>
    </div>
  );
}

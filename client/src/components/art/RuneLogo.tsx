import { Hexagram, TickRing } from './runes';

export function RuneLogo({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="-20 -20 40 40" className={className} aria-hidden="true" focusable="false" style={{ color: 'var(--crimson-text)' }}>
      <circle r={18} fill="rgba(5,5,5,0.7)" stroke="currentColor" strokeWidth={1.4} />
      <TickRing r={18} count={24} len={2} strokeWidth={0.8} />
      <circle r={13} fill="none" stroke="currentColor" strokeWidth={0.8} opacity={0.8} />
      <Hexagram r={10} strokeWidth={1.2} />
      <circle r={2} fill="currentColor" />
    </svg>
  );
}

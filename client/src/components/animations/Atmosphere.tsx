import { useMemo } from 'react';
import { Smoke } from './Smoke';

/**
 * Floating crimson embers. Pure CSS animation (cheap on mobile) with
 * randomized delays/positions. Respects prefers-reduced-motion via the
 * global animation kill-switch in index.css.
 */
export function Embers({ count = 18, className = '' }: { count?: number; className?: string }) {
  const embers = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        duration: 5 + Math.random() * 6,
        delay: Math.random() * 6,
        drift: (Math.random() - 0.5) * 60,
      })),
    [count],
  );

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {embers.map((e) => (
        <span
          key={e.id}
          className="absolute bottom-0 rounded-full bg-crimson-glow animate-ember"
          style={{
            left: `${e.left}%`,
            width: `${e.size}px`,
            height: `${e.size}px`,
            boxShadow: '0 0 6px 2px rgba(255,38,56,0.6)',
            animationDuration: `${e.duration}s`,
            animationDelay: `${e.delay}s`,
            ['--ember-x' as string]: `${e.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

/** Drifting volumetric smoke that merges with the scene behind it (see Smoke). */
export function Fog({ className = '', intensity = 1 }: { className?: string; intensity?: number }) {
  return <Smoke className={className} intensity={intensity} />;
}

export { Smoke };

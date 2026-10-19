import { useMemo } from 'react';

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

/** Layered drifting fog using radial gradients. */
export function Fog({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div
        className="absolute inset-0 animate-pulse-glow"
        style={{
          background:
            'radial-gradient(ellipse 80% 40% at 20% 80%, rgba(118,11,18,0.25), transparent), radial-gradient(ellipse 70% 35% at 80% 90%, rgba(229,9,32,0.12), transparent)',
        }}
      />
    </div>
  );
}

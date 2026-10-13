import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Hexagram, RuneRing, TickRing } from '@/components/art/runes';
import { useFx } from '@/store/sceneFxStore';

/** Rune ring on a circle, tick ring, hexagram, inner circle. Outer and inner rings rotate in opposite directions. */
export function MagicCircle({ className }: { className?: string }) {
  return (
    <svg viewBox="-200 -200 400 400" className={className} aria-hidden="true" focusable="false" style={{ color: '#ff4a58' }}>
      <circle r="196" fill="url(#glow-red)" className="pulse-opacity" opacity=".5" />
      <g fill="none" stroke="currentColor">
        <circle r="190" strokeWidth="5" opacity=".25" />
        <circle r="190" strokeWidth="1.8" />
        <circle r="172" strokeWidth="1.2" opacity=".8" />
        <g className="mc-spin-a">
          <RuneRing r={158} count={34} scale={1.5} strokeWidth={1.5} />
          <TickRing r={140} count={90} len={4} strokeWidth={1} />
        </g>
        <circle r="136" strokeWidth="1.2" opacity=".7" />
        <g className="mc-spin-b">
          <Hexagram r={118} strokeWidth={2} />
          <g opacity=".2">
            <Hexagram r={118} strokeWidth={7} />
          </g>
        </g>
        <circle r="70" strokeWidth="1.6" />
        <g className="mc-spin-a" style={{ animationDuration: '50s' }}>
          <RuneRing r={58} count={14} scale={0.9} strokeWidth={1.3} />
        </g>
        <circle r="38" strokeWidth="1.2" opacity=".8" />
        <path d="M0 -30 L26 15 H-26 Z" strokeWidth="1.6" />
        <circle r="5" fill="currentColor" />
      </g>
    </svg>
  );
}

export type CirclePose = 'menu' | 'dais' | 'dais-dim' | 'none';

/**
 * ONE persistent circle in the app shell. It stays mounted across routes and moves between poses with a single
 * CSS transform transition (translate / rotateX tilt / scale): the menu centre -> the altar dais.
 */
export function MagicCircleLayer({ pose }: { pose: CirclePose }) {
  const [geo, setGeo] = useState({ k: 1, ty: 0, size: 600 });
  const flareKey = useFx((s) => s.flareKey);
  const [flaring, setFlaring] = useState(false);
  const first = useRef(true);

  useLayoutEffect(() => {
    const measure = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const stageW = Math.max(w, 1.7778 * h);
      const stageH = Math.max(0.5625 * w, h);
      const size = Math.min(0.86 * w, 0.8 * h, 760);
      // dais top centre sits at (50%, 62.2%) of the stage; its ring is ~35% of the stage width
      setGeo({ k: (0.35 * stageW) / size, ty: (560 / 900 - 0.5) * stageH, size });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setFlaring(true);
    const t = setTimeout(() => setFlaring(false), 750);
    return () => clearTimeout(t);
  }, [flareKey]);

  const onDais = pose === 'dais' || pose === 'dais-dim';
  const transform = onDais ? `translateY(${geo.ty}px) rotateX(76deg) scale(${geo.k})` : 'translateY(0px) rotateX(0deg) scale(1)';
  const opacity = pose === 'none' ? 0 : pose === 'dais-dim' ? 0.4 : 1;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[2] flex items-center justify-center" style={{ perspective: 1400 }}>
      <div
        data-mc
        style={{
          width: geo.size,
          height: geo.size,
          opacity,
          transform,
          transition: 'transform 1.6s cubic-bezier(0.6, 0, 0.2, 1), opacity 0.8s ease',
          willChange: 'transform, opacity',
        }}
      >
        <div className={flaring ? 'mc-flare' : undefined}>
          <MagicCircle className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

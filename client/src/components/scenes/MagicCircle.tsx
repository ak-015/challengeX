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

export type CirclePose = 'menu' | 'dais' | 'dais-dim' | 'floor' | 'none';

/**
 * ONE persistent circle in the app shell. It stays mounted across routes and moves between poses with a single
 * CSS transform transition (translate / rotateX tilt / scale): the menu centre -> the altar dais -> the Paths
 * ritual floor (tilted across the lower foreground).
 */
export function MagicCircleLayer({ pose }: { pose: CirclePose }) {
  const [geo, setGeo] = useState({ k: 1, ty: 0, kf: 1, tyf: 0, size: 600 });
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
      // dais top centre sits at (50%, 62.2%) of the stage; its ring is ~35% of the stage width.
      // The floor pose spans the lower foreground of the Paths page (~74vw wide, centred at 75.5% height).
      setGeo({
        k: (0.35 * stageW) / size,
        ty: (560 / 900 - 0.5) * stageH,
        kf: Math.min(0.74 * w, 1.35 * h) / size,
        tyf: (0.755 - 0.5) * h,
        size,
      });
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
  const onFloor = pose === 'floor';
  const transform = onDais
    ? `translateY(${geo.ty}px) rotateX(76deg) scale(${geo.k})`
    : onFloor
      ? `translateY(${geo.tyf}px) rotateX(80deg) scale(${geo.kf})`
      : 'translateY(0px) rotateX(0deg) scale(1)';
  const opacity = pose === 'none' ? 0 : pose === 'dais-dim' ? 0.4 : onFloor ? 0.85 : 1;

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

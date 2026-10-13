import { useEffect, useState } from 'react';
import { useReducedMotion } from './useMedia';

/** Counts from 0 to `value` over `ms` (ease-out). Returns the final value immediately when animation is off. */
export function useCountUp(value: number, ms = 1600, enabled = true): number {
  const reduced = useReducedMotion();
  const [v, setV] = useState(enabled && !reduced ? 0 : value);
  useEffect(() => {
    if (!enabled || reduced) {
      setV(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms);
      setV(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms, enabled, reduced]);
  return v;
}

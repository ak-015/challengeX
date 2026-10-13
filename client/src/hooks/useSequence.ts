import { useEffect, useState } from 'react';
import { useReducedMotion } from './useMedia';

/** Reveals stages one after another. `delays[i]` = ms (from mount) at which stage i appears. Returns how many are visible. */
export function useSequence(delays: number[], skip = false): { count: number; showAll: () => void } {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(skip || reduced ? delays.length : 0);
  useEffect(() => {
    if (skip || reduced) {
      setCount(delays.length);
      return;
    }
    const timers = delays.map((d, i) => window.setTimeout(() => setCount((c) => Math.max(c, i + 1)), d));
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, reduced]);
  return { count, showAll: () => setCount(delays.length) };
}

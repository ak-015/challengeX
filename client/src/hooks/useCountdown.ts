import { useEffect, useState } from 'react';

/** Milliseconds remaining until `deadline` (epoch ms); re-renders every second. 0 when passed or null. */
export function useCountdown(deadline: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline]);
  return deadline === null ? 0 : Math.max(0, deadline - now);
}

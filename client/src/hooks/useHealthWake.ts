import { useEffect, useState } from 'react';
import { health } from '@/lib/endpoints';

let started = false;
let alive = false;
const listeners = new Set<(v: boolean) => void>();
const emit = () => listeners.forEach((l) => l(alive));

/**
 * Silently pings GET /api/health once per page load (wakes a sleeping Render instance).
 * `waking` turns true only if there is no answer after 4 s; it goes back to false as soon as the API answers.
 */
export function startHealthPing(): void {
  if (started) return;
  started = true;
  const attempt = async (): Promise<void> => {
    try {
      await health();
      alive = true;
      emit();
    } catch {
      await new Promise((r) => setTimeout(r, 2500));
      if (!alive) return attempt();
    }
  };
  void attempt();
}

export function useHealthWake(): { waking: boolean; alive: boolean } {
  const [isAlive, setAlive] = useState(alive);
  const [waking, setWaking] = useState(false);
  useEffect(() => {
    startHealthPing();
    const l = (v: boolean) => setAlive(v);
    listeners.add(l);
    const timer = setTimeout(() => setWaking(true), 4000);
    return () => {
      listeners.delete(l);
      clearTimeout(timer);
    };
  }, []);
  return { waking: waking && !isAlive, alive: isAlive };
}

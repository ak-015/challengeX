import { useEffect, useRef } from 'react';
import { FLAMES, STAGE_H, STAGE_W } from '@/components/gate/stage';
import type { FlameSpec } from '@/components/gate/stage';

/**
 * Live fire for the braziers in the gate artwork. Additively-blended particles
 * (white-yellow core → orange → crimson → ash) rise with turbulence, plus a
 * flickering light pool, drawn over the painted flames so they come alive.
 */

const RES = 0.55; // internal canvas resolution relative to the 1600×900 stage

const RAMP: [number, number, number][] = [
  [255, 176, 84],
  [255, 128, 44],
  [236, 74, 26],
  [180, 32, 22],
  [96, 12, 12],
];

function sprite([r, g, b]: [number, number, number]) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gr.addColorStop(0.35, `rgba(${r},${g},${b},0.55)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr;
  x.fillRect(0, 0, 64, 64);
  return c;
}

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  phase: number;
}

export function Flames({ emitters = FLAMES, className = '' }: { emitters?: FlameSpec[]; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = Math.round(STAGE_W * RES);
    canvas.height = Math.round(STAGE_H * RES);

    const sprites = RAMP.map(sprite);
    const parts: P[][] = emitters.map(() => []);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const spawn = (e: FlameSpec): P => {
      const spread = (Math.random() - 0.5) * e.w * (1 - Math.random() * 0.5);
      return {
        x: (e.x + spread) * RES,
        y: e.y * RES,
        vx: (Math.random() - 0.5) * 8 * RES,
        vy: -(70 + Math.random() * 80) * e.s * RES,
        age: 0,
        life: 0.45 + Math.random() * 0.55,
        size: (15 + Math.random() * 15) * e.s * RES,
        phase: Math.random() * 6.28,
      };
    };

    let acc = emitters.map(() => 0);
    let time = 0;
    const step = (dt: number) => {
      time += dt;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'lighter';

      emitters.forEach((e, ei) => {
        // flickering light pool under/around the flame
        const f =
          0.5 +
          0.25 * Math.sin(time * 11 + ei * 2) +
          0.15 * Math.sin(time * 23 + ei * 5) +
          0.1 * Math.sin(time * 37 + ei);
        const gx = e.x * RES;
        const gy = (e.y - 26 * e.s) * RES;
        const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 120 * e.s * RES);
        gr.addColorStop(0, `rgba(255,110,36,${0.2 * f})`);
        gr.addColorStop(0.5, `rgba(200,36,22,${0.09 * f})`);
        gr.addColorStop(1, 'rgba(120,10,10,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(gx - 160 * RES, gy - 160 * RES, 320 * RES, 320 * RES);

        acc[ei] += dt * 38 * e.s;
        while (acc[ei] >= 1) {
          acc[ei] -= 1;
          parts[ei].push(spawn(e));
        }

        const list = parts[ei];
        for (let i = list.length - 1; i >= 0; i--) {
          const p = list[i];
          p.age += dt;
          if (p.age >= p.life) {
            list.splice(i, 1);
            continue;
          }
          const t = p.age / p.life;
          p.x += (p.vx + Math.sin(p.age * 9 + p.phase) * 16 * RES) * dt;
          p.y += p.vy * dt;
          p.vy *= 1 - 0.6 * dt;
          const s = p.size * (1 - t * 0.7);
          const idx = Math.min(RAMP.length - 1, Math.floor(t * RAMP.length));
          const fadeIn = Math.min(1, t * 10);
          ctx.globalAlpha = Math.max(0, (1 - t) ** 1.5) * 0.5 * fadeIn;
          ctx.drawImage(sprites[idx], p.x - s, p.y - s, s * 2, s * 2);
        }
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    if (reduced) {
      for (let i = 0; i < 40; i++) step(0.03);
      return;
    }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden) step(dt);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [emitters]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}

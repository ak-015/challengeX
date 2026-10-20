import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

/**
 * Live particle layer for the gate artwork. Everything is authored in the
 * artwork's own 1600×900 coordinate space, so it stays pinned to the braziers
 * and sword blades at any viewport size.
 *
 *  - Braziers: layered additive flame particles with wobble + a flickering light pool,
 *    drawn on top of the (static) painted flames so they read as moving fire.
 *  - Swords: rising energy motes along each blade and a flickering arc of lightning.
 *
 * `boostRef` (0 → 1) lets the opening sequence feed more energy into the effects.
 */

const W0 = 1600;

const FLAMES = [
  { x: 66, y: 654, w: 74, h: 78 },
  { x: 270, y: 708, w: 64, h: 74 },
  { x: 1420, y: 704, w: 64, h: 74 },
  { x: 1587, y: 668, w: 74, h: 78 },
];

const SWORDS = [
  { x: 487, y0: 510, y1: 700 },
  { x: 1202, y0: 510, y1: 700 },
];

type Heat = 0 | 1 | 2 | 3;

function makeSprite(stops: [number, string][]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

function buildSprites(): HTMLCanvasElement[] {
  return [
    makeSprite([[0, 'rgba(255,235,190,.85)'], [0.3, 'rgba(255,170,70,.5)'], [1, 'rgba(255,70,20,0)']]),
    makeSprite([[0, 'rgba(255,170,60,.95)'], [0.45, 'rgba(255,85,25,.5)'], [1, 'rgba(255,40,15,0)']]),
    makeSprite([[0, 'rgba(255,70,35,.8)'], [0.5, 'rgba(200,15,25,.35)'], [1, 'rgba(150,5,15,0)']]),
    makeSprite([[0, 'rgba(150,12,20,.5)'], [1, 'rgba(90,0,10,0)']]),
  ];
}

interface Flame {
  kind: 'flame';
  x: number; y: number; vx: number; vy: number;
  life: number; age: number; size: number; phase: number; freq: number; amp: number;
}
interface Mote {
  kind: 'mote';
  x: number; y: number; vx: number; vy: number;
  life: number; age: number; size: number; hot: boolean;
}
type Particle = Flame | Mote;

export function GateFx({
  width,
  height,
  boostRef,
  mobile,
}: {
  width: number;
  height: number;
  boostRef: MutableRefObject<number>;
  mobile: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || width < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const k = canvas.width / W0;
    const sprites = buildSprites();
    const parts: Particle[] = [];
    const flameRate = mobile ? 38 : 64; // particles / second / brazier
    const moteRate = mobile ? 9 : 16; // particles / second / sword
    const spawnAcc = { f: [0, 0, 0, 0], m: [0, 0] };
    const bolt = { pts: [] as [number, number][], next: 0, on: 0 };
    let raf = 0;
    let last = performance.now();
    let t = 0;

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    const makeBolt = (sx: number, y0: number, y1: number) => {
      const pts: [number, number][] = [];
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        const spread = Math.sin(f * Math.PI) * 9 + 2;
        pts.push([sx + rnd(-spread, spread), y0 + (y1 - y0) * f]);
      }
      return pts;
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const boost = 1 + boostRef.current * 1.6;

      // ---- spawn -------------------------------------------------------
      FLAMES.forEach((f, i) => {
        spawnAcc.f[i] += dt * flameRate * boost;
        while (spawnAcc.f[i] >= 1) {
          spawnAcc.f[i] -= 1;
          parts.push({
            kind: 'flame',
            x: f.x + rnd(-f.w, f.w) * 0.22,
            y: f.y + rnd(-4, 4),
            vx: rnd(-6, 6),
            vy: -(f.h / rnd(0.7, 1.15)),
            life: rnd(0.55, 1.1),
            age: 0,
            size: f.w * rnd(0.32, 0.6),
            phase: rnd(0, 6.28),
            freq: rnd(3, 8),
            amp: f.w * rnd(0.05, 0.16),
          });
        }
      });
      SWORDS.forEach((s, i) => {
        spawnAcc.m[i] += dt * moteRate * boost;
        while (spawnAcc.m[i] >= 1) {
          spawnAcc.m[i] -= 1;
          parts.push({
            kind: 'mote',
            x: s.x + rnd(-8, 8),
            y: rnd(s.y0 + 20, s.y1),
            vx: rnd(-14, 14),
            vy: -rnd(18, 52),
            life: rnd(0.8, 1.7),
            age: 0,
            size: rnd(3, 7),
            hot: Math.random() < 0.45,
          });
        }
      });

      // ---- draw --------------------------------------------------------
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.globalCompositeOperation = 'lighter';

      // flickering light pools around the braziers
      FLAMES.forEach((f, i) => {
        const flick =
          0.5 + 0.5 * Math.sin(t * 9 + i * 2.1) * Math.sin(t * 5.3 + i) + 0.25 * Math.sin(t * 17 + i * 4);
        const a = Math.max(0, 0.16 + 0.14 * flick) * boost * 0.45;
        const r = f.w * 2.6;
        const g = ctx.createRadialGradient(f.x, f.y - 14, 0, f.x, f.y - 14, r);
        g.addColorStop(0, `rgba(255,120,40,${a})`);
        g.addColorStop(1, 'rgba(255,40,20,0)');
        ctx.fillStyle = g;
        ctx.fillRect(f.x - r, f.y - 14 - r, r * 2, r * 2);
      });

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) {
          parts.splice(i, 1);
          continue;
        }
        const u = p.age / p.life;
        if (p.kind === 'flame') {
          p.x += (p.vx + Math.sin(p.phase + p.age * p.freq) * p.amp * 6) * dt;
          p.y += p.vy * dt * (1 - u * 0.45);
          const heat: Heat = u < 0.2 ? 0 : u < 0.5 ? 1 : u < 0.8 ? 2 : 3;
          const s = p.size * (1.15 - u * 0.75);
          ctx.globalAlpha = Math.min(1, (1 - u) * 1.1) * 0.5;
          ctx.drawImage(sprites[heat], p.x - s * 0.34, p.y - s * 1.25, s * 0.68, s * 2.3);
        } else {
          p.x += p.vx * dt + Math.sin(p.age * 6 + p.y) * 4 * dt;
          p.y += p.vy * dt;
          const fade = Math.sin(Math.min(1, u) * Math.PI);
          const s = p.size * (1 - u * 0.4);
          ctx.globalAlpha = fade * 0.9;
          ctx.drawImage(sprites[p.hot ? 0 : 1], p.x - s / 2, p.y - s / 2, s, s);
        }
      }

      // lightning arcing down each blade
      if (now > bolt.next) {
        bolt.next = now + rnd(70, 170);
        bolt.on = Math.random() < 0.7 + boostRef.current * 0.3 ? 1 : 0;
        bolt.pts = [];
      }
      if (bolt.on) {
        ctx.globalAlpha = 0.55 + Math.random() * 0.4;
        ctx.lineJoin = 'round';
        SWORDS.forEach((s) => {
          const pts = makeBolt(s.x, s.y0 + 6, s.y1 - 4);
          for (const [w, col] of [
            [5, 'rgba(255,40,60,.35)'],
            [1.6, 'rgba(255,225,225,.95)'],
          ] as const) {
            ctx.lineWidth = w;
            ctx.strokeStyle = col;
            ctx.beginPath();
            pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
            ctx.stroke();
          }
        });
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [width, height, mobile, boostRef]);

  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}

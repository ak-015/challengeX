import { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'framer-motion';
import { GlSmoke } from './GlSmoke';

/**
 * Volumetric smoke. A handful of large procedural noise sprites drift, rotate and
 * breathe on a low-resolution canvas. The canvas is composited with
 * `mix-blend-mode: screen` and feathered with a mask, so it lights the scene
 * behind it instead of sitting on top as a flat overlay — it reads as part of
 * the background art.
 */

type Tint = 'crimson' | 'ash';

export interface SmokeProps {
  className?: string;
  /** Overall opacity multiplier (default 1). */
  intensity?: number;
  /** Puff-count multiplier (default 1). */
  density?: number;
  tint?: Tint;
  /** Optional live multiplier (e.g. a framer-motion value) read every frame. */
  boost?: MotionValue<number>;
  /** Pin to the viewport instead of the nearest positioned ancestor. */
  fixed?: boolean;
  /** Tailwind height utility for the smoke band. */
  heightClass?: string;
}

const TEX = 256;

function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function lattice(n: number, rnd: () => number) {
  const a = new Float32Array((n + 2) * (n + 2));
  for (let i = 0; i < a.length; i++) a[i] = rnd();
  return a;
}

function sample(a: Float32Array, n: number, u: number, v: number) {
  const x = u * n;
  const y = v * n;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const s = n + 2;
  const a00 = a[yi * s + xi];
  const a10 = a[yi * s + xi + 1];
  const a01 = a[(yi + 1) * s + xi];
  const a11 = a[(yi + 1) * s + xi + 1];
  return a00 + (a10 - a00) * sx + (a01 - a00) * sy + (a00 - a10 - a01 + a11) * sx * sy;
}

function makeTexture(seed: number, [r, g, b]: [number, number, number]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(TEX, TEX);
  const rnd = rng(seed);
  const octaves = [4, 8, 16, 32].map((n) => ({ n, a: lattice(n, rnd) }));
  const weights = [0.5, 0.26, 0.15, 0.09];
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const u = x / TEX;
      const v = y / TEX;
      let n = 0;
      octaves.forEach((o, i) => (n += sample(o.a, o.n, u, v) * weights[i]));
      const dx = (u - 0.5) * 2;
      const dy = (v - 0.5) * 2;
      const fall = Math.max(0, 1 - (dx * dx + dy * dy));
      const soft = fall * fall * (3 - 2 * fall);
      const dens = Math.min(1, Math.max(0, (n - 0.3) * 2.3)) * soft;
      const shade = 0.7 + 0.3 * n;
      const i = (y * TEX + x) * 4;
      img.data[i] = r * shade;
      img.data[i + 1] = g * shade;
      img.data[i + 2] = b * shade;
      img.data[i + 3] = dens * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

const PALETTES: Record<Tint, [number, number, number][]> = {
  crimson: [[205, 40, 52], [238, 118, 122], [172, 148, 150], [150, 22, 34]],
  ash: [[190, 175, 175], [150, 135, 138], [215, 200, 198], [120, 105, 110]],
};

interface Puff {
  tex: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  age: number;
  life: number;
  alpha: number;
}

function CanvasSmoke({
  className = '',
  intensity = 1,
  density = 1,
  tint = 'crimson',
  boost,
  fixed = false,
  heightClass = 'h-[70%]',
}: SmokeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const textures = PALETTES[tint].map((rgb, i) => makeTexture(7919 * (i + 1), rgb));
    const rnd = rng(Math.floor(Math.random() * 1e9));

    let W = 0;
    let H = 0;
    const resize = () => {
      const scale = 0.5;
      W = Math.max(2, Math.round(canvas.clientWidth * scale));
      H = Math.max(2, Math.round(canvas.clientHeight * scale));
      canvas.width = W;
      canvas.height = H;
    };
    resize();

    const spawn = (initial: boolean): Puff => {
      const life = 34 + rnd() * 36;
      const dir = rnd() < 0.65 ? 1 : -1;
      return {
        tex: Math.floor(rnd() * textures.length),
        x: (rnd() * 1.5 - 0.25) * W,
        y: H * (0.38 + rnd() * 0.75),
        vx: dir * (0.008 + rnd() * 0.022) * W,
        vy: -(0.004 + rnd() * 0.012) * H,
        size: (0.55 + rnd() * 0.6) * W,
        rot: rnd() * Math.PI * 2,
        vr: (rnd() - 0.5) * 0.07,
        age: initial ? rnd() * life : 0,
        life,
        alpha: 0.13 + rnd() * 0.17,
      };
    };

    const count = Math.max(8, Math.round(15 * density));
    const puffs = Array.from({ length: count }, () => spawn(true));

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, W, H);
      const live = intensity * (boost ? boost.get() : 1);
      for (const p of puffs) {
        p.age += dt;
        if (p.age >= p.life) Object.assign(p, spawn(false));
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const t = p.age / p.life;
        // slow swell + fade in/out so puffs never pop
        const env = Math.pow(Math.sin(Math.PI * t), 0.9);
        const s = p.size * (0.85 + 0.35 * t);
        ctx.globalAlpha = Math.min(1, p.alpha * env * live);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(textures[p.tex], -s / 2, -s / 2, s, s);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    draw(0);
    if (reduced) return;

    let raf = 0;
    let last = performance.now();
    let visible = true;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      draw(Math.min(0.05, (now - last) / 1000));
      last = now;
    };
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [intensity, density, tint, boost]);

  const mask = 'linear-gradient(to top, #000 0%, #000 38%, rgba(0,0,0,0.55) 68%, transparent 100%)';

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none bottom-0 left-0 w-full ${heightClass} ${
        fixed ? 'fixed z-[1]' : 'absolute'
      } ${className}`}
      style={{ mixBlendMode: 'screen', WebkitMaskImage: mask, maskImage: mask }}
    />
  );
}

/**
 * Volumetric fog. Renders the WebGL2 fog (same shader family as the realm scenes) and
 * quietly falls back to the canvas-2D sprite smoke when WebGL2 is unavailable.
 */
export function Smoke(props: SmokeProps) {
  const [failed, setFailed] = useState(false);
  return failed ? <CanvasSmoke {...props} /> : <GlSmoke {...props} onFail={() => setFailed(true)} />;
}

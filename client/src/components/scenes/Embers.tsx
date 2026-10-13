import { useEffect, useRef } from 'react';

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  max: number;
  ph: number;
  hue: number;
}

/**
 * ONE canvas of rising embers. <= 40 particles on desktop, <= 18 on mobile, DPR capped at 1.5,
 * paused while the tab is hidden, and not drawn at all with prefers-reduced-motion.
 */
export function Embers({ density = 1 }: { density?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    const count = Math.max(4, Math.round((mobile ? 18 : 40) * Math.min(1, density)));
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let w = 0;
    let h = 0;
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = (initial: boolean): P => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      vx: (Math.random() - 0.5) * 12,
      vy: 18 + Math.random() * 38,
      r: 0.8 + Math.random() * 1.9,
      life: initial ? Math.random() * 6 : 0,
      max: 5 + Math.random() * 6,
      ph: Math.random() * Math.PI * 2,
      hue: 10 + Math.random() * 30,
    });
    const ps: P[] = Array.from({ length: count }, () => spawn(true));

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i] as P;
        p.life += dt;
        p.y -= p.vy * dt;
        p.x += (p.vx + Math.sin(p.life * 1.6 + p.ph) * 14) * dt;
        if (p.life > p.max || p.y < -10) {
          ps[i] = spawn(false);
          continue;
        }
        const t = p.life / p.max;
        const a = Math.sin(Math.PI * Math.min(1, t)) * 0.9;
        ctx.fillStyle = `hsla(${p.hue}, 100%, 58%, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVis);
    if (!document.hidden) start();
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('resize', resize);
    };
  }, [density]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}

import { useEffect, useRef, useState } from 'react';
import { Embers } from '@/components/animations/Atmosphere';
import { Smoke } from '@/components/animations/Smoke';
import { RealmEngine } from './engine';
import { loadSceneAssets } from './masks';
import { SCENES } from './scenes';
import type { SceneConfig } from './scenes';

interface RealmSceneProps {
  /** which artwork: `background` (statue + braziers), `secondary` (knight + castle), `ritual` (torch hall) or `gate` (the realm gate) */
  scene: SceneConfig['id'];
  /** pin to the viewport instead of the nearest positioned ancestor */
  fixed?: boolean;
  /** same meaning as CSS object-position, as fractions: [0.5, 0] = "center top" */
  objectPosition?: [number, number];
  /** CSS gradient laid over the scene (the dark scrim that keeps text readable) */
  scrim?: string;
  /** scales every added effect; 1 = authored look, 0 = plain image */
  intensity?: number;
  className?: string;
}

const MIN_SCALE = 0.5;

/** canvas-px-per-CSS-px that keeps the pixel count sane on big / retina / mobile screens */
function pickScale(w: number, h: number, cap: number) {
  const mobile = window.matchMedia('(max-width: 768px)').matches;
  const budget = mobile ? 0.85e6 : 2.1e6;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  return Math.max(MIN_SCALE, Math.min(dpr, cap, Math.sqrt(budget / Math.max(1, w * h))));
}

declare global {
  interface Window {
    /** dev-only hook for deterministic screenshots */
    __realmFx?: {
      engines: Set<RealmEngine>;
      freeze: (t: number | null) => void;
    };
  }
}

/**
 * An artwork rendered as a living scene: painted fire flickers and throws heat shimmer,
 * flames / lava / embers burn on top of it, smoke drifts and is lit by the scene, the
 * moon burns and the swords glow. See ./engine.ts.
 *
 * The WebGL context only exists while the scene is on (or near) the screen, so a long page
 * with many scenes never exhausts the browser's context limit.
 *
 * Falls back to the plain image + the legacy CSS embers / canvas smoke when WebGL2 is
 * unavailable, so pages never lose their background.
 */
export function RealmScene({
  scene,
  fixed = false,
  objectPosition = [0.5, 0.5],
  scrim,
  intensity = 1,
  className = '',
}: RealmSceneProps) {
  const cfg = SCENES[scene];
  const hostRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [fallback, setFallback] = useState(false);
  const px = objectPosition[0];
  const py = objectPosition[1];
  // The crop position may change on every resize (e.g. the login panel keeps the gate door
  // centred). Track it in a ref so the GPU context is NOT rebuilt when only the position moves.
  const posRef = useRef<[number, number]>([px, py]);
  posRef.current = [px, py];
  const apiRef = useRef<{ refresh: () => void } | null>(null);
  useEffect(() => {
    apiRef.current?.refresh();
  }, [px, py]);

  useEffect(() => {
    const host = hostRef.current;
    const img = imgRef.current;
    if (!host || !img) return;

    let engine: RealmEngine | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let raf = 0;
    let disposed = false;
    let inView = false;
    let starting = false;
    let scale = 1;
    let cap = 1.25;
    let lastFrame = 0;
    let slow = 0;
    let frames = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const applySize = () => {
      if (!engine) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w < 2 || h < 2) return;
      scale = pickScale(w, h, cap);
      engine.resize(w, h, scale);
      if (reduced || engine.timeOverride !== null) engine.render();
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!engine || document.hidden) {
        lastFrame = 0;
        return;
      }
      if (engine.timeOverride !== null) return;

      // adaptive resolution: if the GPU can't hold ~35 fps, step the render scale down
      if (lastFrame) {
        const dt = now - lastFrame;
        slow = slow * 0.92 + Math.min(dt, 100) * 0.08;
        if (++frames > 45 && slow > 29 && cap > MIN_SCALE) {
          cap = Math.max(MIN_SCALE, Math.min(cap, scale) * 0.8);
          frames = 0;
          slow = 16;
          applySize();
        }
      }
      lastFrame = now;
      engine.render();
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      if (engine) {
        window.__realmFx?.engines.delete(engine);
        engine.dispose();
        engine = null;
      }
      canvas?.remove();
      canvas = null;
      lastFrame = 0;
    };

    const start = () => {
      if (engine || starting || disposed) return;
      starting = true;
      loadSceneAssets(cfg)
        .then((assets) => {
          starting = false;
          if (disposed || !inView || engine) return;
          const c = document.createElement('canvas');
          c.className = 'absolute inset-0 h-full w-full';
          c.style.opacity = '0';
          c.style.transition = 'opacity 700ms';
          img.after(c);
          try {
            canvas = c;
            engine = new RealmEngine(c, cfg, assets, { objectPosition: [...posRef.current], intensity });
          } catch (err) {
            if (import.meta.env.DEV) console.warn('[RealmScene] falling back to static art:', err);
            c.remove();
            canvas = null;
            engine = null;
            setFallback(true);
            return;
          }
          if (reduced) engine.timeOverride = 4.2; // a single, warm still frame
          if (import.meta.env.DEV) {
            const hook = (window.__realmFx ??= {
              engines: new Set<RealmEngine>(),
              freeze(t) {
                hook.engines.forEach((e) => {
                  e.timeOverride = t;
                  if (t !== null) e.render(t);
                });
              },
            });
            hook.engines.add(engine);
          }
          applySize();
          requestAnimationFrame(() => {
            c.style.opacity = '1';
          });
          raf = requestAnimationFrame(loop);
          c.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            stop();
            setFallback(true);
          });
        })
        .catch((err) => {
          starting = false;
          if (import.meta.env.DEV) console.warn('[RealmScene] falling back to static art:', err);
          if (!disposed) setFallback(true);
        });
    };

    apiRef.current = {
      refresh: () => {
        if (!engine) return;
        engine.setObjectPosition([...posRef.current]);
        applySize();
      },
    };
    const ro = new ResizeObserver(applySize);
    ro.observe(host);
    // create the GL context only while on / near screen; release it when scrolled away
    const io = new IntersectionObserver(
      ([e]) => {
        inView = e.isIntersecting;
        if (inView) start();
        else stop();
      },
      { rootMargin: '200px' },
    );
    io.observe(host);

    return () => {
      disposed = true;
      ro.disconnect();
      io.disconnect();
      apiRef.current = null;
      stop();
    };
  }, [cfg, intensity]);

  const pos = `${px * 100}% ${py * 100}%`;

  return (
    <div
      ref={hostRef}
      className={`pointer-events-none ${fixed ? 'fixed' : 'absolute'} inset-0 z-0 overflow-hidden ${className}`}
      aria-hidden
    >
      {/* Always present: instant first paint and the no-WebGL fallback. The live canvas is
          inserted right after it while the scene is on screen. */}
      <img ref={imgRef} src={cfg.image} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: pos }} />
      {fallback && (
        <>
          <Embers count={14} />
          <Smoke intensity={0.9} />
        </>
      )}
      {scrim && <div className="absolute inset-0" style={{ background: scrim }} />}
    </div>
  );
}

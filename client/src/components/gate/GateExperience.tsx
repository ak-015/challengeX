import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { SkipForward } from 'lucide-react';
import { assets } from '@/utils/assets';
import { Embers } from '@/components/animations/Atmosphere';
import { Smoke } from '@/components/animations/Smoke';
import { Flames } from '@/components/animations/Flames';
import { SwordGlow } from '@/components/animations/SwordGlow';
import {
  DOOR_FULL,
  DOOR_LEFT,
  DOOR_RIGHT,
  HINGE_L,
  HINGE_R,
  SEAM_X,
  STAGE_H,
  STAGE_W,
  SWORDS_CLOSED,
  SWORDS_OPEN,
  grow,
  pctX,
  pctY,
  toPath,
  toPoints,
} from './stage';

type Phase = 'loading' | 'idle' | 'opening';
type Ctl = { stop: () => void };

const DOOR_EASE: [number, number, number, number] = [0.65, 0, 0.25, 1];
const FRAME_PATH = `M0 0 H1 V1 H0 Z ${toPath(DOOR_FULL)}`;
const GATE_CENTER = { x: 0.528, y: 0.585 };

/**
 * Cinematic gate. The closed artwork is split into a "frame" (everything except
 * the doors) and two door leaves; the open artwork sits underneath. The leaves
 * swing inward in 3D, light spills out, the camera pushes through the doorway
 * and the scene dissolves into /paths. Everything is driven by framer-motion
 * motion values so the whole sequence can be skipped or cancelled instantly.
 */
export function GateExperience() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('loading');
  const startedRef = useRef(false);
  const navigatedRef = useRef(false);
  const controlsRef = useRef<Ctl[]>([]);

  // ── motion values ────────────────────────────────────────────────
  const cam = useMotionValue(1);
  const breath = useMotionValue(1);
  const shakeX = useMotionValue(0);
  const shakeY = useMotionValue(0);
  const seam = useMotionValue(0);
  const doorL = useMotionValue(0);
  const doorR = useMotionValue(0);
  const doorsOpacity = useMotionValue(1);
  const frameOpacity = useMotionValue(1);
  const spill = useMotionValue(0);
  const burst = useMotionValue(0);
  const flash = useMotionValue(0);
  const fade = useMotionValue(0);
  const smokeBoost = useMotionValue(1);

  const stageScale = useTransform([cam, breath], ([c, b]: number[]) => c * b);
  const doorLShade = useTransform(doorL, [0, 84], ['brightness(1)', 'brightness(0.4)']);
  const doorRShade = useTransform(doorR, [0, -84], ['brightness(1)', 'brightness(0.4)']);
  const seamScaleX = useTransform(seam, [0, 1], [1, 10]);
  const seamOpacity = useTransform(seam, [0, 0.7, 1], [1, 1, 0]);
  const runeScale = useTransform(seam, [0, 1], [1, 2.8]);
  const runeOpacity = useTransform(seam, [0, 0.8, 1], [1, 1, 0]);
  const openSwordsOpacity = useTransform(frameOpacity, (v) => 1 - v);

  const track = (c: Ctl) => {
    controlsRef.current.push(c);
    return c;
  };

  // ── preload both plates so the first frame is never a pop-in ──────
  useEffect(() => {
    let alive = true;
    const load = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = img.onerror = () => resolve();
        img.src = src;
      });
    void Promise.all([load(assets.gateClosed), load(assets.gateOpen)]).then(() => {
      if (alive) setPhase('idle');
    });
    return () => {
      alive = false;
    };
  }, []);

  // idle: the camera slowly breathes
  useEffect(() => {
    if (phase !== 'idle' || reduceMotion) return;
    const c = animate(breath, [1, 1.016, 1], { duration: 11, repeat: Infinity, ease: 'easeInOut' });
    return () => c.stop();
  }, [phase, reduceMotion, breath]);

  // stop everything on unmount
  useEffect(
    () => () => {
      controlsRef.current.forEach((c) => c.stop());
      controlsRef.current = [];
    },
    [],
  );

  const goToPaths = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    navigate('/paths', { replace: true });
  }, [navigate]);

  const skip = useCallback(() => {
    controlsRef.current.forEach((c) => c.stop());
    controlsRef.current = [];
    track(animate(fade, 1, { duration: 0.35, ease: 'easeIn', onComplete: goToPaths }));
  }, [fade, goToPaths]);

  const start = useCallback(() => {
    if (startedRef.current || phase !== 'idle') return;
    startedRef.current = true;
    if (reduceMotion) {
      goToPaths();
      return;
    }
    setPhase('opening');
    controlsRef.current.forEach((c) => c.stop());
    controlsRef.current = [];
    animate(breath, 1, { duration: 0.5 });

    // 0.0 – 3.0  camera dolly toward the doors
    track(animate(cam, 1.32, { duration: 3.0, ease: [0.45, 0, 0.25, 1] }));
    // 0.0 – 1.3  central seam and rune ignite
    track(animate(seam, 1, { duration: 1.5, delay: 0.1, ease: 'easeIn' }));
    // 0.9 – 2.7  the ground shakes
    track(
      animate(shakeX, [0, -5, 5, -4, 4, -2, 2, -1, 0], { duration: 1.8, delay: 0.9, ease: 'linear' }),
    );
    track(
      animate(shakeY, [0, 3, -3, 2, -2, 1, -1, 0, 0], { duration: 1.8, delay: 0.9, ease: 'linear' }),
    );
    // 1.3 – 3.7  doors swing inward
    track(animate(doorL, 84, { duration: 2.4, delay: 1.3, ease: DOOR_EASE }));
    track(animate(doorR, -84, { duration: 2.4, delay: 1.3, ease: DOOR_EASE }));
    // 1.4 – 3.2  light floods out of the gap, fog rolls across the floor
    track(animate(spill, 1, { duration: 1.9, delay: 1.35, ease: 'easeOut' }));
    track(animate(burst, [0, 1, 0.75], { duration: 2.4, delay: 1.4, ease: 'easeOut' }));
    track(animate(smokeBoost, [1, 2.4, 1.6], { duration: 2.6, delay: 1.3, ease: 'easeOut' }));
    // 3.1 – 4.0  hand over to the "open gate" plate under a bright flash
    track(animate(flash, [0, 0.6, 0], { duration: 1.0, delay: 3.1, ease: 'easeOut' }));
    track(animate(frameOpacity, 0, { duration: 0.9, delay: 3.2 }));
    track(animate(doorsOpacity, 0, { duration: 0.6, delay: 3.3 }));
    // 3.1 – 5.4  walk through the gate
    track(animate(cam, 3.1, { duration: 2.3, delay: 3.1, ease: [0.55, 0, 0.9, 0.7] }));
    // 4.5 – 5.5  into the dark
    track(animate(fade, 1, { duration: 1.0, delay: 4.5, ease: 'easeIn', onComplete: goToPaths }));
  }, [phase, reduceMotion, breath, cam, seam, shakeX, shakeY, doorL, doorR, spill, burst, smokeBoost, flash, frameOpacity, doorsOpacity, fade, goToPaths]);

  // keyboard: Enter/Space opens, Escape skips
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'idle' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        start();
      } else if (phase === 'opening' && e.key === 'Escape') {
        skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, start, skip]);

  const fill = 'absolute inset-0 h-full w-full select-none';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black" role="dialog" aria-label="ChallengeX gate entrance">
      <h1 className="sr-only">ChallengeX</h1>

      {/* clip paths for the frame cut-out and the two door leaves (objectBoundingBox = stage) */}
      <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
        <defs>
          <clipPath id="gx-frame" clipPathUnits="objectBoundingBox">
            <path d={FRAME_PATH} clipRule="evenodd" />
          </clipPath>
          <clipPath id="gx-door-l" clipPathUnits="objectBoundingBox">
            <polygon points={toPoints(grow(DOOR_LEFT, 1.012))} />
          </clipPath>
          <clipPath id="gx-door-r" clipPathUnits="objectBoundingBox">
            <polygon points={toPoints(grow(DOOR_RIGHT, 1.012))} />
          </clipPath>
        </defs>
      </svg>

      {/* shake wrapper */}
      <motion.div className="absolute inset-0" style={{ x: shakeX, y: shakeY }}>
        {/* 16:9 stage that always covers the viewport; overlays use stage fractions */}
        <motion.div
          className="absolute left-1/2 top-1/2"
          style={{
            width: 'max(100vw, calc(100vh * 16 / 9))',
            height: 'max(100vh, calc(100vw * 9 / 16))',
            x: '-50%',
            y: '-50%',
            scale: stageScale,
            originX: GATE_CENTER.x,
            originY: GATE_CENTER.y,
          }}
        >
          {/* 0 · open-gate plate (revealed behind the doors) */}
          <img src={assets.gateOpen} alt="" aria-hidden draggable={false} className={fill} />
          <motion.div className="absolute inset-0" style={{ opacity: openSwordsOpacity }}>
            {SWORDS_OPEN.map((s) => (
              <SwordGlow key={`o${s.seed}`} {...s} />
            ))}
          </motion.div>

          {/* 1 · light spilling out of the doorway */}
          <motion.div
            className="absolute inset-0"
            style={{
              opacity: spill,
              background: `radial-gradient(ellipse 20% 40% at ${GATE_CENTER.x * 100}% ${
                GATE_CENTER.y * 100
              }%, rgba(255,240,225,0.95) 0%, rgba(255,86,70,0.75) 34%, rgba(150,10,22,0.4) 64%, transparent 100%)`,
            }}
          />

          {/* 2 · left & right door leaves (closed plate, clipped, hinged at the outer edges) */}
          <motion.div
            className="absolute inset-0"
            style={{
              rotateY: doorL,
              originX: HINGE_L / STAGE_W,
              originY: 0.5,
              transformPerspective: 1500,
              opacity: doorsOpacity,
              filter: doorLShade,
            }}
          >
            <img
              src={assets.gateClosed}
              alt=""
              aria-hidden
              draggable={false}
              className={fill}
              style={{ clipPath: 'url(#gx-door-l)' }}
            />
          </motion.div>
          <motion.div
            className="absolute inset-0"
            style={{
              rotateY: doorR,
              originX: HINGE_R / STAGE_W,
              originY: 0.5,
              transformPerspective: 1500,
              opacity: doorsOpacity,
              filter: doorRShade,
            }}
          >
            <img
              src={assets.gateClosed}
              alt="The closed gates of the ChallengeX citadel"
              draggable={false}
              className={fill}
              style={{ clipPath: 'url(#gx-door-r)' }}
            />
          </motion.div>

          {/* 3 · the frame: closed plate with the doorway cut out */}
          <motion.div className="absolute inset-0" style={{ opacity: frameOpacity }}>
            <img
              src={assets.gateClosed}
              alt=""
              aria-hidden
              draggable={false}
              className={fill}
              style={{ clipPath: 'url(#gx-frame)' }}
            />
            {SWORDS_CLOSED.map((s) => (
              <SwordGlow key={`c${s.seed}`} {...s} />
            ))}
          </motion.div>

          {/* 4 · seam beam + rune star ignite before the doors move */}
          <motion.div
            className="pointer-events-none absolute"
            style={{
              left: pctX(SEAM_X - 3),
              top: pctY(285),
              width: `${(6 / STAGE_W) * 100}%`,
              height: `${((765 - 285) / STAGE_H) * 100}%`,
              scaleX: seamScaleX,
              opacity: seamOpacity,
              mixBlendMode: 'screen',
              background: 'linear-gradient(to bottom, transparent, #fff 18%, #ff5a66 55%, transparent)',
              filter: 'blur(3px)',
            }}
          >
            <motion.div
              className="h-full w-full"
              animate={{ opacity: [0.55, 1, 0.65, 0.95, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ background: 'inherit' }}
            />
          </motion.div>
          <motion.div
            className="pointer-events-none absolute"
            style={{
              left: pctX(SEAM_X - 90),
              top: pctY(520 - 90),
              width: `${(180 / STAGE_W) * 100}%`,
              height: `${(180 / STAGE_H) * 100}%`,
              scale: runeScale,
              opacity: runeOpacity,
              mixBlendMode: 'screen',
              background:
                'radial-gradient(circle, rgba(255,210,200,0.95) 0%, rgba(255,60,70,0.55) 28%, transparent 68%)',
              filter: 'blur(4px)',
            }}
          >
            <motion.div
              className="h-full w-full"
              style={{ background: 'inherit' }}
              animate={{ opacity: [0.55, 1, 0.6, 0.9], scale: [0.92, 1.1, 0.96, 1.06] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* 5 · floor fog rolling out of the doorway */}
          <motion.div
            className="pointer-events-none absolute inset-x-0"
            style={{
              top: pctY(600),
              height: `${(300 / STAGE_H) * 100}%`,
              opacity: burst,
              mixBlendMode: 'screen',
              background: `radial-gradient(ellipse 36% 60% at ${GATE_CENTER.x * 100}% 70%, rgba(255,150,140,0.85), rgba(190,30,40,0.45) 45%, transparent 75%)`,
              filter: 'blur(14px)',
            }}
          />

          {/* 6 · living fire on the braziers */}
          <Flames />
        </motion.div>
      </motion.div>

      {/* embers + smoke sit above the camera so they never zoom with the art */}
      <Embers count={26} />
      <Smoke boost={smokeBoost} intensity={1.15} heightClass="h-[62%]" />

      {/* flash on the hand-over, fade-to-dark on exit */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: flash,
          background: 'radial-gradient(circle at 53% 58%, #fff, #ff7a82 40%, transparent 85%)',
          mixBlendMode: 'screen',
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 bg-black"
        style={{
          opacity: fade,
          backgroundImage: 'radial-gradient(circle at 53% 58%, #3a0509 0%, #000 70%)',
        }}
      />

      {/* vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)' }}
        aria-hidden
      />

      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div
            key="loading"
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black"
            role="status"
          >
            <motion.p
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="font-heading text-xs uppercase tracking-[0.4em] text-parchment-dim"
            >
              The gate stirs…
            </motion.p>
          </motion.div>
        )}

        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="absolute inset-0 flex flex-col items-center justify-end gap-6 bg-gradient-to-t from-black/85 via-black/15 to-transparent pb-14 sm:pb-20"
          >
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.9 }}
              className="max-w-md px-6 text-center font-narrative text-lg italic text-parchment-dim sm:text-xl"
            >
              The realm awaits. Steel yourself, and cross the threshold.
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.9 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={start}
              className="gothic-btn-primary px-10 py-4 text-base shadow-crimson-md hover:shadow-crimson-lg"
            >
              Enter the Realm
            </motion.button>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 1.6 }}
              className="hidden font-heading text-[10px] uppercase tracking-[0.35em] text-parchment-faint sm:block"
            >
              Press Enter
            </motion.p>
          </motion.div>
        )}

        {phase === 'opening' && (
          <motion.div
            key="opening"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 0.8 } }}
            className="absolute bottom-8 right-8"
          >
            <button
              onClick={skip}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-black/50 px-4 py-2 text-xs font-heading uppercase tracking-widest text-parchment-dim transition-colors hover:border-[var(--border-visible)] hover:text-parchment"
            >
              <SkipForward className="h-3.5 w-3.5" aria-hidden />
              Skip
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {reduceMotion && phase === 'idle' && (
        <button
          onClick={goToPaths}
          className="absolute bottom-8 right-8 rounded-full border border-[var(--border-subtle)] bg-black/50 px-4 py-2 text-xs font-heading uppercase tracking-widest text-parchment-dim hover:text-parchment"
        >
          Skip to Paths
        </button>
      )}
    </div>
  );
}

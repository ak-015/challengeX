import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { motion, AnimatePresence } from 'framer-motion';
import { SkipForward } from 'lucide-react';
import { assets } from '@/utils/assets';
import { Embers, Fog } from '@/components/animations/Atmosphere';

type Phase = 'idle' | 'opening' | 'done';

/**
 * Cinematic closed→open gate sequence. The gate images are flattened static
 * compositions, so the "opening" is a layered illusion: camera push-in,
 * a vertical energy beam wipe, spark burst, then a crossfade to the open-gate
 * artwork. GSAP drives the coordinated timeline; Framer Motion handles the UI.
 * Honours prefers-reduced-motion by skipping straight to /paths.
 */
export function GateExperience() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const rootRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef<HTMLImageElement>(null);
  const openRef = useRef<HTMLImageElement>(null);
  const beamRef = useRef<HTMLDivElement>(null);
  const runeRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const navigatedRef = useRef(false);

  const goToPaths = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    setPhase('done');
    gsap.killTweensOf('*');
    navigate('/paths', { replace: true });
  }, [navigate]);

  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const startSequence = useCallback(() => {
    if (phase !== 'idle' || navigatedRef.current) return;
    if (reduceMotion) {
      goToPaths();
      return;
    }
    setPhase('opening');

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: goToPaths });
      // 1-2. slow camera push-in
      tl.fromTo(
        closedRef.current,
        { scale: 1, filter: 'brightness(0.85)' },
        { scale: 1.18, filter: 'brightness(1.1)', duration: 2.4, ease: 'power2.inOut' },
        0,
      );
      // 3-4. illuminate + draw central rune
      tl.fromTo(
        runeRef.current,
        { opacity: 0, scale: 0.6, rotate: -90 },
        { opacity: 1, scale: 1, rotate: 0, duration: 1.4, ease: 'power3.out' },
        0.8,
      );
      // 5. crimson light surge
      tl.to(glowRef.current, { opacity: 0.85, duration: 1.2, ease: 'power2.in' }, 1.6);
      // 6. vertical energy beam
      tl.fromTo(
        beamRef.current,
        { scaleY: 0, opacity: 0 },
        { scaleY: 1, opacity: 1, duration: 0.9, ease: 'power4.out' },
        2.4,
      );
      tl.to(beamRef.current, { scaleX: 26, opacity: 0.25, duration: 0.8, ease: 'power2.in' }, 3.3);
      // 7-10. reveal open gate (layered illusion, crossfade + continued push)
      tl.to(closedRef.current, { opacity: 0, duration: 0.9, ease: 'power2.inOut' }, 3.5);
      tl.fromTo(
        openRef.current,
        { opacity: 0, scale: 1.18 },
        { opacity: 1, scale: 1.02, duration: 1.6, ease: 'power2.out' },
        3.6,
      );
      // 11. navigate handled in onComplete
      tl.to({}, { duration: 0.6 }, 5.0);
    }, rootRef);

    return () => ctx.revert();
  }, [phase, reduceMotion, goToPaths]);

  useEffect(() => () => gsap.killTweensOf('*'), []);


  // Keyboard: Enter/Space starts, Escape skips
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'idle' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startSequence();
      }
      if (phase === 'opening' && e.key === 'Escape') {
        goToPaths();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, startSequence, goToPaths]);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 overflow-hidden bg-black"
      role="dialog"
      aria-label="ChallengeX gate entrance"
    >
      <img
        ref={closedRef}
        src={assets.gateClosed}
        alt="The closed gates of the ChallengeX citadel"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <img
        ref={openRef}
        src={assets.gateOpen}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover opacity-0"
        draggable={false}
      />

      <div
        ref={glowRef}
        className="absolute inset-0 opacity-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(229,9,32,0.35), transparent 70%)' }}
        aria-hidden
      />

      <div
        ref={runeRef}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 pointer-events-none"
        aria-hidden
      >
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle cx="80" cy="80" r="70" fill="none" stroke="#ff2638" strokeWidth="2" opacity="0.9" />
          <circle cx="80" cy="80" r="50" fill="none" stroke="#e50920" strokeWidth="1" strokeDasharray="6 8" />
          <polygon points="80,18 96,64 142,64 104,92 120,138 80,110 40,138 56,92 18,64 64,64" fill="none" stroke="#ff2638" strokeWidth="1.5" />
          <circle cx="80" cy="80" r="8" fill="#ff2638" />
        </svg>
      </div>

      <div
        ref={beamRef}
        className="absolute left-1/2 top-0 h-full w-1 -translate-x-1/2 origin-center opacity-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, #fff, #ff2638, transparent)',
          boxShadow: '0 0 24px 6px rgba(255,38,56,0.8)',
        }}
        aria-hidden
      />

      <Embers count={24} />
      <Fog />

      <AnimatePresence>
        {phase === 'idle' && (
          <motion.div
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-end pb-16 sm:pb-24 gap-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-center px-6"
            >
              <h1 className="font-display text-3xl sm:text-5xl text-parchment tracking-widest drop-shadow-[0_0_18px_rgba(229,9,32,0.7)]">
                CHALLENGEX
              </h1>
              <p className="mt-3 font-narrative text-lg text-parchment-dim italic max-w-md">
                The realm awaits. Steel yourself, and cross the threshold.
              </p>
            </motion.div>
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              onClick={startSequence}
              className="gothic-btn-primary text-base px-10 py-4 shadow-crimson-md hover:shadow-crimson-lg"
            >
              Enter the Realm
            </motion.button>
          </motion.div>
        )}

        {phase === 'opening' && (
          <motion.div initial={{ opacity: 1 }} className="absolute bottom-8 right-8">
            <button
              onClick={goToPaths}
              className="inline-flex items-center gap-2 rounded-full bg-black/50 border border-[var(--border-subtle)] px-4 py-2 text-xs font-heading uppercase tracking-widest text-parchment-dim hover:text-parchment hover:border-[var(--border-visible)] transition-colors"
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
          className="absolute bottom-8 right-8 rounded-full bg-black/50 border border-[var(--border-subtle)] px-4 py-2 text-xs font-heading uppercase tracking-widest text-parchment-dim hover:text-parchment"
        >
          Skip to Paths
        </button>
      )}
    </div>
  );
}

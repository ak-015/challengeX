import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { Embers } from '@/components/scenes/Embers';
import { Heading } from '@/components/ui/Heading';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useReducedMotion } from '@/hooks/useMedia';
import { cn } from '@/lib/cn';
import { useFx } from '@/store/sceneFxStore';

interface CardDef {
  id: string;
  title: string;
  icon: IconName;
  to: string;
  intro?: boolean;
}

const CARDS: CardDef[] = [
  { id: 'challenge', title: 'Challenge\nMy Idea', icon: 'swords', to: '/altar', intro: true },
  { id: 'ideas', title: 'Generate\na New Idea', icon: 'bulb', to: '/ideas' },
  { id: 'roadmap', title: 'Get\nRoadmap', icon: 'map', to: '/roadmap' },
  { id: 'history', title: 'Load\nPrevious Trials', icon: 'scroll', to: '/history' },
];

/** Rising sparks above each pedestal: drift, stagger, duration and height vary per particle. */
const SPARKS = [
  { dx: -20, d: 0, dur: 3.6, rise: 104 },
  { dx: 14, d: 0.9, dur: 4.2, rise: 118 },
  { dx: -8, d: 1.7, dur: 3.2, rise: 96 },
  { dx: 22, d: 2.4, dur: 4.6, rise: 112 },
  { dx: -16, d: 3.1, dur: 3.9, rise: 100 },
];

/** Three glyph rings per pedestal (width %, bottom offset, floor squash, spin seconds, reversed). */
function ringDefs(i: number): { width: string; bottom: number; sq: number; dur: number; rev: boolean }[] {
  return [
    { width: '96%', bottom: -6, sq: 0.26, dur: 24 + i * 3, rev: false },
    { width: '74%', bottom: -16, sq: 0.34, dur: 34 + i * 4, rev: true },
    { width: '56%', bottom: 16, sq: 0.4, dur: 28 + i * 2, rev: false },
  ];
}

/**
 * Glowing summoning platform beneath a card: stone disc, wet-floor reflection, vertical light
 * beam (rising behind the card), orbiting glyph rings at three speeds, and rising sparks.
 * Purely decorative (aria-hidden); all motion is transform/opacity and honours --pd ignition delay.
 */
function Pedestal({ i, hot }: { i: number; hot: boolean }) {
  const pd = 1.05 + i * 0.16;
  return (
    <div aria-hidden="true" className={cn('realm-ped', hot && 'realm-ped-hot')} style={{ '--pd': `${pd}s` } as CSSProperties}>
      <div className="realm-beam" />
      <div className="realm-beam realm-beam-core" />
      <div className="realm-sparks">
        {SPARKS.map((s, k) => (
          <span
            key={k}
            className="realm-spark"
            style={{ '--dx': `${s.dx}px`, '--rise': `-${s.rise}px`, '--sd': `${pd + 0.4 + s.d}s`, '--dur': `${s.dur}s` } as CSSProperties}
          />
        ))}
      </div>
      {ringDefs(i).map((r, k) => (
        <div
          key={k}
          className="realm-ring"
          style={{ width: r.width, bottom: r.bottom, transform: `scaleY(${r.sq})`, ['--spin' as string]: `${r.dur}s` } as CSSProperties}
        >
          <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true" focusable="false">
            <g className={cn('realm-spin', r.rev && 'realm-spin-rev')}>
              <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="7 11" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.8" opacity=".65" />
            </g>
          </svg>
        </div>
      ))}
      <div className="realm-disc" />
      <div className="realm-refl" />
    </div>
  );
}

/**
 * Paths (the Realm): the cinematic hub. A full-bleed castle/ritual environment
 * (public/assets/challengex-ground-background.webp via the shell's ground layer + the tilted
 * floor magic circle) with four floating gothic cards, each risen from its own summoning
 * pedestal. Routes and entrance state are unchanged: Challenge My Idea still opens the Altar
 * intro, and the flare/smoke scene effects still fire on choice.
 */
export function Component() {
  useDocumentTitle('Choose Your Path');
  const navigate = useNavigate();
  const location = useLocation();
  const reduced = useReducedMotion();
  const fromGate = (location.state as { fromGate?: boolean } | null)?.fromGate === true;

  const [active, setActive] = useState<string | null>(null);
  const [surge, setSurge] = useState<string | null>(null);
  const leaving = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  // Keep the shared altar scene fully lit while browsing Paths; clear the pending navigation on unmount.
  useEffect(() => {
    useFx.getState().setAltarPhase('done');
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const choose = (c: CardDef) => {
    if (leaving.current) return; // guard against double navigation
    leaving.current = true;
    setSurge(c.id);
    useFx.getState().flare();
    if (c.intro) useFx.getState().setAltarPhase('idle'); // the dais is hidden while the scene crossfades
    timer.current = window.setTimeout(() => navigate(c.to, { state: c.intro ? { intro: true } : undefined }), reduced ? 80 : 520);
  };

  // Cinematic timeline: Phase B pedestals (1.05s + stagger) -> Phase C heading -> card summoning L->R.
  const head = fromGate ? 1.7 : 1.35;
  const base = fromGate ? 1.95 : 1.6;
  const step = 0.14;

  return (
    <div className="relative flex min-h-[calc(100dvh-56px)] w-full flex-col items-center justify-center overflow-hidden px-4 py-12 sm:px-8">
      {/* Phase A — the environment fades up from near-black (covers the backdrop AND the
          atmosphere layers below z-1, but never the content or the top bar). */}
      <div aria-hidden="true" className="realm-veil pointer-events-none fixed inset-0 z-[1] bg-black" />

      {/* Atmosphere: embers, drifting floor fog and the Phase B crimson sweep. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <Embers density={0.7} />
        <div className="realm-fog" style={{ bottom: 0, height: '30vh' }} />
        <div className="realm-fog realm-fog-b" style={{ bottom: '8vh', height: '22vh' }} />
        <div className="realm-sweep" />
      </div>

      {/* Page heading (fades in before the cards) */}
      <m.div
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: head, duration: 0.7, ease: 'easeOut' }}
        className="relative z-10 mb-10 w-full max-w-2xl text-center sm:mb-14"
      >
        <div
          aria-hidden="true"
          className="absolute -inset-x-14 -inset-y-10 -z-10"
          style={{ background: 'radial-gradient(60% 65% at 50% 50%, rgba(7,5,6,0.78), transparent 75%)' }}
        />
        <p className="eyebrow mb-2">Paths</p>
        <Heading level={1} className="text-4xl sm:text-5xl lg:text-6xl">
          Choose Your Path
        </Heading>
        <div className="rune-divider mt-4" aria-hidden="true">
          <span />
        </div>
        <p className="mt-4 font-prose text-lg text-ash-dim sm:text-xl">Four ways to turn your ideas into real opportunities.</p>
      </m.div>

      {/* The four floating gothic cards, each risen from its summoning pedestal */}
      <ul className="relative z-10 grid w-full max-w-[1152px] grid-cols-1 gap-y-16 xs:grid-cols-2 sm:gap-x-8 lg:grid-cols-4 lg:gap-x-8">
        {CARDS.map((c, i) => (
          <m.li
            key={c.id}
            initial={reduced ? false : { opacity: 0, y: 36, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: base + i * step, duration: 0.6, ease: 'easeOut' }}
            className={cn('relative flex flex-col items-center', !reduced && 'gentle-float')}
            style={{ animationDelay: `${3.2 + i * 0.9}s` }}
          >
            <div className="relative z-10 w-full">
              <div aria-hidden="true" className={cn('realm-glow', active === c.id && 'realm-glow-on')} />
              <button
                type="button"
                onMouseEnter={() => setActive(c.id)}
                onMouseLeave={() => setActive((a) => (a === c.id ? null : a))}
                onFocus={() => setActive(c.id)}
                onBlur={() => setActive((a) => (a === c.id ? null : a))}
                onTouchStart={() => setActive(c.id)}
                onClick={() => choose(c)}
                data-active={active === c.id}
                data-selected={surge === c.id}
                className="group realm-card relative flex min-h-[300px] w-full cursor-pointer flex-col items-center justify-center gap-5 px-5 pb-12 pt-12 text-center sm:min-h-[340px] sm:px-7 lg:min-h-[400px]"
              >
                <span aria-hidden="true" className="realm-gem left-4 top-4" />
                <span aria-hidden="true" className="realm-gem right-4 top-4" />
                <span aria-hidden="true" className="realm-gem bottom-5 left-4" />
                <span aria-hidden="true" className="realm-gem bottom-5 right-4" />

                <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[rgba(229,9,32,0.6)] bg-[rgba(20,6,8,0.8)] text-crimson-text transition-colors duration-200 group-hover:border-crimson group-hover:bg-[rgba(142,24,36,0.45)] group-hover:text-[#ff8a91] group-focus-visible:border-crimson">
                  <Icon name={c.icon} size={30} />
                </span>
                <span className="block whitespace-pre-line font-display text-lg font-semibold uppercase leading-snug tracking-[0.08em] text-ash sm:text-xl">
                  {c.title}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(229,9,32,0.55)] bg-[rgba(7,5,6,0.6)] text-crimson-text transition-all duration-200 group-hover:translate-x-0.5 group-hover:border-crimson group-hover:bg-[rgba(142,24,36,0.5)] group-hover:shadow-glow"
                >
                  <Icon name="chevronRight" size={16} />
                </span>
              </button>
            </div>
            <Pedestal i={i} hot={active === c.id} />
          </m.li>
        ))}
      </ul>
    </div>
  );
}

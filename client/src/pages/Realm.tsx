import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useReducedMotion } from '@/hooks/useMedia';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/authStore';
import { useFx } from '@/store/sceneFxStore';

interface CardDef {
  id: string;
  title: string;
  text: string;
  icon: IconName;
  to: string;
  intro?: boolean;
}

const CARDS: CardDef[] = [
  { id: 'challenge', title: 'Challenge My Idea', text: 'Let the Challenger try to break it.', icon: 'sword', to: '/altar', intro: true },
  { id: 'ideas', title: 'Generate a New Idea', text: 'Awaken the mind. Spark something new.', icon: 'bulb', to: '/ideas' },
  { id: 'roadmap', title: 'Get Roadmap', text: 'Turn a surviving idea into reality.', icon: 'map', to: '/roadmap' },
  { id: 'history', title: 'Load Previous Chats', text: 'Return to your past trials.', icon: 'scroll', to: '/history' },
];

interface Beam {
  id: string;
  x: number;
  y: number;
  len: number;
  angle: number;
}

export function Component() {
  useDocumentTitle('Choose Your Path');
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuth((s) => s.user);
  const reduced = useReducedMotion();
  const fromGate = (location.state as { fromGate?: boolean } | null)?.fromGate === true;

  const wrap = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});
  const [beams, setBeams] = useState<Beam[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [surge, setSurge] = useState<string | null>(null);
  const leaving = useRef(false);

  // Beams: from the circle's centre to the centre of each card (transform + opacity only).
  const measure = useCallback(() => {
    const w = wrap.current;
    const mc = document.querySelector('[data-mc]');
    if (!w || !mc) return;
    const wr = w.getBoundingClientRect();
    const mr = mc.getBoundingClientRect();
    const cx = mr.left + mr.width / 2 - wr.left;
    const cy = mr.top + mr.height / 2 - wr.top;
    const next: Beam[] = [];
    for (const c of CARDS) {
      const el = cardRefs.current[c.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const tx = r.left + r.width / 2 - wr.left;
      const ty = r.top + r.height / 2 - wr.top;
      next.push({ id: c.id, x: cx, y: cy, len: Math.hypot(tx - cx, ty - cy), angle: (Math.atan2(ty - cy, tx - cx) * 180) / Math.PI });
    }
    setBeams(next);
  }, []);

  useLayoutEffect(() => {
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    schedule();
    const t = setTimeout(schedule, 700); // after the entrance animation settles
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule);
    };
  }, [measure]);

  useEffect(() => {
    useFx.getState().setAltarPhase('done');
  }, []);

  const choose = (c: CardDef) => {
    if (leaving.current) return;
    leaving.current = true;
    setSurge(c.id);
    useFx.getState().flare();
    if (c.intro) useFx.getState().setAltarPhase('idle'); // the dais is hidden while the scene crossfades
    window.setTimeout(() => navigate(c.to, { state: c.intro ? { intro: true } : undefined }), reduced ? 80 : 520);
  };

  const base = fromGate ? 0.35 : 0.05;
  const step = fromGate ? 0.15 : 0.06;

  return (
    <div ref={wrap} className="safe-pad relative mx-auto flex min-h-[calc(100dvh-56px)] max-w-4xl flex-col items-center justify-center py-6">
      {/* beams (below the cards) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        {beams.map((b) => (
          <div key={b.id} className={cn(active === b.id && 'beam-on')}>
            <div className="beam beam-glow" style={{ left: b.x, top: b.y, width: b.len, transform: `rotate(${b.angle}deg)` }} />
            <div
              className={cn('beam beam-core', surge === b.id && 'beam-surge')}
              style={{ left: b.x, top: b.y, width: b.len, transform: `rotate(${b.angle}deg)`, ['--bt' as string]: `rotate(${b.angle}deg)`, opacity: surge === b.id ? 1 : undefined }}
            />
          </div>
        ))}
      </div>

      <div className="relative z-10 mb-6 text-center sm:mb-10">
        <Heading level={1}>Choose Your Path</Heading>
        <p className="mt-2 font-label text-sm tracking-wide text-ash sm:text-base">Welcome back, {user?.displayName ?? 'traveller'}</p>
      </div>

      <ul className="relative z-10 grid w-full grid-cols-1 gap-4 xs:grid-cols-2 xs:gap-x-8 xs:gap-y-8 sm:gap-x-24 sm:gap-y-16">
        {CARDS.map((c, i) => (
          <m.li
            key={c.id}
            initial={{ opacity: 0, y: 26, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: base + i * step, duration: 0.55, ease: 'easeOut' }}
          >
            <GlassPanel
              as="button"
              interactive
              type="button"
              ref={(el: HTMLElement | null) => {
                cardRefs.current[c.id] = el;
              }}
              onMouseEnter={() => setActive(c.id)}
              onMouseLeave={() => setActive((a) => (a === c.id ? null : a))}
              onFocus={() => setActive(c.id)}
              onBlur={() => setActive((a) => (a === c.id ? null : a))}
              onTouchStart={() => setActive(c.id)}
              onClick={() => choose(c)}
              className="group flex min-h-[96px] w-full cursor-pointer items-center gap-4 p-4 text-left transition-transform duration-200 hover:-translate-y-1.5 focus-visible:-translate-y-1.5 active:-translate-y-1.5 sm:min-h-[132px] sm:flex-col sm:justify-center sm:gap-3 sm:p-6 sm:text-center"
            >
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-crimson bg-[rgba(122,10,18,0.35)] text-crimson-text">
                <Icon name={c.icon} size={30} />
              </span>
              <span className="block">
                <span className="block font-label text-lg font-bold tracking-wide text-ash sm:text-xl">{c.title}</span>
                <span className="mt-1 block font-prose text-sm text-ash-dim sm:text-base">{c.text}</span>
              </span>
            </GlassPanel>
          </m.li>
        ))}
      </ul>
    </div>
  );
}

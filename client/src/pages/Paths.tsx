import { useEffect, useMemo, useState } from 'react';
import { Swords, Lightbulb, Map, History } from 'lucide-react';
import { PathCard } from '@/components/cards/PathCard';
import { RitualBeams } from '@/components/paths/RitualBeams';

const PATHS = [
  {
    to: '/challenge/new',
    icon: Swords,
    title: 'Challenge My Idea',
    description: 'Submit your idea to a merciless interrogation and receive a scored verdict.',
  },
  {
    to: '/ideas/generate',
    icon: Lightbulb,
    title: 'Generate a New Idea',
    description: 'Feed the forge your interests and constraints; receive fresh, tailored concepts.',
  },
  {
    to: '/roadmaps/new',
    icon: Map,
    title: 'Get Roadmap',
    description: 'Turn a surviving idea into a phased plan with milestones and deliverables.',
  },
  {
    to: '/history',
    icon: History,
    title: 'Load Previous Trials',
    description: 'Return to your past verdicts, roadmaps and generated ideas.',
  },
];

/* The ritual-chamber artwork (1672×941) is laid out full-screen with `cover` + centre crop —
   the same transform the live scene uses — so we can find the glowing core of the floor
   circle on screen and fire the beams from exactly there. */
const ART_W = 1672;
const ART_H = 941;
const CIRCLE_CORE = { x: 835, y: 690 }; // centre of the concentric rings on the floor
const HEADER_H = 64;
const FRAME_ASPECT = 3 / 4;

function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.visualViewport?.height ?? window.innerHeight });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp(read());
    window.addEventListener('resize', on);
    window.visualViewport?.addEventListener('resize', on);
    return () => {
      window.removeEventListener('resize', on);
      window.visualViewport?.removeEventListener('resize', on);
    };
  }, []);
  return vp;
}

function computeLayout(w: number, h: number) {
  const s = Math.max(w / ART_W, h / ART_H);
  const ox = (w - ART_W * s) / 2;
  const oy = (h - ART_H * s) / 2;
  const origin = { x: ox + CIRCLE_CORE.x * s, y: oy + CIRCLE_CORE.y * s };

  const headBottom = HEADER_H + 112; // title + subtitle block
  const gap = Math.max(44, h * 0.085); // air between card base and the circle — room for the beams to rise
  const availH = origin.y - gap - (headBottom + 18);
  const cardH = Math.max(210, Math.min(availH, h * 0.5, (w * 0.21) / FRAME_ASPECT));
  const cardW = cardH * FRAME_ASPECT;
  const bottom = origin.y - gap;
  const top = bottom - cardH;
  // four equal columns across the FULL width of the screen
  const centers = [0.125, 0.375, 0.625, 0.875].map((f) => w * f);
  return { origin, cardW, cardH, top, centers, fontSize: cardW / 17 };
}

export function PathsPage() {
  const { w, h } = useViewport();
  // Desktop: everything fits on one screen (no scroll). Smaller / shorter screens: stacked grid.
  const desktop = w >= 1024 && h >= 560;
  const L = useMemo(() => computeLayout(w, h), [w, h]);

  const heading = (
    <header className="text-center">
      <h1 className="font-display text-3xl sm:text-5xl tracking-wide text-parchment drop-shadow-[0_0_18px_rgba(229,9,32,0.55)]">Choose Your Path</h1>
      <p className="mt-3 font-narrative text-lg sm:text-xl text-parchment-dim italic">Four trials await. Which road do you walk?</p>
    </header>
  );

  if (!desktop) {
    return (
      <div className="relative w-full px-4 sm:px-8 pt-8 pb-14">
        {heading}
        <div className="mx-auto mt-8 grid w-full max-w-3xl grid-cols-1 sm:grid-cols-2 gap-5">
          {PATHS.map((p, i) => (
            <div key={p.to} className="mx-auto w-full max-w-[19rem]">
              <PathCard {...p} index={i} fontSize="clamp(13px, 4vw, 16px)" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const targets = L.centers.map((cx) => ({ x: cx, y: L.top + L.cardH * 0.955 }));

  return (
    <div className="relative h-full w-full overflow-hidden">
      <RitualBeams origin={L.origin} targets={targets} />
      <div className="relative z-10 pt-4">{heading}</div>
      {PATHS.map((p, i) => (
        <div
          key={p.to}
          className="absolute z-10"
          style={{ left: L.centers[i] - L.cardW / 2, top: L.top - HEADER_H, width: L.cardW, height: L.cardH }}
        >
          <PathCard {...p} index={i} fontSize={L.fontSize} />
        </div>
      ))}
    </div>
  );
}

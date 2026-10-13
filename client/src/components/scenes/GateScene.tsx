import { cn } from '@/lib/cn';
import { RuneRing, TickRing } from '@/components/art/runes';
import { ArtDefs, Banner, Bridge, Brazier, Castle, Chain, Cobbles, FogBand, Moon, rng, ridgePath, SigilArt, Statue, Waterfall } from './art';
import { SceneStage } from './SceneStage';

export type GateLayout = 'landscape' | 'portrait';

export const GATE_LAYOUT = {
  landscape: { W: 1600, H: 900, tx: 400, ty: 0 },
  portrait: { W: 1000, H: 1500, tx: 100, ty: 330 },
} as const;

/** The door rectangle in tower-local coordinates. */
const DOOR = { x: 255, y: 205, w: 290, h: 495 };

export function doorRectPct(layout: GateLayout) {
  const L = GATE_LAYOUT[layout];
  return {
    left: `${((L.tx + DOOR.x) / L.W) * 100}%`,
    top: `${((L.ty + DOOR.y) / L.H) * 100}%`,
    width: `${(DOOR.w / L.W) * 100}%`,
    height: `${(DOOR.h / L.H) * 100}%`,
  };
}

// ------------------------------------------------------------------ tower (local coordinates 0..800 x 0..900)
function TowerArt() {
  const keep = 'M150 900 V120 H200 V90 H260 V120 H340 V60 H460 V120 H540 V90 H600 V120 H650 V900Z';
  const left = 'M10 900 V270 L30 235 H175 L195 270 V900Z';
  const right = 'M605 900 V270 L625 235 H770 L790 270 V900Z';
  const cracks = rng(11);
  return (
    <g>
      {[left, right].map((d, i) => (
        <g key={i}>
          <path d={d} fill="url(#stone)" />
          <path d={d} fill="url(#blocks)" />
          <path d={d} fill="#000" filter="url(#noise)" opacity=".55" />
        </g>
      ))}
      <path d={keep} fill="url(#stone)" />
      <path d={keep} fill="url(#blocks)" />
      <path d={keep} fill="#000" filter="url(#noise)" opacity=".6" />
      <g stroke="#050202" strokeWidth="1.6" fill="none" opacity=".8">
        {Array.from({ length: 9 }, (_, i) => {
          const x = 170 + cracks() * 460;
          const y = 160 + cracks() * 500;
          return <path key={i} d={`M${x} ${y} l${(cracks() - 0.5) * 30} ${20 + cracks() * 24} l${(cracks() - 0.5) * 24} ${16 + cracks() * 20}`} />;
        })}
      </g>
      {/* glowing slits */}
      <g fill="#ff2f3f">
        {[[318, 270], [470, 270], [60, 400], [725, 400], [320, 520], [470, 520]].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="8" height="40" rx="3" className="win" style={{ animationDelay: `${i * 0.6}s` }} />
        ))}
      </g>
      {/* archivolt + opening */}
      <path d="M238 705 V335 Q238 172 400 128 Q562 172 562 335 V705" fill="none" stroke="#1f1816" strokeWidth="40" />
      <path d="M238 705 V335 Q238 172 400 128 Q562 172 562 335 V705" fill="none" stroke="#5a4742" strokeWidth="2.5" />
      <path d="M255 700 V335 Q255 192 400 150 Q545 192 545 335 V700Z" fill="#0a0304" />
      {/* red edge glow of the arch */}
      <path d="M255 700 V335 Q255 192 400 150 Q545 192 545 335 V700" fill="none" stroke="#ff2a3a" strokeWidth="2" opacity=".55" />
      {/* dragon-skull keystone */}
      <g transform="translate(400 112)">
        <path d="M-44 -6 Q-82 -42 -100 -92 Q-60 -70 -34 -34Z" fill="#14100f" stroke="#3a2c29" strokeWidth="1.5" />
        <path d="M44 -6 Q82 -42 100 -92 Q60 -70 34 -34Z" fill="#14100f" stroke="#3a2c29" strokeWidth="1.5" />
        <path d="M-46 -20 Q0 -62 46 -20 L56 8 Q44 32 22 38 L0 62 L-22 38 Q-44 32 -56 8 Z" fill="#1a1413" stroke="#4a3a36" strokeWidth="2" />
        <path d="M-6 30 L0 50 L6 30" fill="none" stroke="#050202" strokeWidth="3" />
        <g className="eye-pulse">
          <ellipse cx="-22" cy="2" rx="13" ry="6" fill="#ff2f3f" transform="rotate(14 -22 2)" />
          <ellipse cx="22" cy="2" rx="13" ry="6" fill="#ff2f3f" transform="rotate(-14 22 2)" />
          <circle cx="-22" cy="2" r="20" fill="url(#glow-red)" />
          <circle cx="22" cy="2" r="20" fill="url(#glow-red)" />
        </g>
      </g>
      {/* banners on the tower faces */}
      <Banner x={205} y={140} w={52} h={150} delay={0.2} />
      <Banner x={595} y={140} w={52} h={150} delay={1.1} />
      <Banner x={95} y={260} w={46} h={130} delay={0.6} />
      <Banner x={705} y={260} w={46} h={130} delay={1.6} />
      {/* steps */}
      <path d="M200 700 H600 V716 H200Z" fill="#1c1514" stroke="#3a2c29" />
      <path d="M185 716 H615 V732 H185Z" fill="#171110" stroke="#33262a" />
      <path d="M170 732 H630 V750 H170Z" fill="#120d0d" stroke="#2c2022" />
      {/* statues on pedestals */}
      <rect x="180" y="672" width="104" height="30" fill="url(#stone)" stroke="#2a1a18" />
      <rect x="516" y="672" width="104" height="30" fill="url(#stone)" stroke="#2a1a18" />
      <Statue x={232} y={672} s={1.12} />
      <Statue x={568} y={672} s={1.12} />
    </g>
  );
}

// ------------------------------------------------------------------ whole static gate scene
export function GateArt({ layout }: { layout: GateLayout }) {
  const L = GATE_LAYOUT[layout];
  const ls = layout === 'landscape';
  const { W, H } = L;
  const floorY = ls ? 765 : 1265;
  const vx = W / 2;
  return (
    <svg className="art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <rect width={W} height={H} fill="url(#sky)" />
      <g fill="#1a0306" opacity=".55">
        <ellipse cx={W * 0.3} cy={ls ? 90 : 130} rx={W * 0.25} ry={ls ? 40 : 55} />
        <ellipse cx={W * 0.75} cy={ls ? 150 : 250} rx={W * 0.22} ry={ls ? 34 : 50} />
        <ellipse cx={W * 0.5} cy={ls ? 30 : 60} rx={W * 0.3} ry={ls ? 30 : 40} />
      </g>
      <Moon cx={ls ? 1340 : 790} cy={ls ? 175 : 190} r={ls ? 105 : 80} />

      {/* far castles, bridges and cliffs */}
      <Castle x={ls ? 40 : 10} y={ls ? 470 : 760} s={ls ? 1.35 : 1.0} seed={4} towers={8} />
      <Castle x={ls ? 1230 : 700} y={ls ? 470 : 740} s={ls ? 1.2 : 0.95} seed={9} towers={8} />
      <Bridge x={ls ? 1180 : 600} y={ls ? 400 : 700} w={ls ? 360 : 400} arches={5} h={56} />
      <path d={ridgePath(21, 0, ls ? 430 : 300, ls ? 520 : 840, ls ? 150 : 120, ls ? 34 : 28, H)} fill="#0b0406" />
      <path d={ridgePath(33, ls ? 1170 : 700, W, ls ? 500 : 830, ls ? 160 : 130, ls ? 34 : 28, H)} fill="#0b0406" />
      <Waterfall x={ls ? 120 : 40} y={ls ? 470 : 840} w={ls ? 26 : 22} h={ls ? 190 : 200} />
      <Waterfall x={ls ? 1380 : 930} y={ls ? 470 : 840} w={ls ? 22 : 20} h={ls ? 190 : 200} />
      <FogBand y={ls ? 520 : 760} h={ls ? 200 : 260} speed={95} opacity={0.55} seed={3} width={W} />

      {/* the gate tower */}
      <g transform={`translate(${L.tx} ${L.ty})`}>
        <TowerArt />
      </g>

      {/* flag poles */}
      {[ls ? 112 : 46, ls ? 1488 : 954].map((px, i) => (
        <g key={i}>
          <rect x={px - 3} y={ls ? 330 : 700} width="6" height={ls ? 330 : 500} fill="#1c1413" />
          <Banner x={px} y={ls ? 340 : 710} w={ls ? 78 : 62} h={ls ? 210 : 180} delay={i * 0.9} />
        </g>
      ))}

      {/* wet cobblestone floor + reflections */}
      <rect y={floorY} width={W} height={H - floorY} fill="url(#floor-grad)" />
      <Cobbles W={W} y0={floorY} y1={H} vx={vx} />
      <rect x={vx - 5} y={floorY} width="10" height={H - floorY} fill="url(#refl)" opacity=".75" />
      <ellipse cx={vx} cy={floorY + 26} rx={ls ? 190 : 150} ry="22" fill="url(#glow-red)" opacity=".7" />

      {/* braziers + chains */}
      {(ls
        ? [[210, 650, 1.45], [520, 618, 1.2], [1080, 618, 1.2], [1390, 650, 1.45]]
        : [[150, 1200, 1.25], [350, 1245, 1.0], [650, 1245, 1.0], [850, 1200, 1.25]]
      ).map(([bx, by, bs], i) => (
        <g key={i}>
          <Brazier x={bx as number} y={by as number} s={bs as number} delay={i * 0.25} />
          <ellipse cx={bx} cy={(by as number) + 90 * (bs as number)} rx={50 * (bs as number)} ry="9" fill="url(#glow-red)" opacity=".5" />
        </g>
      ))}
      {ls ? (
        <>
          <Chain x1={210} y1={700} x2={520} y2={662} sag={34} />
          <Chain x1={1080} y1={662} x2={1390} y2={700} sag={34} />
          <Chain x1={210} y1={705} x2={0} y2={735} sag={30} />
          <Chain x1={1390} y1={705} x2={1600} y2={735} sag={30} />
        </>
      ) : (
        <>
          <Chain x1={150} y1={1255} x2={350} y2={1285} sag={26} />
          <Chain x1={650} y1={1285} x2={850} y2={1255} sag={26} />
        </>
      )}
      <FogBand y={ls ? 640 : 1180} h={ls ? 260 : 320} speed={70} opacity={0.7} seed={8} width={W} />
      <FogBand y={ls ? 720 : 1300} h={ls ? 200 : 260} speed={55} opacity={0.5} seed={5} width={W} />
    </svg>
  );
}

// ------------------------------------------------------------------ door art (door-local coords 0..290 x 0..495)
function DoorArt() {
  const arch = 'M0 495 V185 Q0 28 145 0 Q290 28 290 185 V495 Z';
  const rivets: { x: number; y: number }[] = [];
  for (const bx of [48, 112, 178, 242]) for (let y = 40; y < 480; y += 30) rivets.push({ x: bx, y });
  return (
    <g>
      <defs>
        <clipPath id="door-clip"><path d={arch} /></clipPath>
      </defs>
      <g clipPath="url(#door-clip)">
        <rect width="290" height="495" fill="url(#door-grad)" />
        {/* iron bands */}
        {[48, 112, 178, 242].map((x) => (
          <rect key={x} x={x - 7} y="0" width="14" height="495" fill="#1b1514" stroke="#3b2c29" />
        ))}
        {[110, 250, 390].map((y) => (
          <rect key={y} x="0" y={y} width="290" height="12" fill="#1b1514" stroke="#3b2c29" />
        ))}
        {rivets.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.4" fill="#2d2321" stroke="#5a443f" strokeWidth=".8" />
        ))}
        {/* filigree */}
        <g fill="none" stroke="#6a1d24" strokeWidth="1.6" strokeLinecap="round" opacity=".9">
          <path d="M20 140 q20 -30 40 0 t40 0 M190 140 q20 -30 40 0 t40 0" />
          <path d="M20 330 q20 30 40 0 t40 0 M190 330 q20 30 40 0 t40 0" />
          <path d="M70 60 q15 20 0 40 M220 60 q-15 20 0 40" />
          <path d="M30 430 q30 -40 60 0 M200 430 q30 -40 60 0" />
        </g>
        {/* inner glow edges along the seam */}
        <rect x="143" y="0" width="2" height="495" fill="#ff2d3d" opacity=".85" />
        <rect x="145" y="0" width="2" height="495" fill="#ff2d3d" opacity=".85" />
        <g fill="none" stroke="#ff3a4b" strokeWidth="1.4" opacity=".6">
          <circle cx="62" cy="62" r="12" />
          <circle cx="228" cy="62" r="12" />
          <path d="M62 54 V70 M54 62 H70 M228 54 V70 M220 62 H236" />
          <path d="M40 150 V380 M250 150 V380" strokeDasharray="4 6" />
        </g>
        {/* the sigil spans both leaves */}
        <g transform="translate(145 245)">
          <SigilArt r={78} strokeWidth={2.8} />
        </g>
        <g transform="translate(145 245)" fill="none" stroke="#ff3a4b" opacity=".5">
          <g>
            <RuneRing r={96} count={30} scale={0.75} strokeWidth={1} />
            <TickRing r={104} count={60} len={3} />
          </g>
        </g>
      </g>
    </g>
  );
}

// ------------------------------------------------------------------ interactive scene (doors + light + smoke)
interface Props {
  layout: GateLayout;
  /** Start the opening timeline. */
  go?: boolean;
  mode?: 'gate' | 'smoke';
  /** Render only the static art (used by SceneBackdrop). */
  staticOnly?: boolean;
}

export function GateScene({ layout, go, mode = 'gate', staticOnly }: Props) {
  const rect = doorRectPct(layout);
  return (
    <div className={cn('gate-root', go && 'gate-go', mode === 'smoke' && 'gate-smoke')}>
      <div className="gate-shake">
        <SceneStage portrait={layout === 'portrait'}>
          <GateArt layout={layout} />
          {(
            <div className="gate-persp">
              <div className="gate-doorrect" style={rect}>
                <div className="gate-light" />
                <div className="gate-rays" />
                <div className="gate-door door-l">
                  <svg viewBox="0 0 145 495" preserveAspectRatio="none">
                    <DoorArt />
                  </svg>
                </div>
                <div className="gate-door door-r">
                  <svg viewBox="145 0 145 495" preserveAspectRatio="none">
                    <DoorArt />
                  </svg>
                </div>
                <div className="gate-seam" />
                <div className="gate-sigil-flare" />
                {mode === 'smoke' && (
                  <>
                    <div className="ls ls1" />
                    <div className="ls ls2" />
                    <div className="ls ls3" />
                    <div className="ls ls4" />
                  </>
                )}
              </div>
            </div>
          )}
        </SceneStage>
      </div>
    </div>
  );
}

export { ArtDefs };

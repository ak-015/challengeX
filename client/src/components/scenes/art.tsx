import type { ReactNode } from 'react';
import { RuneRing, Hexagram } from '@/components/art/runes';

/** Deterministic PRNG so every scene is identical on every load. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Jagged cliff ridge polygon from x0 to x1 along baseline y, with peaks up to `amp`, closed at `floor`. */
export function ridgePath(seed: number, x0: number, x1: number, y: number, amp: number, step: number, floor: number): string {
  const r = rng(seed);
  let d = `M${x0} ${floor} L${x0} ${y}`;
  for (let x = x0 + step; x <= x1; x += step) {
    const peak = r() > 0.45;
    const yy = y - (peak ? r() * amp : r() * amp * 0.22);
    d += ` L${x} ${yy.toFixed(1)}`;
  }
  return `${d} L${x1} ${floor} Z`;
}

/** Gradients, patterns and the static noise filter shared by every scene. Rendered once. */
export function ArtDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="moon-fill" cx="38%" cy="36%" r="72%">
          <stop offset="0" stopColor="#ff7a78" />
          <stop offset=".5" stopColor="#c4121f" />
          <stop offset="1" stopColor="#52050b" />
        </radialGradient>
        <radialGradient id="moon-halo">
          <stop offset="0" stopColor="#ff2a3a" stopOpacity=".55" />
          <stop offset="1" stopColor="#ff2a3a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a0204" />
          <stop offset=".5" stopColor="#35050b" />
          <stop offset="1" stopColor="#7a0f18" />
        </linearGradient>
        <linearGradient id="stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3331" />
          <stop offset="1" stopColor="#120d0d" />
        </linearGradient>
        <linearGradient id="stone-lit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a4a46" />
          <stop offset="1" stopColor="#1a1211" />
        </linearGradient>
        <linearGradient id="flame-grad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff2a1a" />
          <stop offset=".6" stopColor="#ff8a1f" />
          <stop offset="1" stopColor="#ffe08a" />
        </linearGradient>
        <radialGradient id="glow-red">
          <stop offset="0" stopColor="#ff4150" stopOpacity=".85" />
          <stop offset="1" stopColor="#ff4150" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fog-blob">
          <stop offset="0" stopColor="#a8404c" stopOpacity=".55" />
          <stop offset="1" stopColor="#a8404c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9a0a4" stopOpacity=".7" />
          <stop offset="1" stopColor="#6a2a30" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id="beam-v" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff2a3a" stopOpacity=".9" />
          <stop offset="1" stopColor="#ff7a85" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="refl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff3344" stopOpacity=".7" />
          <stop offset="1" stopColor="#ff3344" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="floor-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c0b0e" />
          <stop offset="1" stopColor="#060203" />
        </linearGradient>
        <linearGradient id="door-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#241a19" />
          <stop offset=".5" stopColor="#120c0c" />
          <stop offset="1" stopColor="#1c1413" />
        </linearGradient>
        <pattern id="blocks" width="64" height="30" patternUnits="userSpaceOnUse">
          <path d="M0 0H64M0 15H64M0 30H64M32 0V15M0 15V30M64 15V30" stroke="#000" strokeOpacity=".5" strokeWidth="1.4" fill="none" />
        </pattern>
        <pattern id="wf-pattern" width="12" height="40" patternUnits="userSpaceOnUse">
          <rect width="12" height="40" fill="#8a2a33" opacity=".35" />
          <rect x="2" width="2" height="26" fill="#ffd7d7" opacity=".5" />
          <rect x="7" y="10" width="2" height="22" fill="#ffd7d7" opacity=".4" />
        </pattern>
        {/* Static texture only (never animated). */}
        <filter id="noise" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 -0.15" />
        </filter>
      </defs>
    </svg>
  );
}

export function Moon({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 2.4} fill="url(#moon-halo)" className="moon-glow" />
      <circle cx={cx} cy={cy} r={r} fill="url(#moon-fill)" />
      <g fill="#7a0b14" opacity=".45">
        <circle cx={cx - r * 0.3} cy={cy - r * 0.2} r={r * 0.16} />
        <circle cx={cx + r * 0.25} cy={cy + r * 0.1} r={r * 0.22} />
        <circle cx={cx - r * 0.05} cy={cy + r * 0.45} r={r * 0.12} />
        <circle cx={cx + r * 0.5} cy={cy - r * 0.35} r={r * 0.09} />
      </g>
    </g>
  );
}

export function Castle({ x, y, s = 1, seed = 1, towers = 9, glow = 1 }: { x: number; y: number; s?: number; seed?: number; towers?: number; glow?: number }) {
  const r = rng(seed);
  const bodies: ReactNode[] = [];
  const wins: ReactNode[] = [];
  let cx = 0;
  for (let i = 0; i < towers; i++) {
    const w = 26 + r() * 34;
    const h = (70 + r() * 150) * (i % 3 === 1 ? 1.5 : 1);
    const gap = -6 + r() * 10;
    const x0 = cx;
    cx += w + gap;
    const roof = w * (0.9 + r() * 0.8);
    bodies.push(<path key={`t${i}`} d={`M${x0} 0 V${-h} L${x0 + w / 2} ${-h - roof} L${x0 + w} ${-h} V0 Z`} />);
    const n = 1 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) {
      wins.push(
        <rect
          key={`w${i}-${j}`}
          x={x0 + w * (0.2 + j * 0.28)}
          y={-h * (0.15 + r() * 0.65)}
          width={w * 0.12}
          height={w * 0.3}
          className="win"
          style={{ animationDelay: `${(r() * 4).toFixed(2)}s` }}
        />,
      );
    }
  }
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g fill="#0b0507" stroke="#1c0b0e" strokeWidth={1}>{bodies}</g>
      <g fill="#ff3347" opacity={glow}>{wins}</g>
    </g>
  );
}

export function Waterfall({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <svg x={x} y={y} width={w} height={h} overflow="hidden">
      <g className="wf">
        <rect y={-40} width={w} height={h + 80} fill="url(#wf-pattern)" />
      </g>
      <rect width={w} height={h} fill="url(#water)" opacity=".55" />
    </svg>
  );
}

export function Bridge({ x, y, w, arches = 4, h = 60 }: { x: number; y: number; w: number; arches?: number; h?: number }) {
  const aw = w / arches;
  let d = `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
  for (let i = 0; i < arches; i++) {
    const ax = x + i * aw + aw * 0.18;
    const rr = aw * 0.32;
    d += ` M${ax} ${y + h} V${y + h * 0.5} A${rr} ${rr} 0 0 1 ${ax + rr * 2} ${y + h * 0.5} V${y + h} Z`;
  }
  return (
    <g>
      <path d={d} fill="#0c0507" fillRule="evenodd" stroke="#1d0b0e" />
      <g fill="#ff4a58">
        {Array.from({ length: arches + 1 }, (_, i) => (
          <circle key={i} cx={x + i * aw} cy={y - 3} r={2} className="win" style={{ animationDelay: `${(i * 0.7) % 3}s` }} />
        ))}
      </g>
    </g>
  );
}

export function Brazier({ x, y, s = 1, delay = 0 }: { x: number; y: number; s?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="-6" rx="46" ry="14" fill="url(#glow-red)" />
      <rect x="-14" y="12" width="28" height="42" fill="url(#stone)" stroke="#2a1a18" />
      <path d="M-24 -2 H24 L17 14 H-17 Z" fill="#17110f" stroke="#3a2a28" strokeWidth="1.5" />
      <g className="flame" style={{ animationDelay: `${delay}s` }}>
        <path d="M0 -46 C11 -28 17 -18 9 -3 H-9 C-17 -18 -9 -32 0 -46Z" fill="url(#flame-grad)" />
      </g>
      <g className="flame" style={{ animationDelay: `${delay + 0.35}s`, animationDuration: '0.9s' }}>
        <path d="M-10 -24 C-4 -15 -3 -9 -6 -3 H-13 C-15 -11 -13 -17 -10 -24Z" fill="#ffb347" opacity=".9" />
      </g>
    </g>
  );
}

export function Chain({ x1, y1, x2, y2, sag = 30 }: { x1: number; y1: number; x2: number; y2: number; sag?: number }) {
  const d = `M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.max(y1, y2) + sag} ${x2} ${y2}`;
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke="#080404" strokeWidth="7" strokeDasharray="7 5" />
      <path d={d} stroke="#4a3a36" strokeWidth="2.5" strokeDasharray="7 5" transform="translate(0 -1)" />
    </g>
  );
}

export function Banner({ x, y, w = 64, h = 190, delay = 0 }: { x: number; y: number; w?: number; h?: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-w / 2 - 6} y={-6} width={w + 12} height={8} fill="#2a1b19" />
      <g className="banner-sway" style={{ animationDelay: `${delay}s` }}>
        <path d={`M${-w / 2} 0 H${w / 2} V${h} L0 ${h - 26} L${-w / 2} ${h} Z`} fill="#7a0a12" stroke="#c4121f" strokeWidth="1.5" />
        <g transform={`translate(0 ${h * 0.4})`} fill="none" stroke="#ff4a58" strokeWidth="2">
          <circle r={w * 0.3} />
          <path d={`M0 ${-w * 0.3} L${w * 0.26} ${w * 0.15} H${-w * 0.26} Z`} />
          <circle r="2.5" fill="#ff4a58" />
        </g>
      </g>
    </g>
  );
}

/** Hooded stone statue holding a sword with glowing runes. Origin = feet centre, ~300 units tall. */
export function Statue({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-56 0 L-42 -150 Q-48 -215 -28 -255 Q0 -296 28 -255 Q48 -215 42 -150 L56 0 Z" fill="url(#stone-lit)" stroke="#0a0606" strokeWidth="2" />
      <ellipse cx="0" cy="-232" rx="17" ry="23" fill="#050202" />
      <path d="M-30 -150 Q0 -128 30 -150 L26 -118 Q0 -100 -26 -118 Z" fill="#241a19" />
      <rect x="-20" y="-200" width="40" height="7" fill="#1a1211" />
      <rect x="-5" y="-196" width="10" height="190" fill="#1d1514" stroke="#0a0606" />
      <rect x="-2.5" y="-186" width="5" height="150" fill="#ff2f3f" opacity=".92" />
      <g stroke="#ff6a76" strokeWidth="1.6">
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i} d={`M-5 ${-176 + i * 20} H5`} />
        ))}
      </g>
      <path d="M-34 -140 L-12 -118 M34 -140 L12 -118" stroke="#0a0606" strokeWidth="14" strokeLinecap="round" />
    </g>
  );
}

export function FogBand({ y, h, speed = 80, opacity = 0.6, seed = 1, width = 1600 }: { y: number; h: number; speed?: number; opacity?: number; seed?: number; width?: number }) {
  const r = rng(seed);
  const count = Math.ceil(width / 200);
  const blobs: { cx: number; cy: number; rx: number; ry: number }[] = [];
  for (let i = 0; i < count; i++) {
    blobs.push({ cx: i * (width / count) + r() * 60, cy: h / 2 + (r() - 0.5) * h * 0.3, rx: 190 + r() * 130, ry: h * (0.35 + r() * 0.3) });
  }
  const all = [...blobs, ...blobs.map((b) => ({ ...b, cx: b.cx + width }))];
  return (
    <g transform={`translate(0 ${y})`} opacity={opacity}>
      <g className="fog" style={{ animationDuration: `${speed}s`, ['--fogw' as string]: `${width}px` }}>
        {all.map((b, i) => (
          <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill="url(#fog-blob)" />
        ))}
      </g>
    </g>
  );
}

/** Wet cobblestone perspective lines. */
export function Cobbles({ W, y0, y1, vx }: { W: number; y0: number; y1: number; vx: number }) {
  const lines: ReactNode[] = [];
  const vy = y0 - (y1 - y0) * 1.6;
  for (let i = -12; i <= 12; i++) {
    const xb = vx + i * (W / 7);
    const xt = vx + (xb - vx) * ((y0 - vy) / (y1 - vy));
    lines.push(<line key={`v${i}`} x1={xt} y1={y0} x2={xb} y2={y1} />);
  }
  for (let k = 0; k < 10; k++) {
    const t = (k + 1) / 10;
    const yy = y0 + (y1 - y0) * t * t;
    lines.push(<line key={`h${k}`} x1={0} y1={yy} x2={W} y2={yy} />);
  }
  return (
    <g stroke="#2a1214" strokeWidth="1.3" opacity=".85">
      {lines}
    </g>
  );
}

/** Large red sigil: rune ring + triangle + hexagram. Used on doors and banners. */
export function SigilArt({ r = 70, strokeWidth = 2.6 }: { r?: number; strokeWidth?: number }) {
  return (
    <g fill="none" stroke="#ff3a4b" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round">
      <circle r={r} opacity=".35" strokeWidth={strokeWidth * 3} />
      <circle r={r} />
      <circle r={r * 0.84} strokeWidth={strokeWidth * 0.6} />
      <g strokeWidth={strokeWidth * 0.5} opacity=".9">
        <RuneRing r={r * 0.92} count={24} scale={r / 70 * 0.7} />
      </g>
      <Hexagram r={r * 0.7} strokeWidth={strokeWidth * 0.7} />
      <path d={`M0 ${-r * 0.5} L${r * 0.44} ${r * 0.25} H${-r * 0.44} Z`} />
      <circle r={r * 0.12} fill="#ff3a4b" />
      <path d={`M0 ${-r * 1.08} V${-r * 0.96} M0 ${r * 1.08} V${r * 0.96} M${-r * 1.08} 0 H${-r * 0.96} M${r * 1.08} 0 H${r * 0.96}`} />
    </g>
  );
}

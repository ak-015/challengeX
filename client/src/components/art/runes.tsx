// Procedural "runes": simple stave-and-branch glyphs drawn as strokes, so no font has to support the Runic block.
const GLYPHS = [
  'M0 -7V7M0 -7L5 -3M0 -1L5 3',
  'M0 -7V7M0 -7L5 -2V3L0 8',
  'M-4 -7L4 7M4 -7L-4 7',
  'M0 -7V7M-4 -3L0 0L-4 3',
  'M0 -7V7M0 -7L5 -3L0 1',
  'M-4 -7V7M-4 -2L4 -7M-4 2L4 7',
  'M0 -7V7M-4 -4L4 4',
  'M0 -7L5 0L0 7L-5 0Z',
  'M0 -7V7M0 -2L5 -6M0 3L5 -1',
  'M-4 7L0 -7L4 7M-3 2H3',
  'M0 -7V7M-5 -3L0 -7L5 -3',
  'M-3 -7V7M3 -7V7M-3 0H3',
] as const;

export const glyphPath = (i: number): string => GLYPHS[((i % GLYPHS.length) + GLYPHS.length) % GLYPHS.length] as string;

interface RuneRingProps {
  /** circle radius in svg units */
  r: number;
  count: number;
  scale?: number;
  strokeWidth?: number;
  offset?: number;
}

/** Runes spaced around a circle, each rotated to stand on the ring. */
export function RuneRing({ r, count, scale = 1, strokeWidth = 1.2, offset = 0 }: RuneRingProps) {
  return (
    <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {Array.from({ length: count }, (_, i) => {
        const a = (360 / count) * i;
        return (
          <path
            key={i}
            d={glyphPath(i + offset)}
            transform={`rotate(${a}) translate(0 ${-r}) scale(${scale})`}
          />
        );
      })}
    </g>
  );
}

/** Tick marks around a ring. */
export function TickRing({ r, count, len = 4, strokeWidth = 1 }: { r: number; count: number; len?: number; strokeWidth?: number }) {
  return (
    <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round">
      {Array.from({ length: count }, (_, i) => (
        <line key={i} x1={0} y1={-r} x2={0} y2={-r + (i % 5 === 0 ? len * 1.8 : len)} transform={`rotate(${(360 / count) * i})`} />
      ))}
    </g>
  );
}

/** Hexagram (two triangles) of radius r. */
export function Hexagram({ r, strokeWidth = 1.4 }: { r: number; strokeWidth?: number }) {
  const pt = (deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${(Math.cos(a) * r).toFixed(2)},${(Math.sin(a) * r).toFixed(2)}`;
  };
  return (
    <g fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round">
      <polygon points={[0, 120, 240].map(pt).join(' ')} />
      <polygon points={[60, 180, 300].map(pt).join(' ')} />
    </g>
  );
}

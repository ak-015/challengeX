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

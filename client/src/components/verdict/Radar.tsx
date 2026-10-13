import { CATEGORIES, CATEGORY_LABEL, type Category } from '@/lib/constants';
import { axisAngle, polar, radarPoints } from '@/lib/gauge';

/** Hand-written SVG radar with exactly 7 axes, score labels and a visually hidden data table. */
export function Radar({ scores, animate = true, size = 380 }: { scores: Record<Category, number>; animate?: boolean; size?: number }) {
  const R = 120;
  const labelR = R + 30;
  return (
    <figure className="m-0">
      <svg viewBox="-200 -190 400 380" width={size} height={size * 0.95} className="mx-auto block max-w-full" role="img" aria-label="Radar chart of the 7 category scores out of 10">
        {[2, 4, 6, 8, 10].map((v) => (
          <polygon key={v} points={CATEGORIES.map((_, i) => { const p = polar(axisAngle(i), (v / 10) * R); return `${p.x},${p.y}`; }).join(' ')} fill="none" stroke="#5a3a3d" strokeWidth={v === 10 ? 1.6 : 1} />
        ))}
        {CATEGORIES.map((_, i) => {
          const p = polar(axisAngle(i), R);
          return <line key={i} x1={0} y1={0} x2={p.x} y2={p.y} stroke="#5a3a3d" strokeWidth="1" />;
        })}
        <g className={animate ? 'radar-grow' : undefined}>
          <polygon points={radarPoints(scores, R)} fill="rgba(225,29,46,0.4)" stroke="#ff5a67" strokeWidth="2.5" strokeLinejoin="round" />
          {CATEGORIES.map((c, i) => {
            const p = polar(axisAngle(i), (Math.max(0, Math.min(10, scores[c] ?? 0)) / 10) * R);
            return <circle key={c} cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#e11d2e" strokeWidth="2" />;
          })}
        </g>
        {CATEGORIES.map((c, i) => {
          const a = axisAngle(i);
          const p = polar(a, labelR);
          const anchor = Math.abs(p.x) < 12 ? 'middle' : p.x > 0 ? 'start' : 'end';
          return (
            <text key={c} x={p.x} y={p.y} textAnchor={anchor} className="font-label" fill="#e8e2dc" fontSize="13" fontWeight="600">
              <tspan x={p.x} dy="-0.2em">{CATEGORY_LABEL[c]}</tspan>
              <tspan x={p.x} dy="1.25em" fill="#ff8a93" fontWeight="700">{(scores[c] ?? 0).toFixed(1)}</tspan>
            </text>
          );
        })}
      </svg>
      <figcaption className="sr-only">
        <table>
          <caption>Category scores out of 10</caption>
          <thead>
            <tr><th scope="col">Category</th><th scope="col">Score</th></tr>
          </thead>
          <tbody>
            {CATEGORIES.map((c) => (
              <tr key={c}><th scope="row">{CATEGORY_LABEL[c]}</th><td>{(scores[c] ?? 0).toFixed(1)}</td></tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

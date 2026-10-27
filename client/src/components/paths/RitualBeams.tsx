import { motion } from 'framer-motion';

interface Pt {
  x: number;
  y: number;
}

/**
 * Light beams from the floor ritual circle to the base of each card. Drawn in viewport
 * coordinates under the cards: a volumetric cone, a hot core, energy dashes streaming
 * toward the card, travelling sparks, and a glow where each beam feeds the card's gem.
 */
export function RitualBeams({ origin, targets, delay = 1.4 }: { origin: Pt; targets: Pt[]; delay?: number }) {
  return (
    <svg className="pointer-events-none fixed inset-0 z-[5] h-full w-full" width="100%" height="100%" aria-hidden>
      <defs>
        <filter id="rb-blur-lg" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="rb-blur-md" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="rb-blur-sm" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
        <radialGradient id="rb-node">
          <stop offset="0" stopColor="#fff1e8" stopOpacity="0.95" />
          <stop offset="0.22" stopColor="#ff5a46" stopOpacity="0.8" />
          <stop offset="1" stopColor="#e50920" stopOpacity="0" />
        </radialGradient>
        {targets.map((t, i) => (
          <linearGradient key={i} id={`rb-g${i}`} gradientUnits="userSpaceOnUse" x1={origin.x} y1={origin.y} x2={t.x} y2={t.y}>
            <stop offset="0" stopColor="#ffd9cf" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#ff4a3d" stopOpacity="0.85" />
            <stop offset="1" stopColor="#e50920" stopOpacity="0.95" />
          </linearGradient>
        ))}
        {targets.map((t, i) => (
          <linearGradient key={`c${i}`} id={`rb-c${i}`} gradientUnits="userSpaceOnUse" x1={origin.x} y1={origin.y} x2={t.x} y2={t.y}>
            <stop offset="0" stopColor="#ff3b30" stopOpacity="0" />
            <stop offset="1" stopColor="#ff3b30" stopOpacity="0.42" />
          </linearGradient>
        ))}
      </defs>

      {/* hot spot where all beams are born */}
      <motion.circle
        cx={origin.x}
        cy={origin.y}
        r={70}
        fill="url(#rb-node)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={{ delay: delay - 0.3, duration: 1 }}
        className="rb-origin"
      />

      {targets.map((t, i) => {
        const dx = t.x - origin.x;
        const dy = t.y - origin.y;
        const len = Math.hypot(dx, dy) || 1;
        // perpendicular half-width of the light cone at the card end
        const nx = (-dy / len) * 54;
        const ny = (dx / len) * 54;
        const d = delay + i * 0.18;
        const path = `M${origin.x} ${origin.y} L${t.x} ${t.y}`;
        return (
          <motion.g key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d, duration: 0.9 }}>
            {/* volumetric cone */}
            <polygon
              points={`${origin.x},${origin.y} ${t.x + nx},${t.y + ny} ${t.x - nx},${t.y - ny}`}
              fill={`url(#rb-c${i})`}
              filter="url(#rb-blur-md)"
              className="rb-cone"
              style={{ animationDelay: `${-i * 0.7}s` }}
            />
            {/* wide soft glow */}
            <line x1={origin.x} y1={origin.y} x2={t.x} y2={t.y} stroke={`url(#rb-g${i})`} strokeWidth={30} strokeLinecap="round" opacity={0.45} filter="url(#rb-blur-lg)" />
            {/* mid glow */}
            <line x1={origin.x} y1={origin.y} x2={t.x} y2={t.y} stroke={`url(#rb-g${i})`} strokeWidth={10} strokeLinecap="round" opacity={0.6} filter="url(#rb-blur-md)" />
            {/* core */}
            <motion.line
              x1={origin.x}
              y1={origin.y}
              x2={t.x}
              y2={t.y}
              stroke={`url(#rb-g${i})`}
              strokeWidth={5}
              strokeLinecap="round"
              filter="url(#rb-blur-sm)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: d, duration: 0.9, ease: 'easeOut' }}
            />
            <line x1={origin.x} y1={origin.y} x2={t.x} y2={t.y} stroke="#ffe3d9" strokeWidth={1.8} strokeLinecap="round" opacity={0.85} />
            {/* energy streaming toward the card */}
            <line x1={origin.x} y1={origin.y} x2={t.x} y2={t.y} stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeDasharray="2 26" className="rb-flow" style={{ animationDelay: `${-i * 0.4}s` }} opacity={0.9} />
            {/* travelling sparks */}
            {[0, 1].map((k) => (
              <circle key={k} r={3.4} fill="#fff4ee" filter="url(#rb-blur-sm)">
                <animateMotion dur="2.6s" begin={`${d + k * 1.3}s`} repeatCount="indefinite" path={path} />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur="2.6s" begin={`${d + k * 1.3}s`} repeatCount="indefinite" />
              </circle>
            ))}
            {/* where the beam feeds the card's gem */}
            <circle cx={t.x} cy={t.y} r={44} fill="url(#rb-node)" className="rb-feed" style={{ animationDelay: `${-i * 0.5}s` }} />
          </motion.g>
        );
      })}
    </svg>
  );
}

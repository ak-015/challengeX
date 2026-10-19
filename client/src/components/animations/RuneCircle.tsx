import clsx from 'clsx';

/**
 * Animated SVG magical circle: rotating rune rings, pulsing core, expanding
 * energy waves. Pure SVG + CSS so it works with reduced-motion and is cheap.
 */
export function RuneCircle({ className, active = true }: { className?: string; active?: boolean }) {
  const runes = Array.from({ length: 12 }, (_, i) => (i * 360) / 12);
  return (
    <div className={clsx('relative', className)} aria-hidden>
      <svg viewBox="0 0 400 400" className="w-full h-full" role="presentation">
        <defs>
          <radialGradient id="rc-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff2638" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#e50920" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#e50920" stopOpacity="0" />
          </radialGradient>
          <filter id="rc-blur">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* glow disc */}
        <circle cx="200" cy="200" r="190" fill="url(#rc-glow)" />

        {/* outer ring */}
        <g className={active ? 'animate-spin-slow' : ''} style={{ transformOrigin: '200px 200px' }}>
          <circle cx="200" cy="200" r="178" fill="none" stroke="#e50920" strokeWidth="1.5" opacity="0.7" />
          <circle
            cx="200"
            cy="200"
            r="168"
            fill="none"
            stroke="#e50920"
            strokeWidth="0.8"
            strokeDasharray="4 10"
            opacity="0.6"
          />
          {/* rune ticks */}
          {runes.map((deg) => (
            <line
              key={deg}
              x1="200"
              y1="26"
              x2="200"
              y2="42"
              stroke="#ff2638"
              strokeWidth="2"
              transform={`rotate(${deg} 200 200)`}
              opacity="0.8"
            />
          ))}
        </g>

        {/* middle ring (counter-rotating) */}
        <g className={active ? 'animate-spin-reverse' : ''} style={{ transformOrigin: '200px 200px' }}>
          <circle
            cx="200"
            cy="200"
            r="130"
            fill="none"
            stroke="#e50920"
            strokeWidth="1"
            strokeDasharray="20 8 4 8"
            opacity="0.65"
          />
          <polygon
            points="200,80 296,145 259,258 141,258 104,145"
            fill="none"
            stroke="#ff2638"
            strokeWidth="1"
            opacity="0.5"
            filter="url(#rc-blur)"
          />
        </g>

        {/* inner star */}
        <g className={active ? 'animate-spin-slow' : ''} style={{ transformOrigin: '200px 200px', animationDuration: '90s' }}>
          <polygon
            points="200,110 220,180 290,180 234,222 255,292 200,250 145,292 166,222 110,180 180,180"
            fill="none"
            stroke="#e50920"
            strokeWidth="1.2"
            opacity="0.55"
          />
        </g>

        {/* pulsing core */}
        <circle cx="200" cy="200" r="14" fill="#ff2638" className={active ? 'animate-pulse-glow' : ''} filter="url(#rc-blur)" />
        <circle cx="200" cy="200" r="6" fill="#fff" opacity="0.9" />

        {/* expanding energy waves */}
        {active && (
          <>
            <circle cx="200" cy="200" r="60" fill="none" stroke="#ff2638" strokeWidth="1">
              <animate attributeName="r" values="40;190" dur="3.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur="3.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="200" cy="200" r="60" fill="none" stroke="#e50920" strokeWidth="1">
              <animate attributeName="r" values="40;190" dur="3.5s" begin="1.75s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur="3.5s" begin="1.75s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>
    </div>
  );
}

import { motion } from 'framer-motion';
import { STAGE_H, STAGE_W, pctX, pctY } from '@/components/gate/stage';
import type { SwordSpec } from '@/components/gate/stage';

/**
 * Living, flickering energy blade laid over a guard's sword in the artwork.
 * Four independent layers, all framer-motion, all out of phase so it never
 * looks like a loop: a breathing halo, an irregularly flickering core, a
 * pulse of light travelling up the blade, and rising sparks.
 */

const BLADE = 'polygon(50% 0%, 100% 9%, 78% 100%, 22% 100%, 0% 9%)';
const SPARKS = [0, 1, 2, 3, 4, 5];

export function SwordGlow({ x, y0, y1, seed }: SwordSpec) {
  const h = y1 - y0;
  const bladeW = 18; // stage px
  const o = seed * 0.37; // phase offset between the two guards

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: pctX(x - bladeW / 2),
        top: pctY(y0),
        width: `${(bladeW / STAGE_W) * 100}%`,
        height: `${(h / STAGE_H) * 100}%`,
        mixBlendMode: 'screen',
      }}
      aria-hidden
    >
      {/* halo */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '1100%',
          height: '112%',
          background:
            'radial-gradient(ellipse at center, rgba(255,50,66,0.6) 0%, rgba(255,24,44,0.28) 34%, rgba(200,0,24,0.1) 58%, transparent 72%)',
          filter: 'blur(9px)',
        }}
        animate={{ opacity: [0.5, 0.95, 0.6, 1, 0.45, 0.85, 0.55], scale: [1, 1.12, 0.96, 1.18, 0.98, 1.08, 1] }}
        transition={{
          duration: 3.1 + o,
          times: [0, 0.14, 0.31, 0.5, 0.68, 0.85, 1],
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* core blade */}
      <motion.div
        className="absolute inset-0"
        style={{
          clipPath: BLADE,
          background: 'linear-gradient(to top, #ff1428 0%, #ff3a4c 55%, #ff9aa2 100%)',
          filter: 'blur(1.2px) saturate(1.2)',
        }}
        animate={{ opacity: [0.3, 0.7, 0.42, 0.62, 0.28, 0.72, 0.4], scaleX: [1, 1.3, 0.9, 1.2, 1, 1.35, 1] }}
        transition={{
          duration: 1.7 + o * 0.6,
          times: [0, 0.12, 0.3, 0.46, 0.63, 0.82, 1],
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* energy pulse climbing the blade */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: BLADE }}>
        <motion.div
          className="absolute inset-x-[-40%] h-[36%]"
          style={{
            background: 'linear-gradient(to top, transparent, rgba(255,200,205,0.8), transparent)',
            filter: 'blur(2px)',
          }}
          initial={{ y: '320%', opacity: 0 }}
          animate={{ y: ['320%', '-60%'], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 0.9 + seed * 0.8,
            delay: o * 2,
            ease: 'easeOut',
          }}
        />
      </div>

      {/* rising sparks */}
      {SPARKS.map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${20 + ((i * 53 + seed * 17) % 60)}%`,
            bottom: `${10 + ((i * 29) % 50)}%`,
            width: 3,
            height: 3,
            background: '#ffb4b8',
            boxShadow: '0 0 6px 2px rgba(255,60,70,0.9)',
          }}
          animate={{
            y: [0, -48 - i * 7],
            x: [0, (i % 2 ? 1 : -1) * (6 + i * 3)],
            opacity: [0, 1, 0],
            scale: [1, 0.3],
          }}
          transition={{
            duration: 1.4 + (i % 3) * 0.5,
            repeat: Infinity,
            delay: i * 0.45 + o,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

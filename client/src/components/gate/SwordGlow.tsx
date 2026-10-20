import { motion, useReducedMotion } from 'framer-motion';

/**
 * Living glow for a guard's sword. Authored in the artwork's 1600×900 space and
 * positioned in percentages, so it tracks the blade at every size.
 * Layers (all additive): wide halo, hot core, a pulse of energy that runs
 * down the blade, crossguard ember and a tip flare. Each flickers on its own
 * irregular rhythm so the two swords never pulse in unison.
 */
const W = 1600;
const H = 900;
const pct = (v: number, base: number) => `${(v / base) * 100}%`;

const BLADE_TOP = 506;
const BLADE_BOTTOM = 704;

export function SwordGlow({
  x,
  seed = 0,
  boost = false,
}: {
  x: number;
  seed?: number;
  boost?: boolean;
}) {
  const reduce = useReducedMotion();
  const d = (n: number) => n * (1 + seed * 0.23); // detune durations between swords
  const loop = (duration: number, delay = 0) =>
    reduce
      ? { duration: 0 }
      : ({ duration: d(duration), repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay } as const);

  const bladeH = BLADE_BOTTOM - BLADE_TOP;

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left: pct(x - 60, W),
        top: pct(BLADE_TOP - 30, H),
        width: pct(120, W),
        height: pct(bladeH + 80, H),
        mixBlendMode: 'screen',
      }}
      animate={{ scale: boost ? 1.35 : 1, opacity: boost ? 1 : 0.95 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      aria-hidden
    >
      {/* ambient light cast on the stones and fog */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 46% at 50% 60%, rgba(255,40,50,.5), rgba(255,20,40,.16) 55%, transparent 75%)',
          filter: 'blur(10px)',
        }}
        animate={reduce ? undefined : { opacity: [0.45, 1, 0.6, 0.95, 0.5], scale: [1, 1.12, 1.02, 1.1, 1] }}
        transition={{ ...loop(2.1), times: [0, 0.25, 0.5, 0.78, 1] }}
      />

      {/* blade halo */}
      <motion.div
        className="absolute"
        style={{
          left: '32%',
          width: '36%',
          top: '14%',
          bottom: '6%',
          background:
            'linear-gradient(to bottom, rgba(255,70,70,.0), rgba(255,60,70,.85) 18%, rgba(255,50,60,.7) 70%, rgba(255,90,90,.0))',
          filter: 'blur(5px)',
          borderRadius: '50% / 8%',
          transformOrigin: '50% 50%',
        }}
        animate={reduce ? undefined : { opacity: [0.55, 1, 0.7, 1, 0.6], scaleX: [1, 1.35, 1.05, 1.5, 1.1] }}
        transition={{ ...loop(1.5), times: [0, 0.2, 0.45, 0.7, 1] }}
      />

      {/* white-hot core */}
      <motion.div
        className="absolute"
        style={{
          left: '46.2%',
          width: '7.6%',
          top: '17%',
          bottom: '8%',
          background:
            'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,235,235,.95) 14%, rgba(255,205,205,.95) 78%, rgba(255,255,255,.2))',
          filter: 'blur(1.4px)',
          borderRadius: 999,
        }}
        animate={reduce ? undefined : { opacity: [0.65, 1, 0.8, 1, 0.7], scaleX: [1, 1.5, 1.1, 1.3, 1] }}
        transition={{ ...loop(0.9, 0.2), times: [0, 0.3, 0.5, 0.8, 1] }}
      />

      {/* pulse of energy sliding down the blade */}
      {!reduce && (
        <motion.div
          className="absolute"
          style={{
            left: '41%',
            width: '18%',
            height: '16%',
            top: '16%',
            background:
              'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,255,255,1), rgba(255,120,130,.7) 45%, transparent 75%)',
            filter: 'blur(2px)',
          }}
          animate={{ y: ['0%', '560%'], opacity: [0, 1, 1, 0], scaleY: [0.7, 1.4, 1.2, 0.6] }}
          transition={{
            duration: d(2.1),
            repeat: Infinity,
            ease: 'easeIn',
            repeatDelay: d(0.7),
            times: [0, 0.15, 0.8, 1],
            delay: seed * 0.9,
          }}
        />
      )}

      {/* crossguard ember */}
      <motion.div
        className="absolute"
        style={{
          left: '12%',
          width: '76%',
          top: '9%',
          height: '10%',
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,90,80,.85), transparent 70%)',
          filter: 'blur(3px)',
        }}
        animate={reduce ? undefined : { opacity: [0.35, 0.9, 0.5, 1, 0.4] }}
        transition={{ ...loop(1.2, 0.4), times: [0, 0.2, 0.5, 0.75, 1] }}
      />

      {/* tip flare */}
      <motion.div
        className="absolute"
        style={{
          left: '26%',
          width: '48%',
          bottom: '0%',
          height: '24%',
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,235,235,.95), rgba(255,60,70,.55) 40%, transparent 72%)',
          filter: 'blur(4px)',
        }}
        animate={reduce ? undefined : { opacity: [0.5, 1, 0.65, 1, 0.55], scale: [0.85, 1.35, 0.95, 1.5, 0.9] }}
        transition={{ ...loop(1.1, 0.1), times: [0, 0.25, 0.5, 0.75, 1] }}
      />
    </motion.div>
  );
}

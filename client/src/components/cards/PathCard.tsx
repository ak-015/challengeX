import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { assets } from '@/utils/assets';
import { StoneGlow } from '@/components/paths/StoneGlow';

interface PathCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
  /** base font size of the card; everything inside is in `em`, so the card scales as a unit */
  fontSize?: number | string;
}

/**
 * Stone tablet card backed by the red-glowing stone frame artwork. The frame's ruby stones
 * pulse and sparkle (see StoneGlow); the card emerges from the ritual circle with a restrained
 * 3D lift.
 */
export function PathCard({ to, icon: Icon, title, description, index, fontSize = 16 }: PathCardProps) {
  return (
    <motion.div
      className="h-full w-full"
      initial={{ opacity: 0, y: 80, rotateX: -25, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.02 }}
      style={{ transformPerspective: 900, fontSize }}
    >
      <Link
        to={to}
        className="group relative block aspect-[3/4] w-full overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson-glow"
      >
        <img src={assets.stoneCardFrame} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/50 to-black/75" aria-hidden />
        <StoneGlow seed={index} />

        <div className="relative flex h-full flex-col items-center justify-center text-center" style={{ padding: '17% 14%', gap: '0.8em' }}>
          <Icon className="text-[#f0b9a8] drop-shadow-[0_0_8px_rgba(255,80,60,0.55)]" style={{ width: '2.5em', height: '2.5em' }} strokeWidth={1.4} aria-hidden />
          <h3 className="font-heading uppercase tracking-wide text-parchment leading-tight" style={{ fontSize: '1.08em' }}>
            {title}
          </h3>
          <span className="h-px w-1/3 bg-gradient-to-r from-transparent via-crimson-glow/70 to-transparent" aria-hidden />
          <p className="font-narrative text-parchment-dim leading-snug" style={{ fontSize: '0.78em' }}>
            {description}
          </p>
          <span
            className="mt-[0.3em] grid place-items-center rounded-full border border-crimson-glow/70 text-crimson-glow shadow-crimson-sm transition-all group-hover:bg-crimson-soft group-hover:shadow-crimson-md"
            style={{ width: '2.2em', height: '2.2em' }}
            aria-hidden
          >
            <ArrowRight style={{ width: '1em', height: '1em' }} />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

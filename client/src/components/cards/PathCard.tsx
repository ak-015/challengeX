import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { assets } from '@/utils/assets';

interface PathCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

/**
 * Stone tablet card backed by the supplied red-glowing stone frame artwork.
 * Emerges from the ritual circle with a restrained 3D lift + crimson glow.
 */
export function PathCard({ to, icon: Icon, title, description, index }: PathCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 80, rotateX: -25, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      transition={{ delay: 0.9 + index * 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="perspective-[900px]"
    >
      <Link
        to={to}
        className="group relative block aspect-[3/4] w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border-visible)] transition-colors duration-300 shadow-stone hover:shadow-crimson-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-crimson-glow"
      >
        <img
          src={assets.stoneCardFrame}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/80" aria-hidden />
        <div className="relative flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <span className="rounded-full border border-crimson/40 bg-crimson-soft p-3 text-crimson-glow shadow-crimson-sm group-hover:shadow-crimson-md transition-shadow">
            <Icon className="h-7 w-7" aria-hidden />
          </span>
          <h3 className="font-heading text-lg tracking-wide text-parchment uppercase">{title}</h3>
          <p className="font-narrative text-sm text-parchment-dim leading-relaxed max-w-[16rem]">{description}</p>
          <span className="mt-auto font-heading text-[0.65rem] uppercase tracking-[0.25em] text-crimson-glow opacity-0 group-hover:opacity-100 transition-opacity">
            Begin →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

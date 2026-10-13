import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  level?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
  id?: string;
}
const size = { 1: 'text-3xl sm:text-5xl', 2: 'text-2xl sm:text-3xl', 3: 'text-xl sm:text-2xl' } as const;

/** Metallic silver gradient heading with a red glow (Cinzel Decorative). */
export function Heading({ level = 1, children, className, id }: Props) {
  const Tag = (`h${level}` as 'h1' | 'h2' | 'h3');
  return (
    <Tag id={id} className={cn('font-display font-bold leading-tight tracking-wide', size[level], className)}>
      <span className="metal-text">{children}</span>
    </Tag>
  );
}

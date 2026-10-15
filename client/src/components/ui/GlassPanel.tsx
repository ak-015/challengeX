import { forwardRef, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Corners } from './Corners';

interface Props extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  as?: ElementType;
  /** Neon pulse on hover/focus. Use for clickable cards. */
  interactive?: boolean;
  corners?: boolean;
  type?: 'button' | 'submit';
  children?: ReactNode;
}

/** Dark glass panel: >= rgba(7,5,6,0.78) background, blur <= 8px, glowing red border, ornate corners. Static panels only. */
export const GlassPanel = forwardRef<HTMLElement, Props>(function GlassPanel(
  { as: Tag = 'div', interactive, corners = true, className, children, ...rest },
  ref,
) {
  return (
    <Tag ref={ref} className={cn('glass', interactive && 'glass-interactive', className)} {...rest}>
      {corners && <Corners />}
      {children}
    </Tag>
  );
});

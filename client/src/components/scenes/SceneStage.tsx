import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A cover-fit box with a fixed aspect ratio (16:9, or 10:15 for the portrait gate) centred in the viewport. */
export function SceneStage({ portrait, className, children }: { portrait?: boolean; className?: string; children: ReactNode }) {
  return <div className={cn('stage', portrait && 'stage-portrait', className)}>{children}</div>;
}

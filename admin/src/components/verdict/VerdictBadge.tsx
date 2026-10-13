import { Icon, type IconName } from '@/components/ui/Icon';
import { VERDICT_STYLE, type Verdict } from '@/lib/constants';
import { cn } from '@/lib/cn';

const ICON: Record<Verdict, IconName> = { KILL: 'skull', PIVOT: 'shuffle', BUILD: 'hammer' };

/** KILL / PIVOT / BUILD: icon + text + colour (never colour alone). `stamp` plays the stamp animation. */
export function VerdictBadge({ verdict, stamp, size = 'lg' }: { verdict: Verdict; stamp?: boolean; size?: 'sm' | 'lg' }) {
  const st = VERDICT_STYLE[verdict];
  return (
    <span
      className={cn('inline-flex items-center gap-2 rounded-md border-2 bg-black/70 font-display font-bold tracking-[0.2em]', size === 'lg' ? 'px-5 py-2 text-3xl sm:text-4xl' : 'px-2 py-0.5 text-xs', stamp && 'stamp')}
      style={{ color: st.text, borderColor: st.ring }}
    >
      <Icon name={ICON[verdict]} size={size === 'lg' ? 30 : 14} />
      {st.label}
    </span>
  );
}

import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';

type Tone = 'ok' | 'warn' | 'bad' | 'neutral' | 'info';
const TONE: Record<Tone, string> = {
  ok: 'border-[#3fcf7f] bg-[#0b2417] text-[#8ff0b4]',
  warn: 'border-[#f2b84a] bg-[#2a1d05] text-[#ffd27a]',
  bad: 'border-[#ff6b76] bg-[#2a0408] text-[#ff9aa2]',
  neutral: 'border-[rgba(185,176,168,0.55)] bg-[rgba(255,255,255,0.04)] text-ash',
  info: 'border-[#7cc4ff] bg-[#08202e] text-[#a9d8ff]',
};

/** Status pill: always text, optionally an icon (never colour alone). */
export function Pill({ tone = 'neutral', icon, children }: { tone?: Tone; icon?: IconName; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 font-label text-[11px] font-bold uppercase tracking-wider', TONE[tone])}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}

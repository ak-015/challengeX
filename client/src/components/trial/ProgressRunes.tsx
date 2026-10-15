import { glyphPath } from '@/components/art/runes';
import { progressLabel, runeSlots, type RuneStatus } from '@/lib/trialLogic';
import type { QaEntry } from '@/lib/apiTypes';
import { cn } from '@/lib/cn';

const TEXT: Record<RuneStatus, string> = { answered: 'answered', skipped: 'skipped', current: 'current question', upcoming: 'not asked yet' };

function Rune({ i, status }: { i: number; status: RuneStatus }) {
  const lit = status === 'answered';
  return (
    <svg viewBox="-12 -12 24 24" width={30} height={30} aria-hidden="true" className={cn(status === 'current' && 'pulse-opacity')}>
      <circle r="11" fill={lit ? 'rgba(142,24,36,0.55)' : 'rgba(0,0,0,0.5)'} stroke={status === 'upcoming' ? '#6a5a58' : '#ff5a67'} strokeWidth={status === 'current' ? 1.8 : 1.2} strokeDasharray={status === 'skipped' ? '3 2' : undefined} />
      <path d={glyphPath(i)} fill="none" stroke={lit ? '#fff' : status === 'upcoming' ? '#6a5a58' : '#ff8a93'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" transform="scale(.8)" />
      {status === 'skipped' && <path d="M-9 9L9 -9" stroke="#ff8a93" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  );
}

export function ProgressRunes({ qa, plannedTotal }: { qa: QaEntry[]; plannedTotal: number }) {
  const slots = runeSlots(qa, plannedTotal);
  return (
    <div>
      <p className="mb-2 font-label text-sm font-semibold tracking-wide text-ash" aria-live="polite">
        {progressLabel(qa, plannedTotal)}
      </p>
      <ol className="flex flex-wrap gap-1.5" aria-label="Trial progress">
        {slots.map((st, i) => (
          <li key={i} className="inline-flex">
            <Rune i={i} status={st} />
            <span className="sr-only">
              Question {i + 1}: {TEXT[st]}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

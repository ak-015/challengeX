import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import type { TrialExtension } from '@/lib/apiTypes';

export function ExtensionCard({ extension, busy, error, onContinue, onVerdict, onRetry }: {
  extension: TrialExtension;
  busy: boolean;
  error: { message: string; retryable: boolean } | null;
  onContinue: () => void;
  onVerdict: () => void;
  onRetry: () => void;
}) {
  return (
    <GlassPanel className="w-full space-y-5 p-6 sm:p-8" corners={false}>
      <div className="text-center">
        <p className="font-label text-xs font-bold uppercase tracking-wider text-[#ffd27a]">One more round</p>
        <Heading level={2} className="mt-2">A little more clarity</Heading>
        <p className="mx-auto mt-3 max-w-xl font-prose text-ash">
          I need {extension.additionalQuestions} more questions to understand your idea: {extension.reason}
        </p>
      </div>
      {error && (
        <p role="alert" className="flex flex-wrap items-center justify-center gap-3 rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
          {error.message}
          {error.retryable && <Button size="sm" variant="ghost" onClick={onRetry}><Icon name="retry" size={16} /> Retry</Button>}
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={onContinue} loading={busy} disabled={busy}>Continue</Button>
        <Button variant="quiet" onClick={onVerdict} disabled={busy}>Go to verdict now</Button>
      </div>
    </GlassPanel>
  );
}
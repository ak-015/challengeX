import type { ReactNode } from 'react';
import { Loader2, AlertTriangle, Inbox } from 'lucide-react';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-parchment-dim" role="status">
      <Loader2 className="h-8 w-8 animate-spin text-crimson-glow" aria-hidden />
      <p className="font-heading text-sm tracking-widest uppercase">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center" role="alert">
      <AlertTriangle className="h-10 w-10 text-crimson-glow" aria-hidden />
      <p className="font-narrative text-lg text-parchment max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="gothic-btn-ghost text-sm"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <Inbox className="h-10 w-10 text-parchment-faint" aria-hidden />
      <h3 className="font-heading text-lg text-parchment">{title}</h3>
      <p className="font-narrative text-parchment-dim max-w-md">{message}</p>
      {action}
    </div>
  );
}

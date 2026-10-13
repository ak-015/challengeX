import { useEffect, useRef } from 'react';
import { Button } from './Button';
import { GlassPanel } from './GlassPanel';
import { Heading } from './Heading';

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', busy, error, onConfirm, onCancel }: { title: string; message: string; confirmLabel?: string; busy?: boolean; error?: string | null; onConfirm: () => void; onCancel: () => void }) {
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="cd-h" aria-describedby="cd-m">
      <button type="button" aria-label="Cancel" className="absolute inset-0 bg-black/80" onClick={busy ? undefined : onCancel} />
      <GlassPanel className="relative z-10 w-full max-w-sm space-y-4 p-6 text-center">
        <Heading level={3} id="cd-h">{title}</Heading>
        <p id="cd-m" className="font-prose text-ash-dim">{message}</p>
        {error && <p role="alert" className="text-sm text-crimson-text">{error}</p>}
        <div className="flex justify-center gap-3">
          <Button ref={cancel} variant="quiet" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>{confirmLabel}</Button>
        </div>
      </GlassPanel>
    </div>
  );
}

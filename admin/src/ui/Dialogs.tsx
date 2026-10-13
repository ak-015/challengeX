import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';

/** Delete-style confirmation: the button stays disabled until the exact phrase is typed. */
export function TypeToConfirmDialog({ title, message, phrase, confirmLabel = 'Delete', busy, error, onConfirm, onCancel }: { title: string; message: ReactNode; phrase: string; confirmLabel?: string; busy?: boolean; error?: string | null; onConfirm: () => void; onCancel: () => void }) {
  const [typed, setTyped] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const ok = typed.trim().toLowerCase() === phrase.trim().toLowerCase();
  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="ttc-h" aria-describedby="ttc-m">
      <button type="button" aria-label="Cancel" className="absolute inset-0 bg-black/80" onClick={busy ? undefined : onCancel} />
      <GlassPanel className="relative z-10 w-full max-w-md space-y-4 p-6">
        <Heading level={3} id="ttc-h">
          {title}
        </Heading>
        <div id="ttc-m" className="font-prose text-ash-dim">
          {message}
        </div>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (ok && !busy) onConfirm();
          }}
        >
          <label htmlFor="ttc-in" className="block font-label text-sm text-ash">
            Type <strong className="break-all text-crimson-text">{phrase}</strong> to confirm
          </label>
          <input id="ttc-in" ref={input} className="field" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
          {error && (
            <p role="alert" className="text-sm text-crimson-text">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="quiet" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={!ok} loading={busy}>
              {confirmLabel}
            </Button>
          </div>
        </form>
      </GlassPanel>
    </div>
  );
}

/** Right-hand read-only drawer (full width on phones). */
export function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/70" onClick={onClose} />
      <aside className="glass scroll-thin absolute inset-y-0 right-0 w-full overflow-y-auto !rounded-none p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:w-[620px]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ash">{title}</h2>
          <button ref={close} type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-ash" aria-label="Close details" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

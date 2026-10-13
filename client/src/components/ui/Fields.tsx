import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Shared {
  label: string;
  error?: string | null;
  hint?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, Shared & InputHTMLAttributes<HTMLInputElement> & { trailing?: ReactNode }>(function TextField(
  { label, error, hint, trailing, className, id, ...rest },
  ref,
) {
  const auto = useId();
  const fid = id ?? auto;
  const describedBy = [error ? `${fid}-err` : null, hint ? `${fid}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1 block font-label text-sm font-semibold tracking-wide text-ash">
        {label}
      </label>
      <div className="relative">
        <input ref={ref} id={fid} className={cn('field', trailing ? 'pr-12' : undefined)} aria-invalid={error ? true : undefined} aria-describedby={describedBy} {...rest} />
        {trailing && <div className="absolute right-0 top-0 flex h-full items-center">{trailing}</div>}
      </div>
      {hint && (
        <p id={`${fid}-hint`} className="mt-1 text-sm text-ash-dim">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fid}-err`} role="alert" className="mt-1 text-sm text-crimson-text">
          {error}
        </p>
      )}
    </div>
  );
});

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  Shared & TextareaHTMLAttributes<HTMLTextAreaElement> & { counter?: { value: number; max: number; min?: number } }
>(function TextAreaField({ label, error, hint, counter, className, id, ...rest }, ref) {
  const auto = useId();
  const fid = id ?? auto;
  const describedBy = [error ? `${fid}-err` : null, hint ? `${fid}-hint` : null, counter ? `${fid}-count` : null].filter(Boolean).join(' ') || undefined;
  const over = counter ? counter.value > counter.max : false;
  return (
    <div className={className}>
      <label htmlFor={fid} className="mb-1 block font-label text-sm font-semibold tracking-wide text-ash">
        {label}
      </label>
      <textarea ref={ref} id={fid} className="field resize-y" aria-invalid={error || over ? true : undefined} aria-describedby={describedBy} {...rest} />
      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {hint && (
            <p id={`${fid}-hint`} className="text-sm text-ash-dim">
              {hint}
            </p>
          )}
          {error && (
            <p id={`${fid}-err`} role="alert" className="text-sm text-crimson-text">
              {error}
            </p>
          )}
        </div>
        {counter && (
          <p id={`${fid}-count`} className={cn('shrink-0 font-label text-xs', over ? 'text-crimson-text' : 'text-ash-dim')}>
            {counter.value}/{counter.max}
          </p>
        )}
      </div>
    </div>
  );
});

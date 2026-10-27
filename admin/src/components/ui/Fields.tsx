import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
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

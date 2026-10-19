import { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface FieldShellProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
}

export function FieldShell({ label, htmlFor, hint, error, children, required }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-heading text-parchment-dim">
        {label}
        {required && <span className="text-crimson-glow ml-1" aria-hidden>*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-parchment-faint">{hint}</p>}
      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
}

/**
 * forwardRef so react-hook-form's register() can attach its ref (and so any
 * consumer can focus/measure the underlying input).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, id, className, required, ...rest },
  ref,
) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <input
        ref={ref}
        id={inputId}
        className={clsx('gothic-input', error && 'border-red-700', className)}
        aria-invalid={!!error || undefined}
        required={required}
        {...rest}
      />
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  id?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id, className, required, ...rest },
  ref,
) {
  const inputId = id ?? (label ? `ta-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
  if (!label) {
    // External <label htmlFor> provided by the caller (accessibility preserved).
    return (
      <div className="space-y-1.5">
        <textarea
          ref={ref}
          id={inputId}
          className={clsx('gothic-input resize-y min-h-[120px]', error && 'border-red-700', className)}
          aria-invalid={!!error || undefined}
          required={required}
          {...rest}
        />
        {hint && !error && <p className="text-xs text-parchment-faint">{hint}</p>}
        {error && (
          <p className="text-xs text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
  return (
    <FieldShell label={label} htmlFor={inputId as string} hint={hint} error={error} required={required}>
      <textarea
        ref={ref}
        id={inputId}
        className={clsx('gothic-input resize-y min-h-[120px]', error && 'border-red-700', className)}
        aria-invalid={!!error || undefined}
        required={required}
        {...rest}
      />
    </FieldShell>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, id, className, children, required, ...rest },
  ref,
) {
  const inputId = id ?? `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <FieldShell label={label} htmlFor={inputId} hint={hint} error={error} required={required}>
      <select ref={ref} id={inputId} className={clsx('gothic-input', className)} required={required} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
});

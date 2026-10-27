import type { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger';
  loading?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', loading, children, className, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={clsx(
        'ornate-button inline-flex items-center justify-center gap-2 font-heading uppercase tracking-widest text-sm rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3',
        variant === 'primary' &&
          'bg-crimson hover:bg-crimson-glow text-white border border-crimson-glow/40 shadow-crimson-sm hover:shadow-crimson-md',
        variant === 'ghost' &&
          'bg-transparent hover:bg-crimson-soft text-parchment-dim hover:text-parchment border border-[var(--border-subtle)] hover:border-[var(--border-visible)]',
        variant === 'danger' &&
          'bg-transparent hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-red-900/50 hover:border-red-700',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

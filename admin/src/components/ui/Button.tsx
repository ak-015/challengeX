import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'ghost' | 'quiet' | 'danger';
type Size = 'md' | 'sm';

const variantClass: Record<Variant, string> = { primary: '', ghost: 'btn-ghost', quiet: 'btn-quiet', danger: 'btn-danger' };
const cls = (v: Variant, s: Size, extra?: string) => cn('btn', variantClass[v], s === 'sm' && 'btn-sm', extra);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner, sets aria-busy and blocks clicks (prevents double submit). */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, disabled, className, children, type = 'button', onClick, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cls(variant, size, className)}
      disabled={disabled}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? (e) => e.preventDefault() : onClick}
      {...rest}
    >
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
});

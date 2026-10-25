import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Apple, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '@/hooks/useToast';

/** Wordmark + tagline + ornamental rule that opens every gate window. */
export function AuthTitle({ subtitle }: { subtitle: ReactNode }) {
  return (
    <div className="text-center">
      <Link to="/" className="font-display text-[40px] leading-none tracking-wide text-parchment [text-shadow:0_0_22px_rgba(229,9,32,0.6)]">
        CHALLENGE<span className="text-crimson-glow">X</span>
      </Link>
      <p className="mt-3 font-heading text-[11px] uppercase leading-relaxed tracking-[0.22em] text-parchment-dim">{subtitle}</p>
      <Ornament className="mt-4" />
    </div>
  );
}

export function Ornament({ className = '' }: { className?: string }) {
  return (
    <div className={clsx('flex items-center justify-center gap-2.5', className)} aria-hidden>
      <span className="h-px w-24 bg-gradient-to-r from-transparent to-crimson/80" />
      <svg width="46" height="10" viewBox="0 0 46 10" fill="#e50920">
        <path d="M0 5 L4 1.5 L8 5 L4 8.5Z" opacity=".6" />
        <path d="M17 5 L23 0 L29 5 L23 10Z" />
        <path d="M38 5 L42 1.5 L46 5 L42 8.5Z" opacity=".6" />
      </svg>
      <span className="h-px w-24 bg-gradient-to-l from-transparent to-crimson/80" />
    </div>
  );
}

interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  error?: string;
  /** element rendered at the right edge (e.g. a show/hide eye) */
  trailing?: ReactNode;
}

/** Dark gothic input with a leading icon — works with react-hook-form's register(). */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { icon: Icon, error, trailing, className, ...rest },
  ref,
) {
  return (
    <div>
      <div className={clsx('auth-field', error && 'is-error')}>
        <Icon className="h-[17px] w-[17px] shrink-0 text-crimson-glow" aria-hidden />
        <input ref={ref} className={clsx('auth-input', className)} aria-invalid={error ? true : undefined} {...rest} />
        {trailing}
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-[11px] text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});

export function AuthButton({
  loading,
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button className={clsx('auth-cta', className)} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : children}
    </button>
  );
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-md border border-red-800/60 bg-red-950/50 px-3 py-2.5 text-[12px] text-red-300">
      {children}
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/** "OR SIGN IN WITH" + Google / Apple. The backend has no OAuth yet, so these say so plainly. */
export function SocialRow({ verb = 'SIGN IN' }: { verb?: string }) {
  const { push } = useToast();
  const soon = (name: string) => () => push('info', `${name} sign-in isn't available yet — please use your email.`);
  return (
    <div>
      <div className="flex items-center gap-3 font-heading text-[10px] uppercase tracking-[0.22em] text-parchment-faint" aria-hidden>
        <span className="h-px flex-1 bg-[var(--border-subtle)]" />
        OR {verb} WITH
        <span className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <button type="button" onClick={soon('Google')} className="auth-social" title="Coming soon">
          <GoogleG /> Google
        </button>
        <button type="button" onClick={soon('Apple')} className="auth-social" title="Coming soon">
          <Apple className="h-[18px] w-[18px]" aria-hidden /> Apple
        </button>
      </div>
    </div>
  );
}

export function AuthLegal({
  onPrivacy,
  onTerms,
}: {
  onPrivacy?: () => void;
  onTerms?: () => void;
} = {}) {
  return (
    <div className="text-center font-narrative text-[10.5px] leading-relaxed text-parchment-faint">
      <p>© 2026 ChallengeX. All rights reserved.</p>
      <p className="mt-0.5">
        <button
          type="button"
          onClick={onPrivacy}
          className={clsx('hover:text-parchment-dim', !onPrivacy && 'text-parchment-faint cursor-not-allowed')}
          disabled={!onPrivacy}
        >
          Privacy Policy
        </button>
        <span className="mx-2 text-crimson/60">|</span>
        <button
          type="button"
          onClick={onTerms}
          className={clsx('hover:text-parchment-dim', !onTerms && 'text-parchment-faint cursor-not-allowed')}
          disabled={!onTerms}
        >
          Terms of Service
        </button>
        <span className="mx-2 text-crimson/60">|</span>
        <a href="mailto:support@challengex.app" className="hover:text-parchment-dim">Support</a>
      </p>
    </div>
  );
}

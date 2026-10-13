import { useEffect, useRef, useState, type FormEvent } from 'react';
import { OtpInput } from './OtpInput';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Fields';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Heading } from '@/components/ui/Heading';
import { Icon } from '@/components/ui/Icon';
import { useCountdown } from '@/hooks/useCountdown';
import { auth } from '@/lib/endpoints';
import { ApiError, friendlyMessage } from '@/lib/errors';
import { formatMs } from '@/lib/format';
import { passwordStrength } from '@/lib/password';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/authStore';

type View = 'login' | 'signup' | 'otp' | 'forgot' | 'reset';
const OTP_TTL = 10 * 60_000;
const RESEND_COOLDOWN = 60_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthWindow({ onAuthed }: { onAuthed: () => void }) {
  const notice = useAuth((s) => s.notice);
  const clearNotice = useAuth((s) => s.clearNotice);
  const setSession = useAuth((s) => s.setSession);

  const [view, setView] = useState<View>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [purpose, setPurpose] = useState<'signup' | 'reset'>('signup');
  const busyRef = useRef(false);

  const expiresIn = useCountdown(expiresAt);
  const resendIn = useCountdown(resendAt);
  const strength = passwordStrength(view === 'reset' ? newPassword : password);

  useEffect(() => {
    setError(null);
    setFieldErr({});
  }, [view]);

  const run = async (fn: () => Promise<void>) => {
    if (busyRef.current) return; // double-submit impossible
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setInfo(null);
    clearNotice();
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMAIL_NOT_VERIFIED') {
        const em = (e.extra?.email as string | undefined) ?? email;
        setEmail(em);
        setPurpose('signup');
        setCode('');
        setExpiresAt(Date.now() + OTP_TTL);
        setResendAt(Date.now() + RESEND_COOLDOWN);
        setInfo('Your email is not verified yet. We sent you a fresh code.');
        setView('otp');
      } else {
        setError(friendlyMessage(e));
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const validate = (fields: Record<string, string | null>): boolean => {
    const errs: Record<string, string> = {};
    for (const [k, v] of Object.entries(fields)) if (v) errs[k] = v;
    setFieldErr(errs);
    return Object.keys(errs).length === 0;
  };
  const emailErr = !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address.' : null;

  const startOtp = (p: 'signup' | 'reset', msg: string) => {
    setPurpose(p);
    setCode('');
    setExpiresAt(Date.now() + OTP_TTL);
    setResendAt(Date.now() + RESEND_COOLDOWN);
    setInfo(msg);
  };

  const onLogin = (e: FormEvent) => {
    e.preventDefault();
    if (!validate({ email: emailErr, password: password ? null : 'Enter your password.' })) return;
    void run(async () => {
      const r = await auth.login({ email: email.trim(), password });
      setSession(r.token, r.user);
      onAuthed();
    });
  };
  const onSignup = (e: FormEvent) => {
    e.preventDefault();
    if (!validate({ name: name.trim() ? null : 'Tell us what to call you.', email: emailErr, password: password.length >= 8 ? null : 'Use at least 8 characters.' })) return;
    void run(async () => {
      await auth.signup({ email: email.trim(), password, displayName: name.trim() });
      startOtp('signup', `We sent a 6-digit code to ${email.trim()}.`);
      setView('otp');
    });
  };
  const onVerify = (e: FormEvent) => {
    e.preventDefault();
    if (!validate({ code: code.length === 6 ? null : 'Enter all 6 digits.' })) return;
    void run(async () => {
      if (purpose === 'signup') {
        const r = await auth.verifyOtp({ email: email.trim(), code });
        setSession(r.token, r.user);
        onAuthed();
      }
    });
  };
  const onForgot = (e: FormEvent) => {
    e.preventDefault();
    if (!validate({ email: emailErr })) return;
    void run(async () => {
      await auth.forgot({ email: email.trim() });
      startOtp('reset', `If that account exists, we sent a code to ${email.trim()}.`);
      setNewPassword('');
      setView('reset');
    });
  };
  const onReset = (e: FormEvent) => {
    e.preventDefault();
    if (!validate({ code: code.length === 6 ? null : 'Enter all 6 digits.', newPassword: newPassword.length >= 8 ? null : 'Use at least 8 characters.' })) return;
    void run(async () => {
      await auth.reset({ email: email.trim(), code, newPassword });
      setPassword('');
      setCode('');
      setView('login');
      setInfo('Password updated. Sign in with your new password.');
    });
  };
  const onResend = () =>
    void run(async () => {
      await auth.resendOtp({ email: email.trim(), purpose });
      setCode('');
      setExpiresAt(Date.now() + OTP_TTL);
      setResendAt(Date.now() + RESEND_COOLDOWN);
      setInfo('A new code is on its way.');
    });

  const pwTrailing = (
    <button type="button" className="inline-flex h-11 w-11 items-center justify-center text-ash" aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw} onClick={() => setShowPw((s) => !s)}>
      <Icon name={showPw ? 'eyeOff' : 'eye'} size={20} />
    </button>
  );
  const strengthBar = (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded', i <= strength.score ? 'bg-crimson-text' : 'bg-[#3a2a2c]')} />
        ))}
      </div>
      <p className="mt-1 text-sm text-ash-dim">
        Strength: <strong className="text-ash">{strength.label}</strong>. {strength.tip}
      </p>
    </div>
  );

  const tabs = view === 'login' || view === 'signup';

  return (
    <GlassPanel className="w-full max-w-md p-5 sm:p-7" aria-label="Sign in to the realm">
      <div className="mb-4 text-center">
        <Heading level={2}>{view === 'otp' ? 'Verify your email' : view === 'forgot' || view === 'reset' ? 'Reclaim your access' : 'Enter the Realm'}</Heading>
      </div>

      {tabs && (
        <div role="tablist" aria-label="Sign in or sign up" className="mb-5 grid grid-cols-2 gap-1 rounded-md border border-[rgba(225,29,46,0.5)] p-1">
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={view === t}
              onClick={() => setView(t)}
              className={cn('min-h-[44px] rounded font-label text-sm font-bold uppercase tracking-widest', view === t ? 'bg-crimson-btn text-white' : 'text-ash hover:bg-[rgba(225,29,46,0.15)]')}
            >
              {t === 'login' ? 'Login' : 'Sign up'}
            </button>
          ))}
        </div>
      )}

      <div aria-live="assertive" className="min-h-0">
        {notice && !error && <p className="mb-3 rounded border border-crimson bg-[#2a0408] p-3 text-sm text-ash">{notice}</p>}
        {error && (
          <p role="alert" className="mb-3 flex gap-2 rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
            <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-crimson-text" /> <span>{error}</span>
          </p>
        )}
        {info && !error && <p role="status" className="mb-3 rounded border border-[rgba(185,176,168,0.5)] bg-[rgba(255,255,255,0.04)] p-3 text-sm text-ash">{info}</p>}
      </div>

      {view === 'login' && (
        <form onSubmit={onLogin} noValidate className="space-y-4">
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErr.email} />
          <TextField label="Password" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErr.password} trailing={pwTrailing} />
          <Button type="submit" className="w-full" loading={busy}>
            Enter
          </Button>
          <button type="button" className="mx-auto block min-h-[44px] font-label text-sm text-crimson-text underline" onClick={() => setView('forgot')}>
            Forgot password?
          </button>
        </form>
      )}

      {view === 'signup' && (
        <form onSubmit={onSignup} noValidate className="space-y-4">
          <TextField label="Name" autoComplete="name" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} error={fieldErr.name} />
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErr.email} />
          <div>
            <TextField label="Password" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErr.password} trailing={pwTrailing} />
            {strengthBar}
          </div>
          <Button type="submit" className="w-full" loading={busy}>
            Create account
          </Button>
        </form>
      )}

      {view === 'otp' && (
        <form onSubmit={onVerify} noValidate className="space-y-4">
          <p className="text-center font-prose text-ash-dim">Enter the 6-digit code we sent to <strong className="text-ash">{email}</strong>.</p>
          <OtpInput value={code} onChange={setCode} autoFocus disabled={busy} invalid={!!fieldErr.code || !!error} />
          {fieldErr.code && <p role="alert" className="text-center text-sm text-crimson-text">{fieldErr.code}</p>}
          <p className="text-center font-label text-sm text-ash-dim" aria-live="off">
            {expiresIn > 0 ? <>Code expires in <span className="text-ash">{formatMs(expiresIn)}</span></> : 'This code has expired. Request a new one.'}
          </p>
          <Button type="submit" className="w-full" loading={busy} disabled={expiresIn === 0}>
            Verify
          </Button>
          <div className="text-center">
            <Button type="button" variant="quiet" size="sm" onClick={onResend} disabled={busy || resendIn > 0}>
              {resendIn > 0 ? `Resend code in ${formatMs(resendIn)}` : 'Resend code'}
            </Button>
          </div>
          <button type="button" className="mx-auto block min-h-[44px] font-label text-sm text-crimson-text underline" onClick={() => setView('login')}>
            Back to login
          </button>
        </form>
      )}

      {view === 'forgot' && (
        <form onSubmit={onForgot} noValidate className="space-y-4">
          <p className="font-prose text-ash-dim">Enter your email and we will send a code to reset your password.</p>
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErr.email} autoFocus />
          <Button type="submit" className="w-full" loading={busy}>
            Send code
          </Button>
          <button type="button" className="mx-auto block min-h-[44px] font-label text-sm text-crimson-text underline" onClick={() => setView('login')}>
            Back to login
          </button>
        </form>
      )}

      {view === 'reset' && (
        <form onSubmit={onReset} noValidate className="space-y-4">
          <p className="text-center font-prose text-ash-dim">Enter the code sent to <strong className="text-ash">{email}</strong> and choose a new password.</p>
          <OtpInput value={code} onChange={setCode} autoFocus disabled={busy} invalid={!!fieldErr.code} />
          {fieldErr.code && <p role="alert" className="text-center text-sm text-crimson-text">{fieldErr.code}</p>}
          <p className="text-center font-label text-sm text-ash-dim">{expiresIn > 0 ? <>Code expires in <span className="text-ash">{formatMs(expiresIn)}</span></> : 'This code has expired. Request a new one.'}</p>
          <div>
            <TextField label="New password" type={showPw ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={fieldErr.newPassword} trailing={pwTrailing} />
            {strengthBar}
          </div>
          <Button type="submit" className="w-full" loading={busy}>
            Reset password
          </Button>
          <div className="text-center">
            <Button type="button" variant="quiet" size="sm" onClick={onResend} disabled={busy || resendIn > 0}>
              {resendIn > 0 ? `Resend code in ${formatMs(resendIn)}` : 'Resend code'}
            </Button>
          </div>
        </form>
      )}
    </GlassPanel>
  );
}

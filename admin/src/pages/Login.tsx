import { useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../adminApi';
import { RuneLogo } from '../components/art/RuneLogo';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Fields';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Heading } from '../components/ui/Heading';
import { Icon } from '../components/ui/Icon';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ApiError, friendlyMessage } from '../lib/errors';
import { APP_URL } from '../env';
import { useAuth } from '../store/authStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sign in with the same account as the main app (POST /api/auth/login). Only admins get past this screen. */
export default function Login() {
  useDocumentTitle('Sign in');
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, notice, setSession, clearNotice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const lock = useRef(false);
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  if (token && user?.role === 'admin') return <Navigate to={from} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) errs.email = 'Enter a valid email address.';
    if (!password) errs.password = 'Enter your password.';
    setFieldErr(errs);
    if (Object.keys(errs).length || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    clearNotice();
    try {
      const r = await adminApi.login({ email: email.trim(), password });
      if (r.user.role !== 'admin') {
        // Never keep the session of a non-admin in this app.
        setError('This account is not an administrator.');
        return;
      }
      setSession(r.token, r.user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED'
          ? 'This email is not verified yet. Verify it in the main app first, then come back.'
          : friendlyMessage(err),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-4">
      <GlassPanel className="w-full max-w-md space-y-5 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <RuneLogo size={56} />
          <Heading level={2}>Admin</Heading>
          <p className="font-prose text-ash-dim">Sign in with the administrator account created by the server seed. Only administrators can enter.</p>
        </div>
        <div aria-live="assertive">
          {notice && !error && <p className="rounded border border-crimson bg-[#2a0408] p-3 text-sm text-ash">{notice}</p>}
          {error && (
            <p role="alert" className="flex gap-2 rounded border border-[#ff6b76] bg-[#2a0408] p-3 text-sm text-ash">
              <Icon name="warning" size={18} className="mt-0.5 shrink-0 text-crimson-text" /> <span>{error}</span>
            </p>
          )}
        </div>
        <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErr.email} autoFocus />
          <TextField
            label="Password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErr.password}
            trailing={
              <button type="button" className="inline-flex h-11 w-11 items-center justify-center text-ash" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((s) => !s)}>
                <Icon name={show ? 'eyeOff' : 'eye'} size={20} />
              </button>
            }
          />
          <Button type="submit" className="w-full" loading={busy}>
            Enter
          </Button>
        </form>
        {APP_URL && (
          <p className="text-center font-prose text-sm text-ash-dim">
            No account yet? Create it in <a className="text-crimson-text underline" href={APP_URL}>the main app</a>.
          </p>
        )}
      </GlassPanel>
    </main>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { RealmScene } from '@/components/realm/RealmScene';

type Stage = 'request' | 'reset';

export function ForgotPasswordPage() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = async () => {
    setBusy(true);
    setError(null);
    try {
      await authService.forgot(email);
      push('info', 'If the account exists, a reset code was sent.');
      setStage('reset');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setError(null);
    try {
      await authService.reset(email, code, newPassword);
      push('success', 'Password updated. Sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      <RealmScene scene="secondary" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/70 to-background/95" aria-hidden />

      <div className="relative z-10 w-full max-w-md">
        <div className="gothic-panel p-8 shadow-crimson-sm">
          <div className="text-center mb-8">
            <Link to="/" className="font-display text-2xl tracking-widest text-parchment">CHALLENGE<span className="text-crimson-glow">X</span></Link>
            <p className="mt-2 font-narrative text-parchment-dim italic">Reclaim your passage.</p>
          </div>

          {error && (
            <div role="alert" className="mb-5 rounded-md border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {stage === 'request' ? (
            <div className="space-y-5">
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={request} loading={busy} disabled={!email} className="w-full">
                Send Reset Code
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <Input
                label="Verification Code"
                inputMode="numeric"
                required
                hint="6 digits sent to your email"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <Input
                label="New Password"
                type="password"
                autoComplete="new-password"
                required
                hint="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Button onClick={reset} loading={busy} disabled={code.length !== 6 || newPassword.length < 8} className="w-full">
                Reset Password
              </Button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-parchment-dim">
            Remembered it?{' '}
            <Link to="/login" className="text-crimson-glow underline underline-offset-4">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Mail } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api';
import { authService } from '@/services/auth';
import { AuthGate } from '@/components/auth/AuthGate';
import { AuthButton, AuthError, AuthField, AuthLegal, AuthTitle } from '@/components/auth/AuthParts';

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
    <AuthGate height={600}>
      <div className="flex min-h-full flex-col justify-between gap-5">
        <AuthTitle subtitle={<>Reclaim your<br />passage to the realm</>} />

        <div className="space-y-3.5">
          {error && <AuthError>{error}</AuthError>}
          {stage === 'request' ? (
            <>
              <AuthField icon={Mail} type="email" autoComplete="email" placeholder="Email address" aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <AuthButton onClick={request} loading={busy} disabled={!email}>
                Send reset code
              </AuthButton>
            </>
          ) : (
            <>
              <AuthField
                icon={KeyRound}
                inputMode="numeric"
                placeholder="6-digit code from your email"
                aria-label="Verification code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              />
              <AuthField
                icon={Lock}
                type="password"
                autoComplete="new-password"
                placeholder="New password (8+ characters)"
                aria-label="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <AuthButton onClick={reset} loading={busy} disabled={code.length !== 6 || newPassword.length < 8}>
                Reset password
              </AuthButton>
            </>
          )}
        </div>

        <p className="text-center font-narrative text-[13px] text-parchment-dim">
          Remembered it?{' '}
          <Link to="/login" className="text-crimson-glow hover:text-parchment underline-offset-4 hover:underline">
            Return to the gate →
          </Link>
        </p>

        <AuthLegal />
      </div>
    </AuthGate>
  );
}

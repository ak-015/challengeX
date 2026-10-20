import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api';
import { authService } from '@/services/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { RealmScene } from '@/components/realm/RealmScene';

const registerSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Name is required').max(50, 'Max 50 characters'),
    email: z.string().trim().toLowerCase().email('Enter a valid email').max(254),
    password: z
      .string()
      .min(8, 'Must be at least 8 characters')
      .max(72, 'Must be at most 72 characters'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: 'You must accept the terms to continue' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { loginWithToken, user } = useAuth();
  const { push } = useToast();
  const location = useLocation();
  const verifyEmail = (location.state as { verifyEmail?: string } | null)?.verifyEmail;

  const [stage, setStage] = useState<'form' | 'verify'>(verifyEmail ? 'verify' : 'form');
  const [pendingEmail, setPendingEmail] = useState(verifyEmail ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  useEffect(() => {
    if (verifyEmail) setPendingEmail(verifyEmail);
  }, [verifyEmail]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await authService.signup({
        email: values.email,
        password: values.password,
        displayName: values.displayName,
      });
      setPendingEmail(values.email);
      setStage('verify');
      push('info', 'Verification code sent. Check your inbox.');
    } catch (err) {
      setServerError(errorMessage(err));
    }
  });

  const verify = async () => {
    if (otp.length !== 6 || !pendingEmail || verifying) return;
    setVerifying(true);
    try {
      const r = await authService.verifyOtp(pendingEmail, otp);
      push('success', 'Account verified. Welcome to ChallengeX.');
      // Setting the session triggers the <Navigate> below, which sends the new
      // member through the gate.
      loginWithToken(r.token, r.user);
    } catch (err) {
      push('error', errorMessage(err));
      setVerifying(false);
    }
  };

  const resend = async () => {
    try {
      await authService.resendOtp(pendingEmail, 'signup');
      push('info', 'If the account exists, a new code was sent.');
    } catch (err) {
      push('error', errorMessage(err));
    }
  };

  if (user) return <Navigate to="/gate" replace />;

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10">
      <RealmScene scene="secondary" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/70 to-background/95" aria-hidden />

      <div className="relative z-10 w-full max-w-md">
        <div className="gothic-panel p-8 shadow-crimson-sm">
          <div className="text-center mb-8">
            <Link to="/" className="font-display text-2xl tracking-widest text-parchment">CHALLENGE<span className="text-crimson-glow">X</span></Link>
            <p className="mt-2 font-narrative text-parchment-dim italic">Forge your identity in the realm.</p>
          </div>

          {stage === 'form' ? (
            <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label="Create account">
              {serverError && (
                <div role="alert" className="rounded-md border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                  {serverError}
                </div>
              )}
              <Input label="Full Name" autoComplete="name" required error={errors.displayName?.message} {...register('displayName')} />
              <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register('email')} />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  hint="At least 8 characters"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-[42px] text-parchment-faint hover:text-parchment"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Input
                label="Confirm Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
              <label className="flex items-start gap-3 text-sm text-parchment-dim cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-[var(--border-subtle)] bg-transparent accent-crimson"
                  {...register('acceptTerms')}
                />
                <span>
                  I accept the{' '}
                  <Link to="/terms" className="text-crimson-glow underline underline-offset-2">Terms of Service</Link>
                  {' '}and{' '}
                  <Link to="/privacy" className="text-crimson-glow underline underline-offset-2">Privacy Policy</Link>.
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="text-xs text-red-400" role="alert">{errors.acceptTerms.message}</p>
              )}
              <Button type="submit" loading={isSubmitting} className="w-full">Create Account</Button>
            </form>
          ) : (
            <div className="space-y-5" aria-label="Verify email">
              <p className="text-sm text-parchment-dim text-center">
                Enter the 6-digit code sent to <span className="text-parchment">{pendingEmail}</span>.
              </p>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                aria-label="Verification code"
                className="gothic-input tracking-[0.5em] text-center text-lg"
                placeholder="••••••"
              />
              <div className="flex gap-3">
                <Button onClick={verify} loading={verifying} disabled={otp.length !== 6} className="flex-1">
                  Verify &amp; Enter
                </Button>
                <Button variant="ghost" onClick={resend}>Resend</Button>
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-parchment-dim">
            Already have an account?{' '}
            <Link to="/login" className="text-crimson-glow underline underline-offset-4">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

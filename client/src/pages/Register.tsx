import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { errorMessage } from '@/services/api';
import { authService } from '@/services/auth';
import { AuthGate } from '@/components/auth/AuthGate';
import { AuthButton, AuthError, AuthField, AuthLegal, AuthTitle, SocialRow } from '@/components/auth/AuthParts';
import { LegalPopup } from '@/components/ui/LegalPopup';

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
  const [showLegal, setShowLegal] = useState<'privacy' | 'terms' | null>(null);
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

  const eye = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      className="text-parchment-faint hover:text-parchment"
      aria-label={showPassword ? 'Hide password' : 'Show password'}
    >
      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <AuthGate height={stage === 'form' ? 790 : 640}>
      <div className="flex min-h-full flex-col justify-between gap-4">
        <AuthTitle
          subtitle={
            stage === 'form' ? (
              <>
                Forge your identity
                <br />
                in the realm
              </>
            ) : (
              <>
                Speak the code
                <br />
                to pass the gate
              </>
            )
          }
        />

        {stage === 'form' ? (
          <form onSubmit={onSubmit} noValidate className="space-y-3" aria-label="Create account">
            {serverError && <AuthError>{serverError}</AuthError>}
            <AuthField icon={User} autoComplete="name" placeholder="Full name" aria-label="Full name" error={errors.displayName?.message} {...register('displayName')} />
            <AuthField icon={Mail} type="email" autoComplete="email" placeholder="Email address" aria-label="Email" error={errors.email?.message} {...register('email')} />
            <AuthField
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Password (8+ characters)"
              aria-label="Password"
              error={errors.password?.message}
              trailing={eye}
              {...register('password')}
            />
            <AuthField
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Confirm password"
              aria-label="Confirm password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <label className="flex cursor-pointer items-start gap-2.5 font-narrative text-[12.5px] leading-snug text-parchment-dim">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-[var(--border-subtle)] bg-transparent accent-crimson" {...register('acceptTerms')} />
              <span>
                I accept the{' '}
                <button
                  type="button"
                  onClick={() => setShowLegal('terms')}
                  className="text-crimson-glow underline underline-offset-2 hover:text-parchment"
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  onClick={() => setShowLegal('privacy')}
                  className="text-crimson-glow underline underline-offset-2 hover:text-parchment"
                >
                  Privacy Policy
                </button>.
              </span>
            </label>
            {errors.acceptTerms && (
              <p className="text-[11px] text-red-400" role="alert">
                {errors.acceptTerms.message}
              </p>
            )}
            <AuthButton type="submit" loading={isSubmitting}>
              Forge my account <ArrowRight className="h-4 w-4" aria-hidden />
            </AuthButton>
          </form>
        ) : (
          <div className="space-y-4" aria-label="Verify email">
            <p className="text-center font-narrative text-[13.5px] text-parchment-dim">
              Enter the 6-digit code sent to <span className="text-parchment">{pendingEmail}</span>.
            </p>
            <AuthField
              icon={KeyRound}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              aria-label="Verification code"
              placeholder="• • • • • •"
              className="text-center tracking-[0.5em]"
            />
            <div className="flex gap-3">
              <AuthButton onClick={verify} loading={verifying} disabled={otp.length !== 6}>
                Verify &amp; enter
              </AuthButton>
              <button type="button" onClick={resend} className="auth-social shrink-0 px-5">
                Resend
              </button>
            </div>
          </div>
        )}

        {stage === 'form' && <SocialRow verb="SIGN UP" />}

        <p className="text-center font-narrative text-[13px] text-parchment-dim">
          Already have an account?{' '}
          <Link to="/login" className="text-crimson-glow hover:text-parchment underline-offset-4 hover:underline">
            Sign in →
          </Link>
        </p>

        <AuthLegal
          onPrivacy={() => setShowLegal('privacy')}
          onTerms={() => setShowLegal('terms')}
        />
      </div>

      <LegalPopup
        isOpen={showLegal === 'privacy' || showLegal === 'terms'}
        onClose={() => setShowLegal(null)}
        kind={showLegal ?? 'privacy'}
      />
    </AuthGate>
  );
}

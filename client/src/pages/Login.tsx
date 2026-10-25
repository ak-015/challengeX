import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { errorMessage, ApiError } from '@/services/api';
import { AuthGate } from '@/components/auth/AuthGate';
import { AuthButton, AuthError, AuthField, AuthLegal, AuthTitle, SocialRow } from '@/components/auth/AuthParts';
import { LegalPopup } from '@/components/ui/LegalPopup';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showLegal, setShowLegal] = useState<'privacy' | 'terms' | null>(null);

  // Every sign-in passes through the gate unless the user was deep-linked somewhere specific.
  const from = (location.state as { from?: string } | null)?.from ?? '/gate';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      push('success', 'Welcome back to the realm.');
      // the <Navigate> below fires as soon as the session is set
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        // Backend already resent a code; send the user to the verify screen.
        navigate('/register', { state: { verifyEmail: values.email }, replace: true });
        return;
      }
      setServerError(errorMessage(err));
    }
  });

  if (user) return <Navigate to={from} replace />;

  return (
    <AuthGate height={712}>
      <div className="flex min-h-full flex-col justify-between gap-5">
        <AuthTitle subtitle={<>Enter your credentials<br />to enter the realm</>} />

        <form onSubmit={onSubmit} noValidate className="space-y-3.5" aria-label="Sign in">
          {serverError && <AuthError>{serverError}</AuthError>}
          <AuthField icon={User} type="email" autoComplete="email" placeholder="Email address" aria-label="Email" error={errors.email?.message} {...register('email')} />
          <AuthField
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Password"
            aria-label="Password"
            error={errors.password?.message}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-parchment-faint hover:text-parchment"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register('password')}
          />
          <div className="text-right">
            <Link to="/forgot" className="font-narrative text-[12px] text-crimson-glow hover:text-parchment hover:underline underline-offset-4">
              Forgot your password?
            </Link>
          </div>
          <AuthButton type="submit" loading={isSubmitting}>
            Enter the realm <ArrowRight className="h-4 w-4" aria-hidden />
          </AuthButton>
        </form>

        <SocialRow verb="SIGN IN" />

        <p className="text-center font-narrative text-[13px] text-parchment-dim">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-crimson-glow hover:text-parchment underline-offset-4 hover:underline">
            Create one now →
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

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { errorMessage, ApiError } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Form';
import { assets } from '@/utils/assets';
import { Embers, Fog } from '@/components/animations/Atmosphere';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? '/paths';

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
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        // Backend already resent a code; send the user to the verify screen.
        navigate('/register', { state: { verifyEmail: values.email }, replace: true });
        return;
      }
      setServerError(errorMessage(err));
    }
  });

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
      <img src={assets.realmSecondary} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/70 to-background/95" aria-hidden />
      <Embers count={14} />
      <Fog />

      <div className="relative z-10 w-full max-w-md">
        <div className="gothic-panel p-8 shadow-crimson-sm">
          <div className="text-center mb-8">
            <Link to="/" className="font-display text-2xl tracking-widest text-parchment">CHALLENGE<span className="text-crimson-glow">X</span></Link>
            <p className="mt-2 font-narrative text-parchment-dim italic">Return to the realm.</p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-5" aria-label="Sign in">
            {serverError && (
              <div role="alert" className="rounded-md border border-red-800/60 bg-red-950/40 px-4 py-3 text-sm text-red-300">
                {serverError}
              </div>
            )}
            <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register('email')} />
            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
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
            <Button type="submit" loading={isSubmitting} className="w-full">Sign In</Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs font-heading text-parchment-dim">
            <Link to="/forgot" className="hover:text-parchment underline underline-offset-4">Forgot password?</Link>
            <Link to="/register" className="hover:text-parchment underline underline-offset-4">Create account</Link>
          </div>

          <div className="mt-6 border-t border-[var(--border-subtle)] pt-4 flex justify-center gap-4 text-xs text-parchment-faint">
            <Link to="/privacy" className="hover:text-parchment-dim">Privacy</Link>
            <Link to="/terms" className="hover:text-parchment-dim">Terms</Link>
            <a href="mailto:support@challengex.app" className="hover:text-parchment-dim">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}

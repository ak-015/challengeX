import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight, Camera, Eye, EyeOff, KeyRound, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { errorMessage, setToken } from '@/services/api';
import { authService } from '@/services/auth';
import { uploadToCloudinary, uploadsService } from '@/services/shares';
import { AuthGate } from '@/components/auth/AuthGate';
import { AuthButton, AuthError, AuthField, AuthLegal, AuthTitle, SocialRow } from '@/components/auth/AuthParts';

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

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

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
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The preview URL is revoked whenever the file changes or the page closes.
  useEffect(() => {
    if (!avatar) return setAvatarPreview(null);
    const url = URL.createObjectURL(avatar);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  const pickAvatar = (file: File | undefined) => {
    setAvatarError(null);
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return setAvatarError('Use a JPG, PNG or WebP image.');
    if (file.size > AVATAR_MAX_BYTES) return setAvatarError('The image must be 2 MB or smaller.');
    setAvatar(file);
  };

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
      let account = r.user;
      if (avatar) {
        // Uploading needs a signed-in session, so it happens right after the email is verified. A failure never blocks sign-up.
        try {
          setToken(r.token);
          const uploaded = await uploadToCloudinary(await uploadsService.sign('avatar'), avatar);
          const saved = await uploadsService.saveAvatar(uploaded.secure_url, uploaded.public_id);
          account = { ...account, avatarUrl: saved.avatarUrl };
        } catch {
          push('info', 'Account created, but the avatar could not be uploaded. You can add it on your profile.');
        }
      }
      push('success', 'Account verified. Welcome to ChallengeX.');
      // Setting the session triggers the <Navigate> below, which sends the new member through the gate.
      loginWithToken(r.token, account);
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
    <AuthGate height={stage === 'form' ? 870 : 640}>
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label={avatar ? 'Change avatar' : 'Choose an avatar'}
                className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border-visible)] bg-black/40 text-parchment-faint hover:text-parchment"
              >
                {avatarPreview ? <img src={avatarPreview} alt="" className="h-full w-full object-cover" /> : <Camera className="h-5 w-5" aria-hidden />}
              </button>
              <div className="min-w-0 font-narrative text-[12.5px] text-parchment-dim">
                <button type="button" onClick={() => fileRef.current?.click()} className="text-crimson-glow underline underline-offset-2">
                  {avatar ? 'Change avatar' : 'Add an avatar (optional)'}
                </button>
                {avatar && (
                  <button type="button" onClick={() => { setAvatar(null); if (fileRef.current) fileRef.current.value = ''; }} className="ml-3 hover:text-parchment">
                    Remove
                  </button>
                )}
                <p className="text-[11px] text-parchment-faint">JPG, PNG or WebP, up to 2 MB</p>
                {avatarError && <p role="alert" className="text-[11px] text-red-400">{avatarError}</p>}
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Avatar image" onChange={(e) => pickAvatar(e.target.files?.[0])} />
            </div>
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
                <Link to="/terms" className="text-crimson-glow underline underline-offset-2">Terms of Service</Link> and{' '}
                <Link to="/privacy" className="text-crimson-glow underline underline-offset-2">Privacy Policy</Link>.
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

        <AuthLegal />
      </div>
    </AuthGate>
  );
}

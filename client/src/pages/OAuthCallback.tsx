import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '@/services/api';
import { authService } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Spinner } from '@/components/ui/States';

const ERROR_MESSAGES: Record<string, string> = {
  ACCOUNT_SUSPENDED: 'This account is suspended.',
  OAUTH_DENIED: 'Sign-in was cancelled.',
  GOOGLE_EMAIL_UNVERIFIED: 'Your Google email is not verified.',
  APPLE_EMAIL_UNVERIFIED: 'Your Apple email could not be verified.',
};

/**
 * Receives the result of the backend OAuth callback in the URL fragment (#access_token=... or #error=...),
 * removes it from the address bar, stores the session and loads the profile.
 */
export function OAuthCallbackPage() {
  const { loginWithToken } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get('access_token');
    const error = params.get('error');
    // Never leave the token in the address bar / browser history.
    window.history.replaceState(null, '', window.location.pathname);

    if (!token) {
      push('error', (error && ERROR_MESSAGES[error]) || 'Sign-in failed. Please try again.');
      navigate('/login', { replace: true });
      return;
    }

    (async () => {
      try {
        setToken(token);
        const r = await authService.me();
        loginWithToken(token, r.user);
        push('success', `Welcome, ${r.user.displayName}!`);
        navigate('/gate', { replace: true });
      } catch {
        setToken(null);
        push('error', 'Sign-in failed. Please try again.');
        navigate('/login', { replace: true });
      }
    })();
  }, [loginWithToken, navigate, push]);

  return (
    <div className="mx-auto max-w-3xl gothic-panel p-6 sm:p-8 text-center">
      <Spinner label="Completing sign-in…" />
    </div>
  );
}

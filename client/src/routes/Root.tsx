import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { auth } from '@/lib/endpoints';
import { installAuthExpiry } from '@/lib/api';
import { isAbort } from '@/lib/errors';
import { SmokeOverlay } from '@/components/scenes/SmokeOverlay';
import { Splash } from '@/components/ui/Splash';
import { useAuth } from '@/store/authStore';

let bootstrapped = false;

/** Root layout: installs the 401 handler once and verifies a stored token with GET /api/auth/me. */
export function Root() {
  const { token, user, setUser, setStatus, logout } = useAuth();

  useEffect(() => {
    if (!bootstrapped) {
      bootstrapped = true;
      installAuthExpiry();
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus('ready');
      return;
    }
    if (user) return;
    const ctrl = new AbortController();
    setStatus('checking');
    auth
      .me({ signal: ctrl.signal })
      .then((r) => {
        setUser(r.user);
        setStatus('ready');
      })
      .catch((e) => {
        if (isAbort(e)) return;
        // 401 is handled globally (logout). A network failure keeps the token and lets the user retry.
        setStatus('ready');
        if (!useAuth.getState().token) logout();
      });
    return () => ctrl.abort();
  }, [token, user, setUser, setStatus, logout]);

  return (
    <>
      <Outlet />
      <SmokeOverlay />
    </>
  );
}

/** Everything except the gate and public shares requires auth. */
export function RequireAuth() {
  const { token, user, status } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/" replace state={{ from: location.pathname }} />;
  if (!user) {
    return status === 'checking' || status === 'idle' ? <Splash label="Opening the gates…" /> : <Splash label="Reconnecting to the realm…" />;
  }
  return <Outlet />;
}

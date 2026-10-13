import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { adminApi } from './adminApi';
import { Button } from './components/ui/Button';
import { GlassPanel } from './components/ui/GlassPanel';
import { Heading } from './components/ui/Heading';
import { Spinner } from './components/ui/Spinner';
import { friendlyMessage, isAbort } from './lib/errors';
import { useAuth } from './store/authStore';

/**
 * Cosmetic guard: only an admin sees the panel. A non-admin who signs in sees "not an administrator".
 * The SERVER enforces every /api/admin call regardless (a non-admin gets 403).
 */
export function RequireAdmin() {
  const { token, user, setUser, logout } = useAuth();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (!token || user) return;
    const c = new AbortController();
    setError(null);
    adminApi
      .me({ signal: c.signal })
      .then((r) => setUser(r.user))
      .catch((e) => !isAbort(e) && setError(friendlyMessage(e))); // a 401 is handled globally (logout)
    return () => c.abort();
  }, [token, user, setUser, tries]);

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  if (!user) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-4">
        {error ? (
          <GlassPanel role="alert" className="max-w-md space-y-4 p-6 text-center">
            <p className="font-prose text-ash">{error}</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => setTries((t) => t + 1)}>Retry</Button>
              <Button variant="quiet" onClick={() => logout()}>Sign out</Button>
            </div>
          </GlassPanel>
        ) : (
          <p role="status" className="flex items-center gap-3 font-label text-ash"><Spinner /> Checking your access…</p>
        )}
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-4">
        <GlassPanel role="alert" className="max-w-md space-y-4 p-6 text-center">
          <Heading level={2}>Not an administrator</Heading>
          <p className="font-prose text-ash-dim">
            <strong className="text-ash">{user.email}</strong> does not have admin access. Admin rights come from the server&rsquo;s <code>ADMIN_EMAILS</code> list or from another admin.
          </p>
          <Button onClick={() => logout()}>Sign out</Button>
        </GlassPanel>
      </div>
    );
  }
  return <Outlet />;
}

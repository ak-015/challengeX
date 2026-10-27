import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/States';

/** Guards app routes: while the persisted token is being verified show a spinner;
 *  once resolved, unauthenticated visitors are sent to /login with a return path. */
export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (token && loading) return <Spinner label="Restoring your session…" />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

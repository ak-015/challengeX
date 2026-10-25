import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/States';

/** Guards app routes: while the persisted token is being verified show a spinner;
 *  once resolved, unauthenticated visitors are sent to the home page. */
export function ProtectedRoute({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, token, loading } = useAuth();

  if (token && loading) return <Spinner label="Restoring your session…" />;
  if (!user) return <Navigate to="/" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

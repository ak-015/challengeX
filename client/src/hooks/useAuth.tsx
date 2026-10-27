import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getToken, setToken, setUnauthorizedHandler } from '@/services/api';
import { authService } from '@/services/auth';
import type { User } from '@/types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithToken: (token: string, user: User) => void;
  logout: () => void;
  refresh: () => Promise<void>;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [loading, setLoading] = useState<boolean>(() => !!getToken());

  // Verify any persisted token on mount.
  useEffect(() => {
    if (!getToken()) return;
    let cancelled = false;
    authService
      .me()
      .then((r) => {
        if (!cancelled) setUser(r.user);
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null);
          setTokenState(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Global 401 handling.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setTokenState(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await authService.login(email, password);
    setToken(r.token);
    setTokenState(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const loginWithToken = useCallback((t: string, u: User) => {
    setToken(t);
    setTokenState(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const r = await authService.me();
      setUser(r.user);
    } catch {
      /* token invalid — already cleared by 401 handler */
    }
  }, []);

  const updateUser = useCallback((u: User) => setUser(u), []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      loading,
      login,
      loginWithToken,
      logout,
      refresh,
      updateUser,
    }),
    [
      user,
      token,
      loading,
      login,
      loginWithToken,
      logout,
      refresh,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

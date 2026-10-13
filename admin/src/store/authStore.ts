import { create } from 'zustand';
import { safeStorage } from '@/lib/storage';
import type { User } from '@/lib/apiTypes';

const TOKEN_KEY = 'cc.token';

interface AuthState {
  token: string | null;
  user: User | null;
  /** 'checking' while a stored token is being verified with GET /api/auth/me */
  status: 'idle' | 'checking' | 'ready';
  /** Message to show on the login screen after a forced logout (e.g. suspension). */
  notice: string | null;
  setSession: (token: string, user: User) => void;
  setUser: (user: User) => void;
  setStatus: (s: AuthState['status']) => void;
  logout: (notice?: string | null) => void;
  clearNotice: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  token: safeStorage.get(TOKEN_KEY),
  user: null,
  status: 'idle',
  notice: null,
  setSession: (token, user) => {
    safeStorage.set(TOKEN_KEY, token);
    set({ token, user, status: 'ready', notice: null });
  },
  setUser: (user) => set({ user }),
  setStatus: (status) => set({ status }),
  logout: (notice = null) => {
    safeStorage.remove(TOKEN_KEY);
    set({ token: null, user: null, status: 'ready', notice });
  },
  clearNotice: () => set({ notice: null }),
}));

export const getToken = (): string | null => useAuth.getState().token;

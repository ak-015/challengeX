import { api } from './api';
import type { AuthResponse, User } from '@/types/api';

interface SignupInput {
  email: string;
  password: string;
  displayName: string;
}

export const authService = {
  signup: (input: SignupInput) =>
    api.post<{ ok: boolean; email: string; message: string }>('/auth/signup', input, { auth: false }),

  verifyOtp: (email: string, code: string) =>
    api.post<AuthResponse>('/auth/verify-otp', { email, code }, { auth: false }),

  resendOtp: (email: string, purpose: 'signup' | 'reset' = 'signup') =>
    api.post<{ ok: boolean; message: string }>('/auth/resend-otp', { email, purpose }, { auth: false }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }, { auth: false }),

  forgot: (email: string) =>
    api.post<{ ok: boolean; message: string }>('/auth/forgot', { email }, { auth: false }),

  reset: (email: string, code: string, newPassword: string) =>
    api.post<{ ok: boolean }>('/auth/reset', { email, code, newPassword }, { auth: false }),

  me: () => api.get<{ user: User }>('/auth/me'),

  updateProfile: (displayName: string) => api.patch<{ user: User }>('/auth/me', { displayName }),

  /** Redirect the browser to the backend's Google OAuth authorization URL. */
  google: () => {
    window.location.replace(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'}/auth/oauth/google`);
  },

  /** Redirect the browser to the backend's Apple OAuth authorization URL. */
  apple: () => {
    window.location.replace(`${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'}/auth/oauth/apple`);
  },
};

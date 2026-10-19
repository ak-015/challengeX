import { api } from './api';
import type { AuthResponse, User } from '@/types/api';

export interface SignupInput {
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
};

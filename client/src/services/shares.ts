import { api } from './api';
import type { PublicShare, SignedUpload } from '@/types/api';

export const sharesService = {
  create: (input: { kind: 'verdict' | 'roadmap'; refId: string; pngUrl?: string | null; pdfUrl?: string | null }) =>
    api.post<{ slug: string }>('/shares', input),

  /** Public — no auth. */
  get: (slug: string) => api.get<PublicShare>(`/shares/${slug}`, { auth: false }),

  remove: (slug: string) => api.delete<{ ok: boolean }>(`/shares/${slug}`),
};

export const uploadsService = {
  sign: (purpose: 'avatar' | 'export', crop?: { x: number; y: number; width: number; height: number }) =>
    api.post<SignedUpload>('/uploads/sign', { purpose, crop }),

  saveAvatar: (secureUrl: string, publicId: string) =>
    api.post<{ avatarUrl: string }>('/profile/avatar', { secureUrl, publicId }),
};

/** Uploads a file to Cloudinary using a backend-signed payload. */
export async function uploadToCloudinary(
  signed: SignedUpload,
  file: File,
): Promise<{ secure_url: string; public_id: string }> {
  const form = new FormData();
  for (const [k, v] of Object.entries(signed.params)) form.append(k, v);
  form.append('timestamp', String(signed.timestamp));
  form.append('api_key', signed.api_key);
  form.append('signature', signed.signature);
  form.append('file', file);

  const res = await fetch(signed.uploadUrl, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return (await res.json()) as { secure_url: string; public_id: string };
}

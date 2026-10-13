import { forbidden } from './errors';

export const avatarFolder = (userId: string) => `cc/avatars/${userId}`;
export const exportFolder = (userId: string) => `cc/exports/${userId}`;

/** publicId must be exactly `<folder>/<id>` with a plain id (no traversal, no nesting). */
export function assertPublicIdInFolder(publicId: string, folder: string): void {
  const prefix = `${folder}/`;
  const rest = publicId.startsWith(prefix) ? publicId.slice(prefix.length) : '';
  if (!rest || !/^[A-Za-z0-9_-]{1,100}$/.test(rest)) {
    throw forbidden('Upload does not belong to your account', 'UPLOAD_NOT_OWNED');
  }
}

/** URL must be https://res.cloudinary.com/<our cloud>/.../<folder>/... */
export function assertUrlOwned(rawUrl: string, cloudName: string, folder: string): void {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    throw forbidden('Invalid file URL', 'UPLOAD_NOT_OWNED');
  }
  const path = decodeURIComponent(u.pathname);
  const ok =
    u.protocol === 'https:' &&
    u.hostname === 'res.cloudinary.com' &&
    path.startsWith(`/${cloudName}/`) &&
    path.includes(`/${folder}/`) &&
    !path.includes('..');
  if (!ok) throw forbidden('File URL does not belong to your account', 'UPLOAD_NOT_OWNED');
}

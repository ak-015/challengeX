// ADAPTER: Cloudinary signed uploads. VERIFY against https://cloudinary.com/documentation/authentication_signatures
// All Cloudinary SDK usage lives in this file.
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { log } from '../../lib/logger';

function sdk() {
  const e = env();
  cloudinary.config({ cloud_name: e.CLOUDINARY_CLOUD_NAME, api_key: e.CLOUDINARY_API_KEY, api_secret: e.CLOUDINARY_API_SECRET, secure: true });
  return cloudinary;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SignedUpload {
  uploadUrl: string;
  apiKey: string;
  cloudName: string;
  timestamp: number;
  signature: string;
  /** The client MUST send exactly these fields (plus file, api_key, timestamp, signature) - nothing else is signed. */
  params: Record<string, string>;
  maxBytes: number;
}

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const EXPORT_MAX_BYTES = 10 * 1024 * 1024;

export function signUpload(fields: Record<string, string>, maxBytes: number): SignedUpload {
  const e = env();
  const timestamp = Math.round(Date.now() / 1000);
  const toSign = { ...fields, timestamp };
  const signature = sdk().utils.api_sign_request(toSign, e.CLOUDINARY_API_SECRET);
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${e.CLOUDINARY_CLOUD_NAME}/image/upload`,
    apiKey: e.CLOUDINARY_API_KEY,
    cloudName: e.CLOUDINARY_CLOUD_NAME,
    timestamp,
    signature,
    params: fields,
    maxBytes,
  };
}

/** Incoming transformation: optional user-chosen crop, then a 256x256 fill (face-aware when no manual crop). */
export function avatarTransformation(crop?: CropRegion): string {
  if (crop) {
    return `c_crop,h_${crop.height},w_${crop.width},x_${crop.x},y_${crop.y}/c_fill,h_256,w_256`;
  }
  return 'c_fill,g_face,h_256,w_256';
}

export interface CloudResource {
  publicId: string;
  secureUrl: string;
  format: string;
  bytes: number;
}

export async function getResource(publicId: string): Promise<CloudResource> {
  try {
    const r = await sdk().api.resource(publicId, { resource_type: 'image' });
    return { publicId: r.public_id, secureUrl: r.secure_url, format: r.format, bytes: r.bytes };
  } catch (err) {
    log.warn('cloudinary resource lookup failed', { message: (err as { message?: string })?.message });
    throw new AppError(400, 'ASSET_NOT_FOUND', 'Uploaded file could not be verified');
  }
}

/** Best-effort delete; never throws. */
export async function destroyAsset(publicId: string): Promise<void> {
  try {
    await sdk().uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
  } catch (err) {
    log.warn('cloudinary destroy failed', { message: (err as { message?: string })?.message });
  }
}

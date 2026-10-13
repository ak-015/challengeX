import type { SignedUpload } from './apiTypes';

export interface UploadResult {
  secureUrl: string;
  publicId: string;
}

/**
 * Direct browser -> Cloudinary signed upload with progress (XHR, because fetch cannot report upload progress).
 * We send EXACTLY the signed params + file + api_key + timestamp + signature, as the server signed them.
 */
export function uploadToCloudinary(signed: SignedUpload, file: Blob, filename: string, onProgress?: (fraction: number) => void): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    if (file.size > signed.maxBytes) {
      reject(new Error(`File is too large (max ${Math.round(signed.maxBytes / 1048576)} MB).`));
      return;
    }
    const fd = new FormData();
    fd.append('file', file, filename);
    fd.append('api_key', signed.apiKey);
    fd.append('timestamp', String(signed.timestamp));
    fd.append('signature', signed.signature);
    for (const [k, v] of Object.entries(signed.params)) fd.append(k, v);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', signed.uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const j = JSON.parse(xhr.responseText) as { secure_url?: string; public_id?: string };
          if (j.secure_url && j.public_id) return resolve({ secureUrl: j.secure_url, publicId: j.public_id });
        } catch {
          /* fall through */
        }
        reject(new Error('The upload response was not understood.'));
      } else {
        reject(new Error(`Upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.ontimeout = () => reject(new Error('The upload timed out.'));
    xhr.timeout = 90_000;
    xhr.send(fd);
  });
}

import { useState } from 'react';

export function Avatar({ name, url, size = 36 }: { name: string; url?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-crimson bg-black font-label text-sm font-bold text-ash"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {url && !failed ? (
        <img src={url} alt="" width={size} height={size} className="h-full w-full object-cover" onError={() => setFailed(true)} referrerPolicy="no-referrer" />
      ) : (
        initial
      )}
    </span>
  );
}

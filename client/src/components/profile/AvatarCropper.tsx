import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { CropRegion } from '@/lib/apiTypes';

const VIEW = 280; // preview square in CSS px
const MAX_SIDE = 1024;

export interface CropResult {
  blob: Blob;
  crop: CropRegion; // in the pixels of the (downscaled) uploaded image
}

/** Pick an image, downscale it (<=1024px), then drag/zoom a square window to choose which part becomes the avatar. */
export function AvatarCropper({ onConfirm, onCancel, busy }: { onConfirm: (r: CropResult) => void; onCancel: () => void; busy?: boolean }) {
  const [src, setSrc] = useState<HTMLCanvasElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const view = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  const side = src ? Math.max(16, Math.floor(Math.min(src.width, src.height) / zoom)) : 0;

  const clamp = useCallback(
    (c: { x: number; y: number }, s: number) => (src ? { x: Math.min(src.width - s / 2, Math.max(s / 2, c.x)), y: Math.min(src.height - s / 2, Math.max(s / 2, c.y)) } : c),
    [src],
  );

  const pick = async (file: File | undefined) => {
    setErr(null);
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setErr('Choose a JPG, PNG or WebP image.');
    if (file.size > 12 * 1024 * 1024) return setErr('That image is too large (max 12 MB).');
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('decode'));
        img.src = url;
      });
      const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(16, Math.round(img.naturalWidth * k));
      c.height = Math.max(16, Math.round(img.naturalHeight * k));
      c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
      setSrc(c);
      setZoom(1);
      setCenter({ x: c.width / 2, y: c.height / 2 });
    } catch {
      setErr('That image could not be read.');
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  // draw the preview
  useEffect(() => {
    const cv = view.current;
    if (!cv || !src) return;
    const c = clamp(center, side);
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, VIEW, VIEW);
    ctx.drawImage(src, c.x - side / 2, c.y - side / 2, side, side, 0, 0, VIEW, VIEW);
  }, [src, center, side, clamp]);

  const onDown = (e: PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag.current || !src) return;
    const k = side / VIEW;
    const dx = (e.clientX - drag.current.x) * k;
    const dy = (e.clientY - drag.current.y) * k;
    drag.current = { x: e.clientX, y: e.clientY };
    setCenter((c) => clamp({ x: c.x - dx, y: c.y - dy }, side));
  };
  const onKey = (e: KeyboardEvent) => {
    const step = Math.max(4, side / 20);
    const map: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    setCenter((c) => clamp({ x: c.x + d[0], y: c.y + d[1] }, side));
  };

  const confirm = () => {
    if (!src) return;
    const c = clamp(center, side);
    const crop: CropRegion = { x: Math.round(c.x - side / 2), y: Math.round(c.y - side / 2), width: side, height: side };
    const encode = (q: number) => new Promise<Blob | null>((res) => src.toBlob(res, 'image/jpeg', q));
    void (async () => {
      let blob = await encode(0.9);
      if (blob && blob.size > 1.9 * 1024 * 1024) blob = await encode(0.7);
      if (!blob) return setErr('Could not prepare the image.');
      onConfirm({ blob, crop });
    })();
  };

  return (
    <div className="space-y-4">
      {!src ? (
        <div>
          <label className="btn cursor-pointer">
            <Icon name="upload" size={18} /> Choose a photo
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
          </label>
          <p className="mt-2 text-sm text-ash-dim">JPG, PNG or WebP. You will choose which part to keep.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3">
            <div className="relative touch-none select-none" style={{ width: VIEW, height: VIEW }}>
              <canvas
                ref={view}
                width={VIEW}
                height={VIEW}
                tabIndex={0}
                role="img"
                aria-label="Avatar crop area. Drag, or use the arrow keys, to choose which part of the photo to keep."
                className="cursor-move rounded-md border border-crimson"
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={() => (drag.current = null)}
                onPointerCancel={() => (drag.current = null)}
                onKeyDown={onKey}
              />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-md" style={{ background: 'radial-gradient(circle at 50% 50%, transparent 69%, rgba(0,0,0,0.65) 70%)' }} />
            </div>
            <div className="w-full max-w-[280px]">
              <label htmlFor="zoom" className="mb-1 block font-label text-sm text-ash">Zoom</label>
              <input id="zoom" type="range" min={1} max={4} step={0.05} value={zoom} onChange={(e) => (setZoom(Number(e.target.value)), setCenter((c) => c))} className="h-11 w-full accent-[#c41423]" />
            </div>
            <p className="text-center text-sm text-ash-dim">The circle is what everyone will see.</p>
          </div>
        </>
      )}
      {err && <p role="alert" className="text-sm text-crimson-text">{err}</p>}
      <div className="flex gap-2">
        {src && <Button onClick={confirm} loading={busy}>Use this photo</Button>}
        {src && <Button variant="quiet" onClick={() => setSrc(null)} disabled={busy}>Choose another</Button>}
        <Button variant="quiet" onClick={onCancel} disabled={busy}>Cancel</Button>
      </div>
    </div>
  );
}

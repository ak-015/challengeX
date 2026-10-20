import type { SceneConfig } from './scenes';

/**
 * CPU-side preparation, run once per artwork and cached:
 *  - decodes the painting
 *  - derives a half-resolution RGBA "data" map from the pixels themselves:
 *      r  fire / lava mask        (orange-yellow, bright → painted flames, lava, reflections)
 *      g  sky visibility          (bright sky & moon = 1, dark castle / mountain silhouettes = 0)
 *      b  blurred fire mask       (heat shimmer + bloom falloff)
 *      a  blurred scene light     (what lights the fog)
 *  - builds the tileable noise texture shared by every shader
 * Deriving the maps from the image means the effects follow the artwork exactly and
 * no extra mask files have to be shipped.
 */

export interface SceneAssets {
  img: HTMLImageElement;
  data: Uint8Array;
  dw: number;
  dh: number;
}

const ss = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** separable box blur with clamped edges; `passes` ≈ gaussian. Never mutates `src`. */
function boxBlur(src: Float32Array, w: number, h: number, r: number, passes = 2): Float32Array {
  const a = Float32Array.from(src);
  const b = new Float32Array(a.length);
  const win = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {
      const row = y * w;
      let sum = 0;
      for (let x = -r; x <= r; x++) sum += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = sum / win;
        sum += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = sum / win;
        sum += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`realm: failed to load ${url}`));
    img.src = url;
  });
}

function derive(img: HTMLImageElement, cfg: SceneConfig): { data: Uint8Array; dw: number; dh: number } {
  const dw = Math.round(img.naturalWidth / 2);
  const dh = Math.round(img.naturalHeight / 2);
  const c = document.createElement('canvas');
  c.width = dw;
  c.height = dh;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('realm: 2d context unavailable');
  ctx.drawImage(img, 0, 0, dw, dh);
  const px = ctx.getImageData(0, 0, dw, dh).data; // throws if the canvas is tainted

  const n = dw * dh;
  const hot = new Float32Array(n);
  const sky = new Float32Array(n);
  const lum = new Float32Array(n);
  const [gb0, gb1] = cfg.hot.gb;
  const [hr0, hr1] = cfg.hot.r;
  const [s0, s1] = cfg.sky;
  for (let i = 0; i < n; i++) {
    const R = px[i * 4];
    const G = px[i * 4 + 1];
    const B = px[i * 4 + 2];
    hot[i] = ss(gb0, gb1, G - B) * ss(hr0, hr1, R);
    sky[i] = ss(s0, s1, R);
    lum[i] = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
  }

  const skySoft = boxBlur(sky, dw, dh, 1, 1);
  const hotBlur = boxBlur(hot, dw, dh, 6, 2);
  const lumBlur = boxBlur(lum, dw, dh, 16, 2);

  // normalise the light map to its 99th percentile so fog lighting is image-independent
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) hist[Math.min(255, Math.floor(lumBlur[i] * 255))]++;
  let acc = 0;
  let p99 = 255;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= n * 0.99) {
      p99 = Math.max(24, i);
      break;
    }
  }

  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    data[i * 4] = Math.round(Math.min(1, hot[i]) * 255);
    data[i * 4 + 1] = Math.round(Math.min(1, skySoft[i]) * 255);
    data[i * 4 + 2] = Math.round(Math.min(1, hotBlur[i] * 3.4) * 255);
    data[i * 4 + 3] = Math.round(Math.min(1, (lumBlur[i] * 255) / p99) * 255);
  }
  return { data, dw, dh };
}

const cache = new Map<string, Promise<SceneAssets>>();

export function loadSceneAssets(cfg: SceneConfig): Promise<SceneAssets> {
  let p = cache.get(cfg.id);
  if (!p) {
    p = loadImage(cfg.image).then((img) => ({ img, ...derive(img, cfg) }));
    p.catch(() => cache.delete(cfg.id)); // allow a retry after a failure
    cache.set(cfg.id, p);
  }
  return p;
}

let noiseMemo: Uint8Array | null = null;
/** Memoised {@link makeNoise}(256) shared by every shader user. */
export function sharedNoise(): Uint8Array {
  return (noiseMemo ??= makeNoise(256));
}

/** 256² RGBA tileable smooth noise — four independent channels, feature size ≈ 32 texels. */
export function makeNoise(size = 256): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  let seed = 0x9e3779b1;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const r = 6;
  const win = 2 * r + 1;
  for (let ch = 0; ch < 4; ch++) {
    let a = new Float32Array(size * size);
    for (let i = 0; i < a.length; i++) a[i] = rnd();
    let b = new Float32Array(a.length);
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          let s = 0;
          for (let k = -r; k <= r; k++) s += a[y * size + ((x + k + size) % size)];
          b[y * size + x] = s / win;
        }
      }
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          let s = 0;
          for (let k = -r; k <= r; k++) s += b[((y + k + size) % size) * size + x];
          a[y * size + x] = s / win;
        }
      }
    }
    let mean = 0;
    for (let i = 0; i < a.length; i++) mean += a[i];
    mean /= a.length;
    let v = 0;
    for (let i = 0; i < a.length; i++) v += (a[i] - mean) ** 2;
    const sd = Math.sqrt(v / a.length) || 1;
    for (let i = 0; i < a.length; i++) {
      out[i * 4 + ch] = Math.round(Math.min(1, Math.max(0, 0.5 + (a[i] - mean) / (sd * 3.4))) * 255);
    }
  }
  return out;
}

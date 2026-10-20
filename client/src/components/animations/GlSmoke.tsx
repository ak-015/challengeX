import { useEffect, useRef } from 'react';
import { sharedNoise } from '@/components/realm/masks';
import type { SmokeProps } from './Smoke';

/**
 * WebGL2 fog for generic backdrops (no artwork required). Three layers of domain-warped
 * fBm drift at different speeds and scales; composited normally (premultiplied alpha) and
 * feathered upward, so the smoke has real body and hides what is behind it.
 */

const VS = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uPx;
uniform float uTime;
uniform float uInt;
uniform float uDens;
uniform int uAsh;
uniform sampler2D uNoise;
out vec4 o;
float nz(vec2 p, int c){
  vec4 v = texture(uNoise, p * 0.125);
  return c == 0 ? v.r : (c == 1 ? v.g : (c == 2 ? v.b : v.a));
}
float field(vec2 p, vec2 w, float seed){
  return nz(p + w * 1.6, 2) * 0.58
       + nz(p * 2.1 - w * 1.2 + vec2(0.0, uTime * 0.04), 3) * 0.30
       + nz(p * 4.3 + w * 0.7 + vec2(uTime * 0.045, seed), 0) * 0.12;
}
void main(){
  vec2 q = gl_FragCoord.xy / uPx;              // CSS px, origin bottom-left (y up)
  float H = uRes.y / uPx;
  float up = q.y / max(H, 1.0);                 // 0 floor → 1 top
  vec3 C = vec3(0.0);
  float A = 0.0;
  for (int j = 0; j < 3; j++) {                 // far layer first
    int i = 2 - j;
    float fi = float(i);
    float sc  = 330.0 + fi * 190.0;
    float spd = (i == 1 ? -24.0 : (i == 0 ? 15.0 : 9.0));
    float seed = fi * 4.7 + 1.3;
    vec2 p = vec2(q.x - uTime * spd, q.y) / sc;
    vec2 w = vec2(nz(p * 0.55 + vec2(seed, uTime * 0.025), 0),
                  nz(p * 0.55 + vec2(seed + 4.1, -uTime * 0.02), 1)) - 0.5;
    float f  = field(p, w, seed);
    float f2 = field(p + vec2(0.0, 0.10), w, seed);   // light from above (y is up here)
    float m = smoothstep(0.36, 0.74, f);
    float band = smoothstep(0.0, 0.08, up + 0.08) * (1.0 - smoothstep(0.40 + fi * 0.18, 1.05, up));
    float a = m * band * (0.95 - fi * 0.12) * uDens * uInt;
    if (a < 0.003) continue;
    float shade = clamp(0.86 + (f - f2) * 2.6, 0.6, 1.12);
    vec3 base = uAsh == 1 ? vec3(0.74, 0.72, 0.74) : vec3(0.86, 0.76, 0.77);
    vec3 col = base * shade * (0.85 + 0.25 * (1.0 - up));
    C = C * (1.0 - a) + col * a;
    A = A * (1.0 - a) + a;
  }
  o = vec4(C, A);
}`;

function sh(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
  return s;
}

export function GlSmoke({
  className = '',
  intensity = 1,
  density = 1,
  tint = 'crimson',
  boost,
  fixed = false,
  heightClass = 'h-[70%]',
  onFail,
}: SmokeProps & { onFail: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scale = 0.5;
    let live: { stop: () => void } | null = null;
    let disposed = false;

    /** build the GL context + canvas; returns null (and reports failure) if unavailable */
    const start = () => {
      if (live || disposed) return;
      const canvas = document.createElement('canvas');
      canvas.className = 'block h-full w-full';
      let gl: WebGL2RenderingContext | null = null;
      let prog: WebGLProgram | null = null;
      try {
        gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
        if (!gl) throw new Error('no webgl2');
        prog = gl.createProgram()!;
        gl.attachShader(prog, sh(gl, gl.VERTEX_SHADER, VS));
        gl.attachShader(prog, sh(gl, gl.FRAGMENT_SHADER, FS));
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link');
      } catch {
        onFail();
        return;
      }
      const g = gl;
      const p = prog;
      host.appendChild(canvas);
      const loc = (n: string) => g.getUniformLocation(p, n);
      const tex = g.createTexture();
      g.activeTexture(g.TEXTURE0);
      g.bindTexture(g.TEXTURE_2D, tex);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, 256, 256, 0, g.RGBA, g.UNSIGNED_BYTE, sharedNoise());
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.REPEAT);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.REPEAT);
      g.useProgram(p);
      g.uniform1i(loc('uNoise'), 0);
      g.uniform1i(loc('uAsh'), tint === 'ash' ? 1 : 0);
      g.uniform1f(loc('uDens'), 0.5 * density);
      const uRes = loc('uRes');
      const uPx = loc('uPx');
      const uTime = loc('uTime');
      const uInt = loc('uInt');
      const vao = g.createVertexArray();
      g.bindVertexArray(vao);

      const t0 = performance.now() - 20000 * Math.random();
      const draw = () => {
        g.uniform2f(uRes, canvas.width, canvas.height);
        g.uniform1f(uPx, scale);
        g.uniform1f(uTime, reduced ? 6 : (performance.now() - t0) / 1000);
        g.uniform1f(uInt, intensity * (boost ? boost.get() : 1));
        g.drawArrays(g.TRIANGLES, 0, 3);
      };
      const resize = () => {
        const w = Math.max(2, Math.round(host.clientWidth * scale));
        const h = Math.max(2, Math.round(host.clientHeight * scale));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          g.viewport(0, 0, w, h);
        }
        if (reduced) draw();
      };
      resize();

      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!document.hidden) draw();
      };
      if (!reduced) raf = requestAnimationFrame(loop);
      const ro = new ResizeObserver(resize);
      ro.observe(host);
      const lost = (e: Event) => {
        e.preventDefault();
        stopLive();
        onFail();
      };
      canvas.addEventListener('webglcontextlost', lost);

      const stopLive = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        canvas.removeEventListener('webglcontextlost', lost);
        g.deleteProgram(p);
        g.deleteTexture(tex);
        g.deleteVertexArray(vao);
        g.getExtension('WEBGL_lose_context')?.loseContext();
        canvas.remove();
        live = null;
      };
      live = { stop: stopLive };
    };

    // hold a GL context only while the smoke is on / near screen
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) start();
        else live?.stop();
      },
      { rootMargin: '200px' },
    );
    io.observe(host);

    return () => {
      disposed = true;
      io.disconnect();
      live?.stop();
    };
    // onFail is a stable setState wrapper; re-run only when the visual props change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity, density, tint, boost]);

  const mask = 'linear-gradient(to top, #000 0%, #000 38%, rgba(0,0,0,0.55) 68%, transparent 100%)';
  return (
    <div
      ref={hostRef}
      aria-hidden
      className={`pointer-events-none bottom-0 left-0 w-full ${heightClass} ${fixed ? 'fixed z-[1]' : 'absolute'} ${className}`}
      style={{ WebkitMaskImage: mask, maskImage: mask }}
    />
  );
}

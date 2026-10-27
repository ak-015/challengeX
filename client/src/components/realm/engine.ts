import type { SceneConfig, Vec2 } from './scenes';
import { makeNoise } from './masks';
import type { SceneAssets } from './masks';
import {
  FRAG_EMBER, FRAG_FLAME, FRAG_FLOW, FRAG_FOG, FRAG_MOON, FRAG_SCENE, FRAG_SPRAY, FRAG_SWORD,
  VERT_EMBER, VERT_FULL, VERT_QUAD,
} from './shaders';

/**
 * WebGL2 renderer for one realm artwork.
 *
 *   pass 1  the painting, with heat-shimmer + flickering painted fire         (opaque)
 *   pass 2  additive: flames · lava flow · burning moon · swords · embers · fog
 *
 * The artwork is laid out with the same math as CSS `object-fit: cover` +
 * `object-position`, and every effect is positioned in artwork pixels.
 */

interface EngineOptions {
  objectPosition: Vec2;
  /** multiplier on every additive effect (0 disables them, 1 = authored look) */
  intensity: number;
}

interface Prog {
  p: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
}

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const s = gl.createShader(type);
  if (!s) throw new Error('realm: createShader failed');
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(`realm: shader compile error\n${log}`);
  }
  return s;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string, names: string[]): Prog {
  const p = gl.createProgram();
  if (!p) throw new Error('realm: createProgram failed');
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`realm: program link error\n${gl.getProgramInfoLog(p)}`);
  }
  const u: Prog['u'] = {};
  for (const n of names) {
    const key = n.endsWith('[0]') ? n.slice(0, -3) : n;
    u[key] = gl.getUniformLocation(p, n);
  }
  return { p, u };
}

function texture(
  gl: WebGL2RenderingContext, unit: number, w: number, h: number,
  src: TexImageSource | ArrayBufferView, opts: { repeat?: boolean; mip?: boolean },
): WebGLTexture {
  const t = gl.createTexture();
  if (!t) throw new Error('realm: createTexture failed');
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
  if (ArrayBuffer.isView(src)) {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, src);
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  }
  if (opts.mip) gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, opts.mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const wrap = opts.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  return t;
}

/** small deterministic RNG so every mount produces the same ember layout */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const COMMON_U = ['uRes', 'uCover', 'uImg', 'uTime', 'uNoise'];

export class RealmEngine {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private cfg: SceneConfig;
  private opts: EngineOptions;
  private progs!: Record<'scene' | 'flame' | 'flow' | 'moon' | 'sword' | 'fog' | 'ember' | 'spray', Prog>;
  private emberVao!: WebGLVertexArrayObject;
  private emberBuf!: WebGLBuffer;
  private emberCount = 0;
  private textures: WebGLTexture[] = [];
  private emptyVao!: WebGLVertexArrayObject;
  private cover: [number, number, number] = [1, 0, 0];
  private pxRatio = 1;
  /** when set, replaces the wall clock (debug / reduced motion) */
  timeOverride: number | null = null;
  private t0 = performance.now();
  readonly timeOffset: number;

  constructor(canvas: HTMLCanvasElement, cfg: SceneConfig, assets: SceneAssets, opts: EngineOptions) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('realm: WebGL2 unavailable');
    this.canvas = canvas;
    this.gl = gl;
    this.cfg = cfg;
    this.opts = opts;
    // phase offset so two scenes on one page never pulse in lockstep
    this.timeOffset = cfg.id === 'background' ? 3.1 : cfg.id === 'secondary' ? 11.7 : cfg.id === 'ritual' ? 7.3 : 5.9;

    this.build(assets);
  }

  private build(assets: SceneAssets) {
    const gl = this.gl;
    const { cfg } = this;

    this.progs = {
      scene: program(gl, VERT_FULL, FRAG_SCENE, [...COMMON_U, 'uArt', 'uData', 'uHeat', 'uBloom', 'uFlicker', 'uFogMask', 'uFogFlow', 'uWN', 'uWF[0]', 'uWP[0]']),
      spray: program(gl, VERT_QUAD, FRAG_SPRAY, [...COMMON_U, 'uRect', 'uSp', 'uSpG']),
      flame: program(gl, VERT_QUAD, FRAG_FLAME, [...COMMON_U, 'uRect', 'uF', 'uFP']),
      flow: program(gl, VERT_QUAD, FRAG_FLOW, [...COMMON_U, 'uRect', 'uData', 'uRegion', 'uDir', 'uFlow', 'uColor']),
      moon: program(gl, VERT_QUAD, FRAG_MOON, [...COMMON_U, 'uRect', 'uData', 'uArt', 'uM', 'uMP']),
      sword: program(gl, VERT_QUAD, FRAG_SWORD, [...COMMON_U, 'uRect', 'uS', 'uSW', 'uSC']),
      fog: program(gl, VERT_FULL, FRAG_FOG, [...COMMON_U, 'uData', 'uFN', 'uFA[0]', 'uFB[0]', 'uFC[0]', 'uFogGain']),
      ember: program(gl, VERT_EMBER, FRAG_EMBER, ['uRes', 'uCover', 'uTime', 'uPx']),
    };

    // texture units: 0 = art, 1 = data, 2 = noise
    this.textures.push(texture(gl, 0, 0, 0, assets.img, { mip: true }));
    this.textures.push(texture(gl, 1, assets.dw, assets.dh, assets.data, {}));
    this.textures.push(texture(gl, 2, 256, 256, makeNoise(256), { repeat: true }));
    // unit 3: painted-fog mask (1×1 empty when the scene does not animate its fog)
    this.textures.push(
      assets.fog ? texture(gl, 3, assets.dw, assets.dh, assets.fog, {}) : texture(gl, 3, 1, 1, new Uint8Array(4), {}),
    );

    this.emptyVao = gl.createVertexArray()!;

    // embers: static attribute buffer, motion is computed in the vertex shader
    const r = rng(cfg.id === 'background' ? 7 : cfg.id === 'secondary' ? 19 : cfg.id === 'ritual' ? 31 : 43);
    const attrs: number[] = [];
    for (const e of cfg.embers) {
      for (let i = 0; i < e.count; i++) {
        attrs.push(e.x, e.y, e.spread, e.rise, r(), 0.07 + r() * 0.12, e.size * (0.6 + r() * 0.8), r());
      }
    }
    this.emberCount = attrs.length / 8;
    this.emberVao = gl.createVertexArray()!;
    this.emberBuf = gl.createBuffer()!;
    gl.bindVertexArray(this.emberVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.emberBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(attrs), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
    gl.bindVertexArray(null);
  }

  /** Size the drawing buffer. `scale` = canvas px per CSS px. */
  resize(cssW: number, cssH: number, scale: number) {
    const W = Math.max(2, Math.round(cssW * scale));
    const H = Math.max(2, Math.round(cssH * scale));
    this.canvas.width = W;
    this.canvas.height = H;
    this.pxRatio = scale;
    const [iw, ih] = this.cfg.size;
    const s = Math.max(W / iw, H / ih);
    const [px, py] = this.opts.objectPosition;
    this.cover = [s, (W - iw * s) * px, (H - ih * s) * py];
    this.gl.viewport(0, 0, W, H);
  }

  /** Re-anchor the artwork crop (same as CSS object-position). Call resize() afterwards. */
  setObjectPosition(p: Vec2) {
    this.opts.objectPosition = p;
  }

  setIntensity(v: number) {
    this.opts.intensity = v;
  }

  now(): number {
    if (this.timeOverride !== null) return this.timeOverride;
    return (performance.now() - this.t0) / 1000 + this.timeOffset;
  }

  private common(p: Prog, t: number) {
    const gl = this.gl;
    const { canvas, cover, cfg } = this;
    gl.useProgram(p.p);
    gl.uniform2f(p.u.uRes, canvas.width, canvas.height);
    gl.uniform3f(p.u.uCover, cover[0], cover[1], cover[2]);
    gl.uniform2f(p.u.uImg, cfg.size[0], cfg.size[1]);
    gl.uniform1f(p.u.uTime, t);
    gl.uniform1i(p.u.uNoise, 2);
  }

  render(t = this.now()) {
    const gl = this.gl;
    const { cfg, progs, opts } = this;
    const I = opts.intensity;

    gl.disable(gl.BLEND);
    gl.bindVertexArray(this.emptyVao);

    // ── pass 1: the painting
    {
      const p = progs.scene;
      this.common(p, t);
      gl.uniform1i(p.u.uArt, 0);
      gl.uniform1i(p.u.uData, 1);
      gl.uniform1f(p.u.uHeat, cfg.heat * I);
      gl.uniform1f(p.u.uBloom, cfg.bloom * I);
      gl.uniform1f(p.u.uFlicker, cfg.flicker * Math.min(1, I));
      const wfs = (cfg.waterfalls ?? []).slice(0, 6);
      const WF = new Float32Array(24);
      const WP = new Float32Array(24);
      wfs.forEach((w, i) => {
        WF.set(w.rect, i * 4);
        WP.set([w.speed, w.pale[0], w.pale[1], w.sat], i * 4);
      });
      gl.uniform1i(p.u.uWN, wfs.length);
      gl.uniform4fv(p.u.uWF, WF);
      gl.uniform4fv(p.u.uWP, WP);
      gl.uniform1i(p.u.uFogMask, 3);
      gl.uniform2f(p.u.uFogFlow, cfg.fogFlow ? cfg.fogFlow.amp * Math.min(1, I) : 0, cfg.fogFlow?.speed ?? 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (I <= 0) return;

    // ── pass 2: additive light
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    // smoke (full screen) — composited OVER the painting, premultiplied, so thick smoke
    // hides what is behind it instead of washing the image out
    if (cfg.fog.length) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const p = progs.fog;
      this.common(p, t);
      gl.uniform1i(p.u.uData, 1);
      const n = Math.min(3, cfg.fog.length);
      const A = new Float32Array(12);
      const B = new Float32Array(12);
      const C = new Float32Array(9);
      for (let i = 0; i < n; i++) {
        const f = cfg.fog[i];
        A.set([f.y0, f.y1, f.soft, f.speed], i * 4);
        B.set([f.density, f.scale, f.seed, 0], i * 4);
        C.set(f.tint, i * 3);
      }
      gl.uniform1i(p.u.uFN, n);
      gl.uniform4fv(p.u.uFA, A);
      gl.uniform4fv(p.u.uFB, B);
      gl.uniform3fv(p.u.uFC, C);
      gl.uniform1f(p.u.uFogGain, Math.min(1, I));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.blendFunc(gl.ONE, gl.ONE);
    }

    // quads
    const quad = (rect: [number, number, number, number], p: Prog) => {
      gl.uniform4f(p.u.uRect, rect[0], rect[1], rect[2], rect[3]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // lava / fire flow over painted pixels
    {
      const p = progs.flow;
      this.common(p, t);
      gl.uniform1i(p.u.uData, 1);
      cfg.flows.forEach((f, i) => {
        gl.uniform4f(p.u.uRegion, f.rect[0], f.rect[1], f.rect[2], f.rect[3]);
        gl.uniform2f(p.u.uDir, f.dir[0], f.dir[1]);
        gl.uniform4f(p.u.uFlow, f.scale, f.gain * I, f.contrast, i * 4.7);
        gl.uniform3f(p.u.uColor, f.color[0], f.color[1], f.color[2]);
        quad(f.rect, p);
      });
    }

    // flames
    {
      const p = progs.flame;
      this.common(p, t);
      cfg.flames.forEach((f, i) => {
        gl.uniform4f(p.u.uF, f.x, f.y, f.w, f.h);
        gl.uniform3f(p.u.uFP, i * 1.37 + 0.5, (f.gain ?? 1) * I, f.sharp ? 1 : 0);
        quad([f.x - f.w * 2.2, f.y - f.h * 2.0, f.x + f.w * 2.2, f.y + (f.sharp ? f.h * 0.15 : f.h * 1.3)], p);
      });
    }

    // spray at the foot of each waterfall
    {
      const sprays = (cfg.waterfalls ?? []).filter((w) => w.spray);
      if (sprays.length) {
        const p = progs.spray;
        this.common(p, t);
        for (const w of sprays) {
          const [cx, by, sw, sh] = w.spray!;
          gl.uniform4f(p.u.uSp, cx, by, sw, sh);
          gl.uniform1f(p.u.uSpG, 0.3 * I);
          quad([cx - sw * 0.8, by - sh * 1.3, cx + sw * 0.8, by + sh * 0.5], p);
        }
      }
    }

    // burning moon
    if (cfg.moon) {
      const m = cfg.moon;
      const p = progs.moon;
      this.common(p, t);
      gl.uniform1i(p.u.uData, 1);
      gl.uniform1i(p.u.uArt, 0);
      gl.uniform3f(p.u.uM, m.x, m.y, m.r);
      gl.uniform3f(p.u.uMP, m.gain * I, m.surface, m.corona);
      const e = m.r * 2.0;
      quad([m.x - e, m.y - e, m.x + e, m.y + e * 0.8], p);
    }

    // swords
    {
      const p = progs.sword;
      this.common(p, t);
      cfg.swords.forEach((s, i) => {
        gl.uniform4f(p.u.uS, s.from[0], s.from[1], s.to[0], s.to[1]);
        gl.uniform3f(p.u.uSW, s.w0, s.w1, i);
        gl.uniform4f(p.u.uSC, s.color[0], s.color[1], s.color[2], s.gain * I);
        const pad = Math.max(s.w0, 12) * 9;
        quad([
          Math.min(s.from[0], s.to[0]) - pad, Math.min(s.from[1], s.to[1]) - pad,
          Math.max(s.from[0], s.to[0]) + pad, Math.max(s.from[1], s.to[1]) + pad,
        ], p);
      });
    }

    // embers
    if (this.emberCount) {
      const p = progs.ember;
      gl.useProgram(p.p);
      gl.uniform2f(p.u.uRes, this.canvas.width, this.canvas.height);
      gl.uniform3f(p.u.uCover, this.cover[0], this.cover[1], this.cover[2]);
      gl.uniform1f(p.u.uTime, t);
      gl.uniform1f(p.u.uPx, this.pxRatio);
      gl.bindVertexArray(this.emberVao);
      gl.drawArrays(gl.POINTS, 0, this.emberCount);
      gl.bindVertexArray(null);
    }
  }

  dispose() {
    const gl = this.gl;
    Object.values(this.progs ?? {}).forEach((p) => gl.deleteProgram(p.p));
    this.textures.forEach((t) => gl.deleteTexture(t));
    gl.deleteBuffer(this.emberBuf);
    gl.deleteVertexArray(this.emberVao);
    gl.deleteVertexArray(this.emptyVao);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

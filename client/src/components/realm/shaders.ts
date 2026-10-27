/**
 * GLSL ES 3.00 for the realm scene engine. Everything works in ARTWORK pixel
 * space: `imgPos()` / `vImg` give the painting coordinate of the fragment, so each
 * effect is authored against the 1672×941 image regardless of viewport.
 *
 * Effects are additive (blendFunc ONE,ONE) over the opaque scene pass.
 */

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;

/** shared uniforms + helpers (fragment stage) */
const COMMON = `
uniform vec2 uRes;      // canvas size, px
uniform vec3 uCover;    // artwork scale (canvas px / art px), offset x, offset y (canvas px)
uniform vec2 uImg;      // artwork size, px
uniform float uTime;
uniform sampler2D uNoise;

// Smooth band-limited noise, 4 decorrelated channels. p is in "feature units".
float nz(vec2 p, int c){
  vec4 v = texture(uNoise, p * 0.125);
  return c == 0 ? v.r : (c == 1 ? v.g : (c == 2 ? v.b : v.a));
}

// black-body-ish flame ramp: ember red → orange → amber → pale yellow
vec3 fireRamp(float h){
  vec3 c = mix(vec3(0.0), vec3(0.50, 0.03, 0.0), smoothstep(0.02, 0.28, h));
  c = mix(c, vec3(1.0, 0.24, 0.02), smoothstep(0.22, 0.55, h));
  c = mix(c, vec3(1.0, 0.62, 0.13), smoothstep(0.50, 0.82, h));
  c = mix(c, vec3(1.0, 0.93, 0.68), smoothstep(0.82, 1.0, h));
  return c;
}
`;

export const VERT_FULL = `#version 300 es
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const VERT_QUAD = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec3 uCover;
uniform vec4 uRect; // artwork px: x0 y0 x1 y1
out vec2 vImg;
void main(){
  vec2 c = vec2(float(gl_VertexID & 1), float(gl_VertexID >> 1));
  vec2 ip = mix(uRect.xy, uRect.zw, c);
  vImg = ip;
  vec2 cp = ip * uCover.x + uCover.yz;
  gl_Position = vec4(cp.x / uRes.x * 2.0 - 1.0, 1.0 - cp.y / uRes.y * 2.0, 0.0, 1.0);
}`;

const IMG_POS = `
vec2 imgPosFrag(){
  vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  return (p - uCover.yz) / uCover.x;
}
`;

/* ───────────────────────── scene pass: the painting itself ─────────────────────────
   • heat shimmer: UVs wobble upward around fire so painted flames lick and waver
   • painted fire/lava pixels (data.r) flicker with scrolling noise
   • blurred fire mask (data.b) adds a flickering bloom                              */
export const FRAG_SCENE = HEAD + COMMON + IMG_POS + `
uniform sampler2D uArt;
uniform sampler2D uData; // r: fire/lava mask  g: sky visibility  b: blurred fire  a: blurred light
uniform float uHeat;
uniform float uBloom;
uniform float uFlicker;
uniform sampler2D uFogMask; // r: interior of painted fog banks
uniform vec2 uFogFlow;      // amplitude (art px), cycles per second (0 = off)
uniform int uWN;            // number of waterfalls
uniform vec4 uWF[6];        // waterfall rect: x0 y0 x1 y1 (art px)
uniform vec4 uWP[6];        // fall speed (px/s), lum lo, lum hi, max saturation
out vec4 o;
void main(){
  vec2 q = imgPosFrag();
  vec2 uv = q / uImg;
  float heat = texture(uData, uv).b;

  float a = nz(q / 64.0 + vec2(0.0, -uTime * 0.60), 0);
  float b = nz(q / 48.0 + vec2(7.3, -uTime * 0.85), 1);
  vec2 disp = (vec2(a, b) - 0.5) * 2.0 * heat * uHeat;
  vec2 uv2 = (q + disp) / uImg;

  vec3 art = texture(uArt, uv2).rgb;
  vec4 d = texture(uData, uv2);

  // ── painted fog: drift + billow in place (flow-map: two phase-shifted samples cross-faded,
  //    displacement scaled by the fog mask so rocks and silhouettes never move)
  float fm = uFogFlow.x > 0.0 ? texture(uFogMask, uv).r : 0.0;
  if (fm > 0.01) {
    vec2 wind = vec2(1.0, 0.0) + (vec2(nz(q / 240.0 + vec2(0.0, uTime * 0.02), 0), nz(q / 240.0 + vec2(7.1, uTime * 0.016), 1)) - 0.5) * 1.2;
    float ph1 = fract(uTime * uFogFlow.y + nz(q / 420.0, 2) * 0.9);   // spatial phase offset: no global pulse
    float ph2 = fract(ph1 + 0.5);
    float w1 = 1.0 - abs(2.0 * ph1 - 1.0);
    vec3 f1 = texture(uArt, (q - wind * (ph1 - 0.5) * uFogFlow.x * fm) / uImg).rgb;
    vec3 f2 = texture(uArt, (q - wind * (ph2 - 0.5) * uFogFlow.x * fm) / uImg).rgb;
    // slow billow: gentle warp on top of the drift
    vec2 bw = (vec2(nz(q / 150.0 + vec2(-uTime * 0.05, 0.0), 3), nz(q / 150.0 + vec2(3.3, uTime * 0.04), 0)) - 0.5) * 7.0 * fm;
    vec3 fa = mix(f2, f1, w1);
    vec3 fb = texture(uArt, (q + bw) / uImg).rgb;
    vec3 fogArt = mix(fa, fb, 0.35);
    // density waves rolling through the bank
    float dn = nz(q / 210.0 + vec2(-uTime * 0.035, uTime * 0.012), 2);
    fogArt *= 0.9 + 0.22 * dn;
    art = mix(art, fogArt, smoothstep(0.02, 0.5, fm));
  }

  // ── waterfalls: the painted water streams downward. Only pale, desaturated pixels inside the
  //    fall's rect move (rock and mist around them stay put). Each vertical strand runs on its own
  //    phase, so the water shimmers instead of sliding as one sheet.
  for (int i = 0; i < 6; i++) {
    if (i >= uWN) break;
    vec4 r = uWF[i];
    if (q.x < r.x || q.x > r.z || q.y < r.y || q.y > r.w) continue;
    float feather = smoothstep(r.x, r.x + 6.0, q.x) * (1.0 - smoothstep(r.z - 6.0, r.z, q.x))
                  * smoothstep(r.y, r.y + 10.0, q.y) * (1.0 - smoothstep(r.w - 22.0, r.w, q.y));
    vec3 a0 = texture(uArt, uv).rgb;
    float lum0 = dot(a0, vec3(0.2126, 0.7152, 0.0722));
    float mx = max(a0.r, max(a0.g, a0.b));
    float sat0 = (mx - min(a0.r, min(a0.g, a0.b))) / max(mx, 1e-3);
    float wm = smoothstep(uWP[i].y, uWP[i].z, lum0) * (1.0 - smoothstep(uWP[i].w, uWP[i].w + 0.14, sat0)) * feather;
    if (wm < 0.01) continue;
    float cyc = 2.4;
    float amp = uWP[i].x / cyc;
    float ph1 = fract(uTime * cyc + nz(vec2(q.x / 8.0, 3.0 + float(i) * 5.0), 2) * 0.9);
    float ph2 = fract(ph1 + 0.5);
    float wA = 1.0 - abs(2.0 * ph1 - 1.0);
    vec3 s1 = texture(uArt, (q - vec2(0.0, (ph1 - 0.5) * amp)) / uImg).rgb;
    vec3 s2 = texture(uArt, (q - vec2(0.0, (ph2 - 0.5) * amp)) / uImg).rgb;
    vec3 wf = mix(s2, s1, wA);
    // falling streaks and foam
    float st  = nz(vec2(q.x / 3.6, q.y / 64.0 - uTime * uWP[i].x / 64.0), 3);
    float st2 = nz(vec2(q.x / 7.5 + 4.0, q.y / 38.0 - uTime * uWP[i].x * 1.3 / 38.0), 0);
    wf *= 0.87 + 0.34 * st;
    wf += vec3(0.95, 0.82, 0.84) * pow(st2, 3.0) * 0.15;
    art = mix(art, wf, wm);
  }

  float f1 = nz(q / 30.0 * vec2(1.0, 0.75) + vec2(0.0, -uTime * 1.2), 2);
  float f2 = nz(q / 13.0 * vec2(1.0, 0.8) + vec2(5.0, -uTime * 2.3), 3);
  float f3 = nz(q / 170.0 + vec2(uTime * 0.35, uTime * 0.2), 0);
  float flick = 0.42 + 1.18 * (f1 * 0.5 + f2 * 0.28 + f3 * 0.22);

  float k = d.r * uFlicker;
  art *= 1.0 + k * (flick - 1.0) * 1.15;
  art += vec3(0.36, 0.13, 0.0) * k * max(flick - 1.0, 0.0);
  art += vec3(1.0, 0.36, 0.07) * d.b * (0.22 + 0.62 * flick) * uBloom;

  o = vec4(art, 1.0);
}`;

/* ───────────────────────────── procedural flame ───────────────────────────── */
export const FRAG_FLAME = HEAD + COMMON + `
uniform vec4 uF;   // cx, base y, width, height   (artwork px)
uniform vec3 uFP;  // seed, gain, sharp (1 = flame stops dead at the bowl rim)
in vec2 vImg;
out vec4 o;
void main(){
  float t = uTime;
  float seed = uFP.x;
  // x: -1..1 across the flame, y: 0 at the base → 1 at the nominal tip
  vec2 p = vec2((vImg.x - uF.x) / (uF.z * 0.5), (uF.y - vImg.y) / uF.w);

  float breathe = 0.78 + 0.34 * nz(vec2(t * 1.1 + seed * 9.0, seed * 3.0), 0);

  float py = clamp(p.y, 0.0, 1.7);
  float sway = (nz(vec2(py * 1.25 - t * 1.35, seed * 13.0), 1) - 0.5) * 1.5 * py;
  float x = p.x + sway;

  float widthP = 0.92 * pow(max(1.0 - py * 0.82, 0.0), 0.8) + 0.05;
  float body = clamp(1.0 - abs(x) / widthP, 0.0, 1.0);

  float e1 = nz(vec2(x * 1.9 + seed * 5.0, py * 2.1 - t * 2.5), 2);
  float e2 = nz(vec2(x * 4.1 + 1.7, py * 4.6 - t * 4.6 + seed * 3.0), 3);
  float erode = e1 * 0.62 + e2 * 0.38;

  float h = body * (1.25 - py * 0.62) - (1.0 - erode) * (0.20 + py * 0.62);
  h = clamp(h * 1.55, 0.0, 1.0) * breathe;
  float rimLo = mix(-0.10, -0.015, uFP.z);
  float rimHi = mix(0.10, 0.05, uFP.z);
  h *= smoothstep(rimLo, rimHi, p.y);

  vec3 col = fireRamp(h) * smoothstep(0.03, 0.22, h);

  // flickering light thrown onto the surroundings
  vec2 g = vec2(p.x * 0.5, (p.y - 0.28) * 0.72);
  float pool = exp(-dot(g, g) * 2.6) * breathe * smoothstep(mix(-1.1, -0.10, uFP.z), mix(0.05, 0.02, uFP.z), p.y);
  pool *= smoothstep(4.2, 2.4, abs(p.x));
  col += vec3(1.0, 0.36, 0.07) * pool * 0.34;

  o = vec4(col * uFP.y, 1.0);
}`;

/* ─────────────────────── lava / fire flow over painted pixels ───────────────────── */
export const FRAG_FLOW = HEAD + COMMON + `
uniform sampler2D uData;
uniform vec4 uRegion;  // x0 y0 x1 y1 (artwork px) — feathered
uniform vec2 uDir;     // px / s
uniform vec4 uFlow;    // scale, gain, contrast, seed
uniform vec3 uColor;
in vec2 vImg;
out vec4 o;
void main(){
  vec2 uv = vImg / uImg;
  vec4 d = texture(uData, uv);
  float hot = max(d.r, d.b * 0.35);

  vec2 fe = vec2(
    smoothstep(uRegion.x, uRegion.x + 22.0, vImg.x) * (1.0 - smoothstep(uRegion.z - 22.0, uRegion.z, vImg.x)),
    smoothstep(uRegion.y, uRegion.y + 22.0, vImg.y) * (1.0 - smoothstep(uRegion.w - 22.0, uRegion.w, vImg.y)));
  float feather = fe.x * fe.y;

  vec2 p = vImg / uFlow.x - uDir * uTime / uFlow.x;
  float n = nz(p + uFlow.w, 0) * 0.55 + nz(p * 2.3 + vec2(3.0, 1.0), 1) * 0.30 + nz(p * 4.7 - vec2(1.0, 6.0), 2) * 0.15;
  float k = pow(smoothstep(0.30, 0.85, n), uFlow.z);

  o = vec4(uColor * hot * k * feather * uFlow.y, 1.0);
}`;

/* ───────────────────────────────── burning moon ─────────────────────────────────
   surface: domain-warped ridged noise = molten veins crawling across the disc
   corona : flame tongues licking off the limb, reaching further upward
   both are multiplied by the sky-visibility mask so the castle / mountains in front
   of the moon stay solid.                                                         */
export const FRAG_MOON = HEAD + COMMON + `
uniform sampler2D uData;
uniform sampler2D uArt;
uniform vec3 uM;   // cx, cy, R
uniform vec3 uMP;  // gain, surface, corona
in vec2 vImg;
out vec4 o;
void main(){
  float t = uTime;
  vec2 d = vImg - uM.xy;
  float R = uM.z;
  float rl = length(d);
  float r = rl / R;
  float vis = smoothstep(0.55, 0.95, texture(uData, vImg / uImg).g); // sharper: silhouettes stay solid
  float ang = atan(d.y, d.x);
  vec3 col = vec3(0.0);

  // ── smouldering surface: big slow heat blobs + faint cracks, so the painted craters still read
  float inside = 1.0 - smoothstep(0.98, 1.0, r);
  vec2 sp = d / R * 2.2;
  vec2 w = vec2(nz(sp * 0.9 + vec2(t * 0.06, 0.0), 0), nz(sp * 0.9 + vec2(3.7, t * 0.05), 1)) - 0.5;
  float n  = nz(sp * 1.25 + w * 2.0 + vec2(0.0, -t * 0.08), 2);
  float n2 = nz(sp * 2.6 - w * 1.5 + vec2(t * 0.10, t * 0.04), 3);
  float blob = smoothstep(0.34, 0.86, n);
  float crack = pow(1.0 - abs(2.0 * n2 - 1.0), 5.0);
  float limb = smoothstep(0.25, 1.0, r);
  float heat = blob * (0.35 + 0.65 * limb) + crack * blob * 0.55;
  heat *= 0.8 + 0.2 * sin(t * 1.3 + n * 6.0);
  // only the lit, painted part of the disc smoulders — its dark side stays dark
  float lit = smoothstep(0.38, 0.85, texture(uArt, vImg / uImg).r);
  col += fireRamp(clamp(heat * 0.62, 0.0, 0.8)) * heat * uMP.y * inside * lit * 0.6;

  // ── flames licking off the limb: separate tongues of different length, hotter at the top
  float rr = max(r - 1.0, 0.0);
  float up = clamp(-d.y / max(rl, 1e-3), 0.0, 1.0);
  float A = nz(vec2(ang * 3.0 + t * 0.07, t * 0.55), 0) * 0.55 + nz(vec2(ang * 7.5 - t * 0.09, t * 0.85 + 4.0), 1) * 0.45;
  float reach = (0.05 + 0.62 * pow(A, 1.7)) * (0.55 + 0.95 * up);
  float lick = nz(vec2(ang * 15.0 + t * 0.2, rr * 8.0 - t * 2.4), 2) * 0.6
             + nz(vec2(ang * 30.0 - t * 0.3, rr * 16.0 - t * 4.2), 3) * 0.4;
  float prof = clamp(1.0 - rr / max(reach, 0.02), 0.0, 1.0);
  float tongue = clamp(prof * 1.05 - (1.0 - lick) * 0.62 * (0.1 + 0.9 * rr / max(reach, 0.02)), 0.0, 1.0);
  float outside = smoothstep(0.985, 1.012, r);
  col += fireRamp(0.12 + tongue * 0.78) * tongue * outside * uMP.z * 0.95;

  // a soft, breathing glow hugging the limb
  float halo = exp(-rr * 5.0) * outside * (0.7 + 0.3 * sin(t * 1.5 + A * 4.0)) * (0.5 + 0.5 * A);
  col += vec3(0.95, 0.2, 0.05) * halo * 0.22 * uMP.z;

  o = vec4(col * vis * uMP.x, 1.0);
}`;

/* ─────────────────────────────── glowing sword ─────────────────────────────── */
export const FRAG_SWORD = HEAD + COMMON + `
uniform vec4 uS;    // hilt x,y  tip x,y
uniform vec3 uSW;   // half-width at hilt, at tip, seed
uniform vec4 uSC;   // colour rgb, gain
in vec2 vImg;
out vec4 o;
void main(){
  float t = uTime;
  vec2 a = uS.xy;
  vec2 ab = uS.zw - a;
  float L = length(ab);
  vec2 dir = ab / L;
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 pa = vImg - a;
  float s = dot(pa, dir) / L;     // 0 hilt → 1 tip
  float h = dot(pa, nrm);         // px across the blade
  float hw = mix(uSW.x, uSW.y, clamp(s, 0.0, 1.0));
  float seed = uSW.z;

  float along = smoothstep(-0.03, 0.02, s) * (1.0 - smoothstep(0.97, 1.04, s));
  // glow spills a little past the crossguard and eases in — never a hard edge
  float spill = smoothstep(-0.34, 0.10, s) * (1.0 - smoothstep(0.97, 1.12, s));
  float ah = abs(h);

  float pulse = 0.66 + 0.2 * sin(t * 2.2 + seed * 3.0)
              + 0.22 * (nz(vec2(t * 1.5 + seed * 7.0, 2.0), 3) - 0.5) * 2.0;
  float shimmer = 0.78 + 0.45 * nz(vec2(s * 14.0 - t * 2.2 + seed * 4.0, h * 0.18), 2);

  float blade = (1.0 - smoothstep(hw * 0.55, hw * 1.15, ah)) * along;
  float core  = exp(-pow(ah / max(hw * 0.34, 0.6), 2.0)) * along;

  // energy surges running hilt → tip, plus a faint slower echo
  float sp1 = fract(t * 0.34 + seed * 0.37);
  float sp2 = fract(t * 0.21 + 0.5 + seed * 0.61);
  float surge = exp(-pow((s - sp1) / 0.075, 2.0)) * 1.0 + exp(-pow((s - sp2) / 0.12, 2.0)) * 0.45;

  // temperature rises toward the point
  float temp = 0.55 + 0.6 * smoothstep(0.0, 1.0, s);

  float halo = exp(-ah / max(hw * 2.8, 2.0)) * spill * (0.55 + 0.45 * pulse);
  float halo2 = exp(-ah / max(hw * 9.0, 8.0)) * spill * 0.34 * pulse;

  vec3 base = uSC.rgb;
  vec3 hotc = mix(base, vec3(1.0, 0.82, 0.74), 0.7);
  vec3 col = base * (blade * 0.36 * shimmer * temp + halo * 0.66 + halo2)
           + hotc * (core * (0.62 * pulse + 0.35) * temp + surge * (core * 1.5 + blade * 0.7));

  // tip flare
  float tip = exp(-length((vImg - uS.zw)) / max(hw * 5.0, 9.0));
  col += hotc * tip * 0.55 * pulse;

  o = vec4(col * uSC.a, 1.0);
}`;

/* ───────────────────────────── white smoke ─────────────────────────────
   Billowing smoke banks: domain-warped fBm thresholded into defined puffs with clear
   gaps, shaded as if lit from above (thickness difference toward the light), tinted pale
   and lit by the painting's own blurred light map so it glows around fire and the moon.
   Output is premultiplied and composited OVER the image — smoke occludes, never blurs. */
export const FRAG_FOG = HEAD + COMMON + IMG_POS + `
uniform sampler2D uData;
uniform int uFN;
uniform vec4 uFA[3]; // y0, y1, soft, speed
uniform vec4 uFB[3]; // density, scale, seed, unused
uniform vec3 uFC[3]; // smoke colour
uniform float uFogGain;
out vec4 o;

float smokeField(vec2 p, vec2 w, float seed){
  return nz(p + w * 1.6, 2) * 0.58
       + nz(p * 2.1 - w * 1.2 + vec2(0.0, uTime * 0.04), 3) * 0.30
       + nz(p * 4.3 + w * 0.7 + vec2(uTime * 0.045, seed), 0) * 0.12;
}

void main(){
  vec2 q = imgPosFrag();
  vec2 uv = q / uImg;
  float L = texture(uData, uv).a;
  float lit = smoothstep(0.0, 0.75, L);

  vec3 C = vec3(0.0);   // premultiplied colour
  float A = 0.0;
  // back layer first, front layer last
  for (int j = 0; j < 3; j++) {
    int i = 2 - j;
    if (i >= uFN) continue;
    float y0 = uFA[i].x; float y1 = uFA[i].y; float soft = uFA[i].z; float spd = uFA[i].w;
    float dens = uFB[i].x; float sc = uFB[i].y; float seed = uFB[i].z;

    float band = smoothstep(y0, y0 + soft, q.y) * (1.0 - smoothstep(y1 - soft, y1, q.y));
    if (band < 0.002) continue;

    vec2 p = q / sc;
    p.x -= uTime * spd / sc;
    vec2 w = vec2(nz(p * 0.55 + vec2(seed, uTime * 0.025), 0),
                  nz(p * 0.55 + vec2(seed + 4.1, -uTime * 0.02), 1)) - 0.5;
    float f  = smokeField(p, w, seed);
    float f2 = smokeField(p + vec2(0.0, -0.10), w, seed);   // toward the light (above)

    float m = smoothstep(0.36, 0.74, f);
    float a = m * band * dens * uFogGain;
    if (a < 0.003) continue;

    float shade = clamp(0.84 + (f - f2) * 2.6, 0.58, 1.12);  // lit crowns, soft shadowed undersides
    vec3 col = uFC[i] * shade * (0.62 + 0.7 * lit);
    C = C * (1.0 - a) + col * a;
    A = A * (1.0 - a) + a;
  }
  o = vec4(C, A);
}`;

/* ───────────────────── spray plume at the foot of a waterfall ───────────────────── */
export const FRAG_SPRAY = HEAD + COMMON + `
uniform vec4 uSp;   // cx, base y, width, height (art px)
uniform float uSpG;
in vec2 vImg;
out vec4 o;
void main(){
  float t = uTime;
  vec2 p = vec2((vImg.x - uSp.x) / (uSp.z * 0.5), (uSp.y - vImg.y) / uSp.w); // y up from the base
  float r = length(vec2(p.x, p.y > 0.0 ? p.y * 0.85 : p.y * 2.4));
  float body = smoothstep(1.0, 0.1, r);
  float n = nz(vec2(vImg.x / 22.0 + t * 0.35, vImg.y / 22.0 + t * 0.8), 2) * 0.55
          + nz(vec2(vImg.x / 10.0 - t * 0.5, vImg.y / 10.0 + t * 1.5), 3) * 0.45;
  float puff = smoothstep(0.38, 0.78, n);
  vec3 col = vec3(0.96, 0.84, 0.86) * body * puff * uSpG;
  o = vec4(col, 1.0);
}`;

/* ───────────────────────────────── embers (points) ───────────────────────────────── */
export const VERT_EMBER = `#version 300 es
precision highp float;
layout(location = 0) in vec4 aA; // x, y, spread, rise
layout(location = 1) in vec4 aB; // phase, speed, size, seed
uniform vec2 uRes;
uniform vec3 uCover;
uniform float uTime;
uniform float uPx; // canvas px per CSS px (for point size)
out float vLife;
out float vSeed;
void main(){
  float life = fract(aB.x + uTime * aB.y);
  float rise = life * aA.w;
  float sway = sin(life * 9.0 + aB.x * 40.0) * aA.z * 0.18 + (aB.w - 0.5) * aA.z * 0.6 * life;
  vec2 pos = vec2(aA.x + (aB.w - 0.5) * aA.z + sway, aA.y - rise * (0.55 + 0.45 * aB.w));
  vec2 cp = pos * uCover.x + uCover.yz;
  gl_Position = vec4(cp.x / uRes.x * 2.0 - 1.0, 1.0 - cp.y / uRes.y * 2.0, 0.0, 1.0);
  gl_PointSize = max(2.0, aB.z * uCover.x * (1.0 - life * 0.55)) * uPx;
  vLife = life;
  vSeed = aB.w;
}`;

export const FRAG_EMBER = `#version 300 es
precision highp float;
in float vLife;
in float vSeed;
uniform float uTime;
out vec4 o;
void main(){
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float d = dot(c, c);
  float a = smoothstep(1.0, 0.0, d);
  a *= a;
  float fade = smoothstep(0.0, 0.08, vLife) * (1.0 - smoothstep(0.5, 1.0, vLife));
  float tw = 0.7 + 0.3 * sin(uTime * 14.0 + vSeed * 50.0);
  vec3 col = mix(vec3(1.0, 0.78, 0.36), vec3(1.0, 0.16, 0.05), smoothstep(0.0, 0.85, vLife));
  o = vec4(col * a * fade * tw * 1.25, 1.0);
}`;

import { assets } from '@/utils/assets';

/**
 * Per-artwork effect maps. Every coordinate is in ARTWORK pixels (both images are
 * 1672×941), so the effects stay glued to the painting at any viewport size and
 * object-position — the engine applies the same "cover" transform the browser
 * would use for the <img>.
 *
 * To re-skin: swap the image, then re-measure the handful of coordinates below.
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export interface FlameSpec {
  /** centre x, y of the base (where the flame meets the brazier), width, height */
  x: number;
  y: number;
  w: number;
  h: number;
  gain?: number;
  /** flame stops dead at its base (use for fire burning out of a bowl so it never overlaps the bowl) */
  sharp?: boolean;
}

export interface SwordSpec {
  /** hilt-end and tip of the blade's centre line */
  from: Vec2;
  to: Vec2;
  /** half-width of the glowing blade at the hilt end / at the tip */
  w0: number;
  w1: number;
  color: Vec3;
  gain: number;
}

export interface MoonSpec {
  x: number;
  y: number;
  r: number;
  /** overall / surface magma / corona flame intensity */
  gain: number;
  surface: number;
  corona: number;
}

/** A region where painted fire/lava pixels are made to flow in a given direction. */
export interface FlowSpec {
  rect: [number, number, number, number];
  /** drift in artwork px per second */
  dir: Vec2;
  /** noise cell size in px */
  scale: number;
  gain: number;
  contrast: number;
  color: Vec3;
}

export interface FogLayer {
  y0: number;
  y1: number;
  soft: number;
  /** drift in artwork px per second (sign = direction) */
  speed: number;
  /** noise cell size in px */
  scale: number;
  density: number;
  tint: Vec3;
  seed: number;
}

export interface EmberSpec {
  x: number;
  y: number;
  spread: number;
  rise: number;
  count: number;
  size: number;
}

export interface SceneConfig {
  id: 'background' | 'secondary' | 'ritual' | 'gate';
  image: string;
  size: Vec2;
  /** colour thresholds used to find fire/lava pixels (0-255 channel values) */
  hot: { gb: Vec2; r: Vec2 };
  /** red-channel thresholds separating bright sky/moon from dark silhouettes */
  sky: Vec2;
  heat: number;
  bloom: number;
  flicker: number;
  flames: FlameSpec[];
  /** null when the artwork has no moon */
  moon: MoonSpec | null;
  swords: SwordSpec[];
  flows: FlowSpec[];
  fog: FogLayer[];
  /** animate the PAINTED fog in the artwork (drift + billow) instead of adding smoke on top */
  fogFlow?: { amp: number; speed: number };
  embers: EmberSpec[];
}

/* ──────────────────────────────────────────────────────────────────────────
   realm-background — hooded statue with the rune sword, braziers, blood moon
   ────────────────────────────────────────────────────────────────────────── */
export const BACKGROUND_SCENE: SceneConfig = {
  id: 'background',
  image: assets.realmBackground,
  size: [1672, 941],
  hot: { gb: [18, 78], r: [110, 210] },
  sky: [70, 135],
  heat: 3.2,
  bloom: 0.55,
  flicker: 1,
  flames: [
    { x: 1622, y: 548, w: 78, h: 96, gain: 1.05 }, // big right brazier
    { x: 131, y: 579, w: 64, h: 62 },
    { x: 596, y: 634, w: 48, h: 50 },
    { x: 472, y: 538, w: 40, h: 50 },
    { x: 24, y: 381, w: 42, h: 42 },
    { x: 88, y: 460, w: 36, h: 42 },
    { x: 687, y: 694, w: 24, h: 26, gain: 0.8 },
    { x: 397, y: 630, w: 22, h: 24, gain: 0.8 },
  ],
  moon: { x: 1420, y: 164, r: 112, gain: 1, surface: 0.8, corona: 1 },
  swords: [
    // the statue's rune blade, hanging point-down from the clasped hands
    { from: [297, 326], to: [298, 626], w0: 27, w1: 2.6, color: [1, 0.14, 0.12], gain: 1 },
  ],
  flows: [
    // rune-lit castle windows & bridges across the valley
    { rect: [560, 0, 1672, 470], dir: [0, -10], scale: 44, gain: 0.7, contrast: 1.2, color: [1, 0.45, 0.12] },
    // lava embers strewn across the foreground rocks
    { rect: [0, 700, 360, 941], dir: [6, -8], scale: 40, gain: 0.9, contrast: 1.5, color: [1, 0.35, 0.08] },
    { rect: [1330, 700, 1672, 941], dir: [-6, -8], scale: 40, gain: 0.9, contrast: 1.5, color: [1, 0.35, 0.08] },
  ],
  fog: [
    // mist rolling in across the wet floor
    { y0: 560, y1: 800, soft: 90, speed: 16, scale: 320, density: 0.8, tint: [0.96, 0.84, 0.84], seed: 1.3 },
    { y0: 600, y1: 860, soft: 120, speed: -26, scale: 480, density: 0.7, tint: [0.92, 0.78, 0.78], seed: 6.1 },
    // the valley bank beneath the castle
    { y0: 250, y1: 600, soft: 140, speed: 9, scale: 420, density: 0.5, tint: [0.86, 0.7, 0.72], seed: 9.7 },
  ],
  embers: [
    { x: 1622, y: 540, spread: 46, rise: 260, count: 18, size: 5 },
    { x: 131, y: 572, spread: 34, rise: 200, count: 12, size: 4.5 },
    { x: 596, y: 628, spread: 26, rise: 170, count: 9, size: 4 },
    { x: 472, y: 532, spread: 24, rise: 170, count: 9, size: 4 },
    { x: 24, y: 376, spread: 24, rise: 150, count: 7, size: 4 },
    { x: 88, y: 455, spread: 20, rise: 150, count: 6, size: 4 },
    { x: 297, y: 520, spread: 22, rise: 200, count: 12, size: 3.6 }, // rising off the blade
    { x: 90, y: 880, spread: 130, rise: 90, count: 12, size: 3.4 },
    { x: 1580, y: 890, spread: 120, rise: 90, count: 10, size: 3.4 },
  ],
};

/* ──────────────────────────────────────────────────────────────────────────
   realm-secondary — the cloaked knight, burning castle, lava falls, blood moon
   ────────────────────────────────────────────────────────────────────────── */
export const SECONDARY_SCENE: SceneConfig = {
  id: 'secondary',
  image: assets.realmSecondary,
  size: [1672, 941],
  hot: { gb: [14, 70], r: [100, 200] },
  sky: [75, 140],
  heat: 2.6,
  bloom: 0.5,
  flicker: 1,
  flames: [
    // fire licking along the castle terrace
    { x: 1126, y: 322, w: 70, h: 64, gain: 0.95 },
    { x: 1012, y: 344, w: 58, h: 56, gain: 0.9 },
    { x: 1282, y: 360, w: 52, h: 46, gain: 0.85 },
    { x: 1190, y: 338, w: 46, h: 40, gain: 0.75 },
    { x: 1066, y: 336, w: 44, h: 40, gain: 0.75 },
  ],
  moon: { x: 1284, y: 159, r: 144, gain: 1, surface: 0.85, corona: 1 },
  swords: [
    // the knight's blade: heated from the crossguard to the point
    { from: [782, 554], to: [968, 766], w0: 11.5, w1: 1.6, color: [1, 0.22, 0.1], gain: 1.1 },
  ],
  flows: [
    // lava falls pour down the cliff
    { rect: [972, 340, 1045, 492], dir: [0, 70], scale: 26, gain: 1.4, contrast: 1.2, color: [1, 0.5, 0.12] },
    { rect: [1492, 425, 1556, 500], dir: [0, 70], scale: 26, gain: 1.4, contrast: 1.2, color: [1, 0.5, 0.12] },
    // seams of fire burning through the cloud deck
    { rect: [560, 120, 1672, 350], dir: [-16, -3], scale: 64, gain: 0.95, contrast: 1.3, color: [1, 0.5, 0.14] },
    // the castle's burning bastions
    { rect: [900, 150, 1360, 360], dir: [0, -28], scale: 38, gain: 0.95, contrast: 1.2, color: [1, 0.5, 0.14] },
    // lava veins through the foreground rock + the river far right
    { rect: [0, 700, 1000, 941], dir: [10, -6], scale: 44, gain: 1.1, contrast: 1.4, color: [1, 0.42, 0.1] },
    { rect: [1100, 520, 1672, 900], dir: [22, 10], scale: 50, gain: 0.9, contrast: 1.4, color: [1, 0.42, 0.1] },
  ],
  // no added smoke: the painting already has a cloud sea — it is animated in place
  fog: [],
  fogFlow: { amp: 42, speed: 0.06 },
  embers: [
    { x: 1150, y: 330, spread: 230, rise: 150, count: 24, size: 4.4 }, // burning castle
    { x: 1000, y: 380, spread: 40, rise: 120, count: 8, size: 3.6 },
    { x: 380, y: 880, spread: 420, rise: 120, count: 26, size: 3.8 }, // foreground lava rock
    { x: 880, y: 650, spread: 90, rise: 140, count: 10, size: 3.4 }, // sparks off the blade
    { x: 1420, y: 700, spread: 220, rise: 100, count: 10, size: 3.4 },
  ],
};

/* ──────────────────────────────────────────────────────────────────────────
   ritual-chamber — gothic hall, eight wall torches, floor ritual circle
   ────────────────────────────────────────────────────────────────────────── */
export const RITUAL_SCENE: SceneConfig = {
  id: 'ritual',
  image: assets.ritualChamber,
  size: [1672, 941],
  hot: { gb: [10, 50], r: [130, 220] },
  sky: [70, 135],
  heat: 2.4,
  bloom: 0.4,
  flicker: 1,
  flames: [
    // y = the RIM of each bowl, so fire burns out of the bowl instead of over it
    { x: 80, y: 289, w: 50, h: 64, gain: 1.05, sharp: true },
    { x: 1592, y: 291, w: 50, h: 64, gain: 1.05, sharp: true },
    { x: 378, y: 380, w: 38, h: 46, sharp: true },
    { x: 1294, y: 384, w: 38, h: 46, sharp: true },
    { x: 139, y: 531, w: 26, h: 34, gain: 0.9, sharp: true },
    { x: 1533, y: 531, w: 26, h: 34, gain: 0.9, sharp: true },
    { x: 253, y: 535, w: 17, h: 21, gain: 0.8, sharp: true },
    { x: 1419, y: 535, w: 17, h: 21, gain: 0.8, sharp: true },
  ],
  moon: null,
  swords: [],
  flows: [],
  fog: [
    { y0: 500, y1: 900, soft: 130, speed: 14, scale: 340, density: 0.4, tint: [0.96, 0.84, 0.84], seed: 3.1 },
    { y0: 560, y1: 941, soft: 150, speed: -20, scale: 500, density: 0.32, tint: [0.92, 0.78, 0.8], seed: 8.3 },
  ],
  embers: [
    { x: 80, y: 284, spread: 30, rise: 240, count: 12, size: 4.4 },
    { x: 1592, y: 286, spread: 30, rise: 240, count: 12, size: 4.4 },
    { x: 378, y: 374, spread: 22, rise: 190, count: 8, size: 4 },
    { x: 1294, y: 378, spread: 22, rise: 190, count: 8, size: 4 },
    { x: 139, y: 526, spread: 16, rise: 120, count: 5, size: 3.6 },
    { x: 1533, y: 526, spread: 16, rise: 120, count: 5, size: 3.6 },
    { x: 836, y: 700, spread: 460, rise: 100, count: 22, size: 3.2 }, // sparks off the ritual circle
  ],
};

/* ──────────────────────────────────────────────────────────────────────────
   gate-closed — the realm gate: dragon, twin guards with glowing swords, braziers
   (login / register / forgot backdrop)
   ────────────────────────────────────────────────────────────────────────── */
export const GATE_SCENE: SceneConfig = {
  id: 'gate',
  image: assets.gateClosed,
  size: [1672, 941],
  hot: { gb: [18, 78], r: [110, 210] },
  sky: [70, 135],
  heat: 2.8,
  bloom: 0.5,
  flicker: 1,
  flames: [
    // y = rim of each bowl
    { x: 75, y: 690, w: 64, h: 66, gain: 1.05, sharp: true },
    { x: 281, y: 743, w: 54, h: 60, sharp: true },
    { x: 1491, y: 744, w: 54, h: 60, sharp: true },
    { x: 1660, y: 692, w: 64, h: 66, gain: 1.05, sharp: true },
  ],
  moon: { x: 1453, y: 172, r: 145, gain: 1, surface: 0.8, corona: 0.95 },
  swords: [
    { from: [505, 536], to: [506, 738], w0: 14, w1: 2.2, color: [1, 0.14, 0.12], gain: 1 },
    { from: [1256, 532], to: [1256, 738], w0: 14, w1: 2.2, color: [1, 0.14, 0.12], gain: 1 },
  ],
  flows: [],
  fog: [], // the painting already carries its own mist — animated in place below
  fogFlow: { amp: 34, speed: 0.06 },
  embers: [
    { x: 75, y: 684, spread: 30, rise: 210, count: 10, size: 4.4 },
    { x: 281, y: 737, spread: 26, rise: 190, count: 8, size: 4 },
    { x: 1491, y: 738, spread: 26, rise: 190, count: 8, size: 4 },
    { x: 1660, y: 686, spread: 30, rise: 210, count: 10, size: 4.4 },
    { x: 505, y: 640, spread: 24, rise: 170, count: 8, size: 3.4 },
    { x: 1256, y: 640, spread: 24, rise: 170, count: 8, size: 3.4 },
  ],
};

export const SCENES: Record<SceneConfig['id'], SceneConfig> = {
  background: BACKGROUND_SCENE,
  secondary: SECONDARY_SCENE,
  ritual: RITUAL_SCENE,
  gate: GATE_SCENE,
};

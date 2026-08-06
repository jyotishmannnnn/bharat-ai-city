// Fixed 32-colour NES/Game-Boy-era palette.
//
// Every colour drawn to the retro canvas is snapped to one of these entries via
// `quantize()`. The per-sector accent/gradient colours in sectors.json are NOT
// edited -- they are quantised at draw time, so each sector keeps its identity
// while the whole game stays inside one cohesive limited palette.

export const PALETTE = [
  "#0f0f17", // 0  near-black (backdrop)
  "#1b1b2e", // 1  deep indigo
  "#2c2c46", // 2  slate shadow
  "#464663", // 3  slate mid
  "#6b6b8c", // 4  slate light
  "#9a9ab5", // 5  silver
  "#d4d4e4", // 6  off-white
  "#ffffff", // 7  white
  "#7c1f3a", // 8  blood
  "#c8283f", // 9  red
  "#f4526a", // 10 coral
  "#ff9db0", // 11 pink
  "#a3401a", // 12 rust
  "#e2652a", // 13 orange
  "#f79a3c", // 14 amber
  "#ffd479", // 15 sand
  "#8a6a12", // 16 bronze
  "#d4a520", // 17 gold
  "#f7e04c", // 18 yellow
  "#1d5c33", // 19 forest
  "#2f9e4a", // 20 green
  "#63d16b", // 21 lime
  "#b6f08a", // 22 mint
  "#10525e", // 23 deep teal
  "#1a8fa3", // 24 teal
  "#3fc9d4", // 25 cyan
  "#9defe8", // 26 ice
  "#1e3a80", // 27 navy
  "#2f6fd0", // 28 blue
  "#5fa8f5", // 29 sky
  "#6b3fa0", // 30 purple
  "#b06fe0", // 31 violet
] as const;

export type PaletteIndex = number;

/** Semantic aliases so drawing code reads clearly instead of using raw indices. */
export const C = {
  black: 0,
  bgDeep: 1,
  shadow: 2,
  slate: 3,
  slateLight: 4,
  silver: 5,
  offWhite: 6,
  white: 7,
  red: 9,
  coral: 10,
  orange: 13,
  amber: 14,
  gold: 17,
  yellow: 18,
  green: 20,
  lime: 21,
  teal: 24,
  cyan: 25,
  ice: 26,
  navy: 27,
  blue: 28,
  sky: 29,
  purple: 30,
  violet: 31,
} as const;

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const PALETTE_RGB = PALETTE.map(hexToRgb);
const quantizeCache = new Map<string, PaletteIndex>();

/** Snap an arbitrary CSS hex colour to the nearest palette index.
 *  Uses perceptual weighting (green matters most to the eye). Cached, so the
 *  render loop never pays for this more than once per distinct colour. */
export function quantize(hex: string): PaletteIndex {
  const hit = quantizeCache.get(hex);
  if (hit !== undefined) return hit;

  const [r, g, b] = hexToRgb(hex);
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < PALETTE_RGB.length; i++) {
    const [pr, pg, pb] = PALETTE_RGB[i];
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  quantizeCache.set(hex, best);
  return best;
}

export function css(index: PaletteIndex): string {
  return PALETTE[((index % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

/** Ordered ramps used for cheap "shading" of a tinted sprite: given any palette
 *  index we can find a darker / lighter neighbour that still belongs to the
 *  same hue family, which is what makes the pixel shading read as deliberate. */
const RAMPS: number[][] = [
  [0, 1, 2, 3, 4, 5, 6, 7], // neutrals
  [8, 9, 10, 11], // reds
  [12, 13, 14, 15], // oranges
  [16, 17, 18], // golds
  [19, 20, 21, 22], // greens
  [23, 24, 25, 26], // teals
  [27, 28, 29], // blues
  [30, 31], // purples
];

function rampFor(index: PaletteIndex): { ramp: number[]; pos: number } {
  for (const ramp of RAMPS) {
    const pos = ramp.indexOf(index);
    if (pos !== -1) return { ramp, pos };
  }
  return { ramp: RAMPS[0], pos: 3 };
}

/** Step along a colour's hue ramp. Negative = darker, positive = lighter. */
export function shade(index: PaletteIndex, steps: number): PaletteIndex {
  const { ramp, pos } = rampFor(index);
  const next = Math.max(0, Math.min(ramp.length - 1, pos + steps));
  return ramp[next];
}

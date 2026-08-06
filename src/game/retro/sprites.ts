// Code-authored 8-bit sprites.
//
// Each sprite is a grid of characters. Characters are resolved against a
// per-entity "tint" at draw time, which is how one sprite set stays cohesive
// while still carrying each sector's accent colour:
//
//   .  transparent      K  outline (near-black)
//   D  tint, darkest    M  tint (base)
//   L  tint, lighter    W  tint, lightest
//   H  pure white highlight
//   S  neutral shadow
//
// Frame counts are deliberately small (2-4) to stay period-accurate.

import { PaletteIndex, shade, C } from "./palette";

export type Sprite = readonly string[];

export const PLAYER_SIZE = 16;
export const ENTITY_SIZE = 12;

/** Resolve a sprite character to a palette index for a given tint. */
export function resolveChar(ch: string, tint: PaletteIndex): PaletteIndex | null {
  switch (ch) {
    case ".":
      return null;
    case "K":
      return C.black;
    case "S":
      return C.shadow;
    case "H":
      return C.white;
    case "D":
      return shade(tint, -2);
    case "M":
      return tint;
    case "L":
      return shade(tint, 1);
    case "W":
      return shade(tint, 2);
    default:
      return null;
  }
}

// ---------------------------------------------------------------- player ---
// 16x16 founder: hard hat, badge on chest. Two-frame idle bob + a hurt frame.

const PLAYER_A: Sprite = [
  "................",
  ".....KKKKKK.....",
  "....KMMMMMMK....",
  "....KMLLLLMK....",
  "...KKKKKKKKKK...",
  "....KWWWWWWK....",
  "....KWKWWKWK....",
  "....KWWWWWWK....",
  ".....KKKKKK.....",
  "...KMMMMMMMMK...",
  "..KMMMLLLLMMMK..",
  "..KMMLWHHWLMMK..",
  "..KMMMLLLLMMMK..",
  "..KMMMMMMMMMMK..",
  "...KKK....KKK...",
  "...KDD....KDD...",
];

const PLAYER_B: Sprite = [
  "................",
  "................",
  ".....KKKKKK.....",
  "....KMMMMMMK....",
  "....KMLLLLMK....",
  "...KKKKKKKKKK...",
  "....KWWWWWWK....",
  "....KWKWWKWK....",
  "....KWWWWWWK....",
  ".....KKKKKK.....",
  "...KMMMMMMMMK...",
  "..KMMMLLLLMMMK..",
  "..KMMLWHHWLMMK..",
  "..KMMMLLLLMMMK..",
  "..KKKMMMMMMKKK..",
  "..KDD......KDD..",
];

const PLAYER_HURT: Sprite = [
  "................",
  ".....KKKKKK.....",
  "....KMMMMMMK....",
  "....KMLLLLMK....",
  "...KKKKKKKKKK...",
  "....KWWWWWWK....",
  "....KWKWWKWK....",
  "....KWKKKKWK....",
  ".....KKKKKK.....",
  "...KMMMMMMMMK...",
  "..KMMMDDDDMMMK..",
  "..KMMDMKKMDMMK..",
  "..KMMMDDDDMMMK..",
  "..KMMMMMMMMMMK..",
  "..KKK......KKK..",
  "..KDD......KDD..",
];

export const PLAYER_FRAMES: Sprite[] = [PLAYER_A, PLAYER_B];
export const PLAYER_HURT_FRAME: Sprite = PLAYER_HURT;

// ----------------------------------------------------------- collectibles ---

const GEM: Sprite = [
  "....KKKK....",
  "...KLLLLK...",
  "..KLWWWWLK..",
  ".KLWMMMMWLK.",
  "KLWMMMMMMWLK",
  ".KMMMMMMMMK.",
  "..KMMMMMMK..",
  "...KMMMMK...",
  "....KMMK....",
  ".....KK.....",
  "............",
  "............",
];

const COIN: Sprite = [
  "....KKKK....",
  "..KKLLLLKK..",
  ".KLWWLLLLMK.",
  "KLWWLLLLLMMK",
  "KLWLLLLLLMMK",
  "KLLLLLLLLMMK",
  "KMLLLLLLMMMK",
  ".KMLLLLMMMK.",
  "..KKMMMMKK..",
  "....KKKK....",
  "............",
  "............",
];

const STAR: Sprite = [
  ".....KK.....",
  "....KLLK....",
  "....KLLK....",
  "KKKKKLLKKKKK",
  ".KLLLLLLLLK.",
  "..KLLLLLLK..",
  "...KLLLLK...",
  "..KLLKKLLK..",
  ".KLK....KLK.",
  "KK........KK",
  "............",
  "............",
];

const CHIP: Sprite = [
  "............",
  ".KKKKKKKKKK.",
  ".KMMMMMMMMK.",
  ".KMWWWWWWMK.",
  ".KMWLLLLWMK.",
  ".KMWLLLLWMK.",
  ".KMWWWWWWMK.",
  ".KMMMMMMMMK.",
  ".KKKKKKKKKK.",
  "............",
  "............",
  "............",
];

export const COLLECT_SPRITES: Sprite[] = [GEM, COIN, STAR, CHIP];

// --------------------------------------------------------------- hazards ---

const SPIKEBALL: Sprite = [
  "....K..K....",
  "..K.KKKK.K..",
  "...KDDDDK...",
  ".KKDMMMMDKK.",
  "..KDMMMMDK..",
  "KKDMMMMMMDKK",
  "KKDMMMMMMDKK",
  "..KDMMMMDK..",
  ".KKDMMMMDKK.",
  "...KDDDDK...",
  "..K.KKKK.K..",
  "....K..K....",
];

const BARRIER: Sprite = [
  "............",
  "KKKKKKKKKKKK",
  "KWWKKWWKKWWK",
  "KWWKKWWKKWWK",
  "KKKKKKKKKKKK",
  "KMMMMMMMMMMK",
  "KMMMMMMMMMMK",
  "KKKKKKKKKKKK",
  "KWWKKWWKKWWK",
  "KWWKKWWKKWWK",
  "KKKKKKKKKKKK",
  "............",
];

const GLITCH: Sprite = [
  "..KKKKKKKK..",
  ".KMMMMMMMMK.",
  "KMMMMMMMMMMK",
  "KMKKMMMMKKMK",
  "KMKKMMMMKKMK",
  "KMMMMMMMMMMK",
  "KMMMKKKKMMMK",
  ".KMMMMMMMMK.",
  "..KMKMMKMK..",
  "...KKKKKK...",
  "............",
  "............",
];

export const OBSTACLE_SPRITES: Sprite[] = [SPIKEBALL, BARRIER, GLITCH];

// -------------------------------------------------------------- powerups ---

const PU_SHIELD: Sprite = [
  "..KKKKKKKK..",
  ".KWWWWWWWWK.",
  "KWLLLLLLLLWK",
  "KWLMMMMMMLWK",
  "KWLMMMMMMLWK",
  "KWLMMMMMMLWK",
  ".KWLMMMMLWK.",
  "..KWLMMLWK..",
  "...KWLLWK...",
  "....KWWK....",
  ".....KK.....",
  "............",
];

const PU_MULTIPLIER: Sprite = [
  "............",
  ".MM......MM.",
  "..MM....MM..",
  "...MM..MM...",
  "....MMMM....",
  ".....MM.....",
  "....MMMM....",
  "...MM..MM...",
  "..MM....MM..",
  ".MM......MM.",
  "............",
  "............",
];

const PU_SLOWMO: Sprite = [
  "KKKKKKKKKKKK",
  "KMMMMMMMMMMK",
  ".KWWWWWWWWK.",
  "..KWWWWWWK..",
  "...KWWWWK...",
  "....KWWK....",
  "....KWWK....",
  "...KWLLWK...",
  "..KWLLLLWK..",
  ".KWLLLLLLWK.",
  "KMMMMMMMMMMK",
  "KKKKKKKKKKKK",
];

const PU_MAGNET: Sprite = [
  ".KKKK..KKKK.",
  ".KMMK..KMMK.",
  ".KMMK..KMMK.",
  ".KMMK..KMMK.",
  ".KMMK..KMMK.",
  ".KMMKKKKMMK.",
  ".KMMMMMMMMK.",
  ".KMMMMMMMMK.",
  "..KMMMMMMK..",
  "...KKKKKK...",
  "............",
  "............",
];

const PU_LIFE: Sprite = [
  "..KK....KK..",
  ".KWWK..KWWK.",
  "KWWWWKKWWWWK",
  "KWMMMMMMMMWK",
  "KWMMMMMMMMWK",
  ".KMMMMMMMMK.",
  "..KMMMMMMK..",
  "...KMMMMK...",
  "....KMMK....",
  ".....KK.....",
  "............",
  "............",
];

/** Powerup art is chosen by effect so the pickup always reads correctly,
 *  regardless of which sector supplied it. */
export const POWERUP_SPRITES: Record<string, Sprite> = {
  shield: PU_SHIELD,
  multiplier: PU_MULTIPLIER,
  slowmo: PU_SLOWMO,
  magnet: PU_MAGNET,
  extraLife: PU_LIFE,
};

// ----------------------------------------------------------------- decor ---
/** 8x8 animated tiles used along the roadside. */
export const TREE: Sprite = [
  "..KKKK..",
  ".KMMMMK.",
  "KMLLMMMK",
  "KMLLMMMK",
  ".KMMMMK.",
  "..KDDK..",
  "..KDDK..",
  "..KDDK..",
];

export const ANTENNA_FRAMES: Sprite[] = [
  [
    "....H...",
    "...KMK..",
    "....M...",
    "....M...",
    "...KMK..",
    "..KMMMK.",
    "..KMMMK.",
    "..KKKKK.",
  ],
  [
    "........",
    "...KMK..",
    "....M...",
    "....M...",
    "...KMK..",
    "..KMMMK.",
    "..KMMMK.",
    "..KKKKK.",
  ],
];

/** Dev guard: every sprite row must be the same width, or drawing silently
 *  shears. Runs once at module load in development only. */
function assertRect(name: string, s: Sprite, w: number, h: number) {
  if (s.length !== h) throw new Error(`sprite ${name}: expected ${h} rows, got ${s.length}`);
  s.forEach((row, i) => {
    if (row.length !== w) {
      throw new Error(`sprite ${name} row ${i}: expected width ${w}, got ${row.length}`);
    }
  });
}

if (process.env.NODE_ENV !== "production") {
  PLAYER_FRAMES.forEach((s, i) => assertRect(`player[${i}]`, s, PLAYER_SIZE, PLAYER_SIZE));
  assertRect("playerHurt", PLAYER_HURT_FRAME, PLAYER_SIZE, PLAYER_SIZE);
  COLLECT_SPRITES.forEach((s, i) => assertRect(`collect[${i}]`, s, ENTITY_SIZE, ENTITY_SIZE));
  OBSTACLE_SPRITES.forEach((s, i) => assertRect(`obstacle[${i}]`, s, ENTITY_SIZE, ENTITY_SIZE));
  Object.entries(POWERUP_SPRITES).forEach(([k, s]) => assertRect(`powerup.${k}`, s, ENTITY_SIZE, ENTITY_SIZE));
  assertRect("tree", TREE, 8, 8);
  ANTENNA_FRAMES.forEach((s, i) => assertRect(`antenna[${i}]`, s, 8, 8));
}

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
  assertRect("tree", TREE, 8, 8);
  ANTENNA_FRAMES.forEach((s, i) => assertRect(`antenna[${i}]`, s, 8, 8));
}

// 5x7 bitmap font, drawn as literal pixels on the retro canvas.
// No webfont, no ctx.fillText, no anti-aliasing -- every glyph is a grid of
// hard-edged rectangles so text sits on the same pixel grid as the sprites.

export const GLYPH_W = 5;
export const GLYPH_H = 7;
/** 1px letter-spacing baked into the advance width. */
export const GLYPH_ADVANCE = GLYPH_W + 1;

const G: Record<string, string[]> = {
  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["#####", "...#.", "..#..", "...#.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["....#", "....#", "....#", "....#", "#...#", "#...#", ".###."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#...#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  ".": [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
  ",": [".....", ".....", ".....", ".....", "..#..", "..#..", ".#..."],
  ":": [".....", "..#..", "..#..", ".....", "..#..", "..#..", "....."],
  "%": ["#...#", "#..#.", "...#.", "..#..", ".#...", ".#..#", "#...#"],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "*": [".....", "#.#.#", ".###.", "#####", ".###.", "#.#.#", "....."],
};

const FALLBACK = G["?"];

export function glyphFor(ch: string): string[] {
  return G[ch.toUpperCase()] ?? FALLBACK;
}

/** Width in retro-pixels of a string at the given scale (trailing gap trimmed). */
export function measureText(text: string, scale = 1): number {
  if (text.length === 0) return 0;
  return (text.length * GLYPH_ADVANCE - 1) * scale;
}

export interface TextOpts {
  scale?: number;
  /** Draw a 1px hard drop-shadow underneath for readability over busy tiles. */
  shadow?: string | null;
  align?: "left" | "center" | "right";
}

/** Draw text on the retro backbuffer. `x`/`y` are in retro-pixels; `y` is the
 *  glyph top edge. Colours are CSS strings already resolved from the palette. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  opts: TextOpts = {}
): void {
  const scale = Math.max(1, Math.floor(opts.scale ?? 1));
  const align = opts.align ?? "left";
  const width = measureText(text, scale);

  let startX = x;
  if (align === "center") startX = Math.round(x - width / 2);
  else if (align === "right") startX = Math.round(x - width);

  const passes: { dx: number; dy: number; fill: string }[] = [];
  if (opts.shadow) passes.push({ dx: scale, dy: scale, fill: opts.shadow });
  passes.push({ dx: 0, dy: 0, fill: color });

  for (const pass of passes) {
    ctx.fillStyle = pass.fill;
    for (let i = 0; i < text.length; i++) {
      const rows = glyphFor(text[i]);
      const gx = startX + i * GLYPH_ADVANCE * scale + pass.dx;
      for (let r = 0; r < GLYPH_H; r++) {
        const row = rows[r];
        let c = 0;
        // Run-length the row so a horizontal bar is one fillRect, not five.
        while (c < GLYPH_W) {
          if (row[c] !== "#") {
            c++;
            continue;
          }
          let run = 1;
          while (c + run < GLYPH_W && row[c + run] === "#") run++;
          ctx.fillRect(
            gx + c * scale,
            y + r * scale + pass.dy,
            run * scale,
            scale
          );
          c += run;
        }
      }
    }
  }
}

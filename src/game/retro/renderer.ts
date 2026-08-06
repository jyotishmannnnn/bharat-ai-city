// Pixel-perfect retro renderer.
//
// The canvas backing store is the ACTUAL low resolution (~128px wide). The
// browser upscales it with `image-rendering: pixelated`, which gives true
// nearest-neighbour scaling with zero anti-aliasing and costs nothing -- we
// only ever rasterise ~128x280 pixels per frame regardless of device DPI.
//
// This module is presentation-only. It reads EngineSnapshot and never writes
// to it, so gameplay, physics and collision remain untouched.

import { EngineSnapshot, LANES, MISSION_DURATION_MS } from "@/game/engine";
import { SectorTheme } from "@/game/types";
import { C, css, quantize, shade, PaletteIndex } from "./palette";
import { drawText, measureText } from "./font";
import {
  PLAYER_FRAMES,
  PLAYER_HURT_FRAME,
  Sprite,
  resolveChar,
  PLAYER_SIZE,
  TREE,
  ANTENNA_FRAMES,
} from "./sprites";
import {
  ITEMS,
  POWERUP_ITEMS,
  SECTOR_ITEMS,
  ItemSprite,
  resolveFixed,
  ITEM_SIZE,
} from "./items";

/** Target retro width. Actual width flexes slightly to fill the viewport at a
 *  whole-number scale factor, keeping pixel density identical everywhere. */
const BASE_W = 128;
const MIN_SCALE = 2;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: PaletteIndex;
  size: number;
  gravity: number;
}

export class RetroRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  w = BASE_W;
  h = 240;
  scale = 3;

  private particles: Particle[] = [];
  private skyline: HTMLCanvasElement | null = null;
  private skylineKey = "";
  private ditherCache = new Map<string, CanvasPattern>();

  /** Tracked so we can emit particles exactly when engine counters change,
   *  without the engine needing to know the renderer exists. */
  private lastCollected = 0;
  private lastHits = 0;
  private lastCombo = 0;
  private hurtUntil = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Recompute the low-res backing store for the element's CSS size. */
  resize(cssW: number, cssH: number): void {
    if (cssW <= 0 || cssH <= 0) return;
    const scale = Math.max(MIN_SCALE, Math.floor(cssW / BASE_W));
    const w = Math.max(64, Math.round(cssW / scale));
    const h = Math.max(64, Math.round(cssH / scale));
    if (w === this.w && h === this.h && scale === this.scale) return;
    this.scale = scale;
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = false;
    this.skyline = null; // force rebuild at the new size
  }

  // ------------------------------------------------------------ primitives ---

  private rect(x: number, y: number, w: number, h: number, color: PaletteIndex) {
    this.ctx.fillStyle = css(color);
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** 2x2 checkerboard dither between two palette colours -- replaces gradients. */
  private dither(x: number, y: number, w: number, h: number, a: PaletteIndex, b: PaletteIndex) {
    const key = `${a}:${b}`;
    let pat = this.ditherCache.get(key);
    if (!pat) {
      const tile = document.createElement("canvas");
      tile.width = 2;
      tile.height = 2;
      const tctx = tile.getContext("2d");
      if (!tctx) return;
      tctx.fillStyle = css(a);
      tctx.fillRect(0, 0, 2, 2);
      tctx.fillStyle = css(b);
      tctx.fillRect(0, 0, 1, 1);
      tctx.fillRect(1, 1, 1, 1);
      const created = this.ctx.createPattern(tile, "repeat");
      if (!created) return;
      pat = created;
      this.ditherCache.set(key, pat);
    }
    this.ctx.fillStyle = pat;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  private sprite(s: Sprite, x: number, y: number, tint: PaletteIndex, flipY = false) {
    const ox = Math.round(x);
    const oy = Math.round(y);
    const rows = s.length;
    for (let r = 0; r < rows; r++) {
      const row = s[flipY ? rows - 1 - r : r];
      let c = 0;
      while (c < row.length) {
        const ch = row[c];
        const col = resolveChar(ch, tint);
        if (col === null) {
          c++;
          continue;
        }
        // Run-length identical characters into a single fillRect.
        let run = 1;
        while (c + run < row.length && row[c + run] === ch) run++;
        this.ctx.fillStyle = css(col);
        this.ctx.fillRect(ox + c, oy + r, run, 1);
        c += run;
      }
    }
  }

  /** Fixed-colour item sprite (Minecraft-style): colours come from the sprite
   *  itself, not from the sector accent, so a pill always looks like a pill. */
  private item(s: ItemSprite, x: number, y: number) {
    const ox = Math.round(x);
    const oy = Math.round(y);
    for (let r = 0; r < s.length; r++) {
      const row = s[r];
      let c = 0;
      while (c < row.length) {
        const ch = row[c];
        const col = resolveFixed(ch);
        if (col === null) {
          c++;
          continue;
        }
        let run = 1;
        while (c + run < row.length && row[c + run] === ch) run++;
        this.ctx.fillStyle = css(col);
        this.ctx.fillRect(ox + c, oy + r, run, 1);
        c += run;
      }
    }
  }

  // ------------------------------------------------------------ particles ---

  private emit(
    x: number,
    y: number,
    color: PaletteIndex,
    count: number,
    speed: number,
    gravity = 0.00004
  ) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.6);
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1,
        maxLife: 1,
        color,
        size: Math.random() < 0.35 ? 2 : 1,
        gravity,
      });
    }
    // Hard cap: pixel particles are cheap but not free on 4-year-old Androids.
    if (this.particles.length > 140) {
      this.particles.splice(0, this.particles.length - 140);
    }
  }

  private updateParticles(dt: number) {
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt * 0.0018;
      if (p.life > 0) next.push(p);
    }
    this.particles = next;
  }

  private drawParticles() {
    for (const p of this.particles) {
      // Fade by stepping down the colour ramp rather than using alpha, which
      // keeps every pixel on-palette.
      const step = p.life > 0.6 ? 1 : p.life > 0.3 ? 0 : -1;
      this.rect(p.x, p.y, p.size, p.size, shade(p.color, step));
    }
  }

  // ----------------------------------------------------------- background ---

  private buildSkyline(theme: SectorTheme) {
    const key = `${theme.id}:${this.w}x${this.h}`;
    if (this.skyline && this.skylineKey === key) return;

    const cv = document.createElement("canvas");
    cv.width = this.w;
    cv.height = this.h;
    const g = cv.getContext("2d");
    if (!g) return;
    g.imageSmoothingEnabled = false;

    const skyTop = quantize(theme.gradient[0]);
    const skyBottom = quantize(theme.gradient[1]);
    const horizon = Math.round(this.h * 0.42);

    // Flat sky bands + a dithered seam instead of a gradient.
    g.fillStyle = css(shade(skyTop, -1));
    g.fillRect(0, 0, this.w, Math.round(horizon * 0.55));
    g.fillStyle = css(skyTop);
    g.fillRect(0, Math.round(horizon * 0.55), this.w, horizon - Math.round(horizon * 0.55));

    // Stars in the upper band.
    const rnd = mulberry32(hashString(theme.id));
    g.fillStyle = css(C.offWhite);
    for (let i = 0; i < 26; i++) {
      const sx = Math.floor(rnd() * this.w);
      const sy = Math.floor(rnd() * horizon * 0.5);
      g.fillRect(sx, sy, 1, 1);
    }

    // Two parallax silhouette layers, deterministic per sector.
    const far = shade(skyBottom, -1);
    const near = shade(skyBottom, -2);
    for (const [layer, colIdx] of [[0, far], [1, near]] as const) {
      const baseY = horizon + layer * 8;
      let x = -4;
      while (x < this.w + 4) {
        const bw = 6 + Math.floor(rnd() * 10);
        const bh = 8 + Math.floor(rnd() * (layer === 0 ? 18 : 28));
        g.fillStyle = css(colIdx);
        g.fillRect(x, baseY - bh, bw, bh + 10);
        // Lit windows -- a couple of pixels, high contrast.
        if (layer === 1 && bw >= 7 && bh >= 12) {
          g.fillStyle = css(C.amber);
          for (let wy = baseY - bh + 3; wy < baseY - 3; wy += 4) {
            for (let wx = x + 2; wx < x + bw - 2; wx += 3) {
              if (rnd() > 0.55) g.fillRect(wx, wy, 1, 1);
            }
          }
        }
        x += bw + 1 + Math.floor(rnd() * 2);
      }
    }

    // Ground fill below the skyline.
    const groundTop = horizon + 10;
    g.fillStyle = css(C.bgDeep);
    g.fillRect(0, groundTop, this.w, this.h - groundTop);

    this.skyline = cv;
    this.skylineKey = key;
  }

  // --------------------------------------------------------------- render ---

  render(snapshot: EngineSnapshot, theme: SectorTheme, timeMs: number, dt: number): void {
    const { ctx, w, h } = this;
    const accent = quantize(theme.accent);

    this.updateParticles(dt);

    // Emit particles from engine counter deltas (read-only observation).
    if (snapshot.collected > this.lastCollected) {
      this.lastCollected = snapshot.collected;
    }
    if (snapshot.hits > this.lastHits) {
      this.lastHits = snapshot.hits;
      this.hurtUntil = timeMs + 350;
    }
    this.lastCombo = snapshot.combo;

    // Pixel-perfect screen shake: whole pixels only, never sub-pixel.
    const shakeAmt = snapshot.screenShake;
    const shakeX = shakeAmt > 0 ? Math.round((Math.random() - 0.5) * 6 * shakeAmt) : 0;
    const shakeY = shakeAmt > 0 ? Math.round((Math.random() - 0.5) * 4 * shakeAmt) : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // --- background -------------------------------------------------------
    this.buildSkyline(theme);
    ctx.fillStyle = css(C.bgDeep);
    ctx.fillRect(-shakeX, -shakeY, w + Math.abs(shakeX) * 2, h + Math.abs(shakeY) * 2);
    if (this.skyline) ctx.drawImage(this.skyline, 0, 0);

    const laneW = w / LANES;
    const roadTop = Math.round(h * 0.42) + 10;
    const playerRowY = Math.round(h * 0.86);

    // Road surface with a subtle dithered edge.
    this.rect(0, roadTop, w, h - roadTop, C.shadow);
    this.dither(0, roadTop, w, 4, C.shadow, C.bgDeep);

    // Scrolling lane markers -- direction matches falling entities.
    const scroll = Math.floor((timeMs * 0.05) % 12);
    for (let i = 1; i < LANES; i++) {
      const lx = Math.round(i * laneW);
      for (let y = roadTop + scroll; y < h; y += 12) {
        this.rect(lx, y, 1, 6, C.slate);
      }
    }

    // Roadside decor, animated on a slow 2-frame cycle.
    const antFrame = Math.floor(timeMs / 380) % ANTENNA_FRAMES.length;
    this.sprite(ANTENNA_FRAMES[antFrame], 1, roadTop - 6, accent);
    this.sprite(TREE, w - 9, roadTop - 4, C.green);

    // Player row band.
    this.rect(0, playerRowY - 2, w, 1, shade(accent, -1));
    this.dither(0, playerRowY - 1, w, 3, C.shadow, shade(accent, -2));

    // --- entities ---------------------------------------------------------
    const sectorItems = SECTOR_ITEMS[theme.id];
    for (const e of snapshot.entities) {
      const ex = Math.round(e.lane * laneW + laneW / 2 - ITEM_SIZE / 2);
      const ey = Math.round(e.y * h - ITEM_SIZE / 2);

      let s: ItemSprite;
      if (e.kind === "collect") {
        const names = sectorItems?.collect ?? [];
        s = ITEMS[names[e.defIndex % names.length]] ?? ITEMS.CRATE;
      } else if (e.kind === "obstacle") {
        const names = sectorItems?.obstacle ?? [];
        s = ITEMS[names[e.defIndex % names.length]] ?? ITEMS.XMARK;
      } else {
        const effect = theme.powerups[e.defIndex]?.effect ?? "shield";
        s = POWERUP_ITEMS[effect] ?? POWERUP_ITEMS.shield;
      }

      // Hard 1px contact shadow, no blur -- replaces the old shadowBlur glow.
      this.rect(ex + 2, ey + ITEM_SIZE - 1, ITEM_SIZE - 4, 1, C.black);

      // Powerups sit on a blinking plate so they still read as "special"
      // even though their art is fixed-colour rather than sector-tinted.
      if (e.kind === "powerup" && Math.floor(timeMs / 140) % 2 === 0) {
        const glow = quantize(e.color);
        this.rect(ex - 1, ey + 1, 1, ITEM_SIZE - 2, shade(glow, 2));
        this.rect(ex + ITEM_SIZE, ey + 1, 1, ITEM_SIZE - 2, shade(glow, 2));
        this.rect(ex + 1, ey - 1, ITEM_SIZE - 2, 1, shade(glow, 2));
        this.rect(ex + 1, ey + ITEM_SIZE, ITEM_SIZE - 2, 1, shade(glow, 2));
      }

      this.item(s, ex, ey);
    }

    // --- player -----------------------------------------------------------
    const px = Math.round(snapshot.playerLane * laneW + laneW / 2 - PLAYER_SIZE / 2);
    const py = playerRowY - PLAYER_SIZE + 4;
    const hurt = timeMs < this.hurtUntil;
    const bob = Math.floor(timeMs / 220) % PLAYER_FRAMES.length;

    // Contact shadow.
    this.rect(px + 3, py + PLAYER_SIZE - 1, PLAYER_SIZE - 6, 1, C.black);

    if (hurt) {
      // Hurt flash: blink on a 2-frame cadence.
      if (Math.floor(timeMs / 70) % 2 === 0) {
        this.sprite(PLAYER_HURT_FRAME, px, py, C.red);
      }
    } else {
      this.sprite(PLAYER_FRAMES[bob], px, py, accent);
    }

    // Shield reads as a hard pixel ring, not a blur.
    if (snapshot.shieldActive) {
      const ringCol = Math.floor(timeMs / 100) % 2 === 0 ? C.cyan : C.ice;
      const rx = px - 2;
      const ry = py - 2;
      const rw = PLAYER_SIZE + 4;
      const rh = PLAYER_SIZE + 4;
      this.rect(rx + 2, ry, rw - 4, 1, ringCol);
      this.rect(rx + 2, ry + rh - 1, rw - 4, 1, ringCol);
      this.rect(rx, ry + 2, 1, rh - 4, ringCol);
      this.rect(rx + rw - 1, ry + 2, 1, rh - 4, ringCol);
    }

    this.drawParticles();

    // --- floating texts ---------------------------------------------------
    for (const f of snapshot.floatingTexts) {
      if (f.life <= 0) continue;
      const fx = Math.round(f.lane * laneW + laneW / 2);
      const fy = Math.round(f.y * h);
      const col = quantize(f.color);
      drawText(ctx, f.text, fx, fy, css(f.life > 0.4 ? col : shade(col, -1)), {
        scale: 1,
        align: "center",
        shadow: css(C.black),
      });
    }

    ctx.restore();

    // --- HUD (drawn on the pixel grid, never DOM) -------------------------
    this.drawHud(snapshot, theme, timeMs);
  }

  private drawHud(snapshot: EngineSnapshot, theme: SectorTheme, timeMs: number) {
    const { ctx, w } = this;
    const accent = quantize(theme.accent);

    // Top bar.
    this.rect(0, 0, w, 13, C.black);
    this.rect(0, 13, w, 1, shade(accent, -1));

    const secs = Math.ceil(snapshot.remainingMs / 1000);
    const urgent = secs <= 5 && secs > 0;
    // Final-countdown tension: blink the timer under 5s.
    const timeCol = urgent
      ? Math.floor(timeMs / 150) % 2 === 0
        ? C.red
        : C.coral
      : C.offWhite;
    drawText(ctx, `${secs}S`, 3, 3, css(timeCol), { scale: 1 });

    drawText(ctx, `${snapshot.score}`, w - 3, 3, css(C.yellow), {
      scale: 1,
      align: "right",
    });

    // Progress bar for elapsed mission time.
    const pct = Math.min(1, snapshot.elapsedMs / MISSION_DURATION_MS);
    this.rect(0, 14, Math.round(w * pct), 1, accent);

    // Combo indicator escalates in colour as it climbs.
    if (snapshot.combo >= 3) {
      const comboCol =
        snapshot.combo >= 10 ? C.coral : snapshot.combo >= 6 ? C.orange : C.yellow;
      const label = `${snapshot.combo}X COMBO`;
      const cx = Math.round(w / 2);
      const cw = measureText(label, 1);
      this.rect(cx - cw / 2 - 3, 18, cw + 6, 11, C.black);
      drawText(ctx, label, cx, 20, css(comboCol), { scale: 1, align: "center" });
    }

    // Active powerup banner.
    if (snapshot.activePowerupLabel) {
      const label = snapshot.activePowerupLabel.replace(/[^A-Z0-9 ]/gi, "").toUpperCase();
      const cx = Math.round(w / 2);
      const cw = measureText(label, 1);
      const y = snapshot.combo >= 3 ? 32 : 18;
      this.rect(cx - cw / 2 - 3, y, cw + 6, 11, shade(accent, -2));
      this.rect(cx - cw / 2 - 3, y, cw + 6, 1, shade(accent, 1));
      drawText(ctx, label, cx, y + 2, css(C.white), { scale: 1, align: "center" });
    }
  }

  /** Called by the React layer on discrete gameplay events so the renderer can
   *  throw pixel particles. Purely cosmetic. */
  burst(kind: "collect" | "hit" | "powerup", lane: number, color: string) {
    const laneW = this.w / LANES;
    const x = lane * laneW + laneW / 2;
    const y = this.h * 0.88;
    const tint = quantize(color);
    if (kind === "collect") this.emit(x, y, tint, 8, 0.035);
    else if (kind === "hit") this.emit(x, y, C.red, 16, 0.05, 0.00008);
    else this.emit(x, y, tint, 20, 0.045);
  }
}

"use client";

// Pixel-art renderer for the auditorium screen.
//
// The backing store is a real 480x270 buffer that the browser upscales with
// image-rendering:pixelated, so a 1080p projector draws ~130k pixels per frame
// no matter how many founders are in the room. Same palette, font and building
// sprites as the phone game, so the big screen and the phones look like one
// product.
//
// A founder is a tower, not a sprite: at capacity there are ~2400 buildings
// across 10 districts, which no 16x16 sprite grid could show. Each district
// keeps one landmark sprite for identity and fills its plot with 3px towers
// whose height scales with valuation.

import { useEffect, useMemo, useRef } from "react";
import { LeaderboardEntry, SectorId } from "@/game/types";
import { Building, DISTRICTS, buildingsByDistrict } from "@/lib/cityAggregate";
import { C, css, quantize, shade, PaletteIndex } from "@/game/retro/palette";
import { drawText, measureText } from "@/game/retro/font";
import { BUILDINGS, resolveFixed, ItemSprite } from "@/game/retro/items";

export type PresenterMode =
  | "auto"
  | "overview"
  | "topDistrict"
  | "latest"
  | "leaderboard"
  | "stats";

interface CityCanvasProps {
  rows: LeaderboardEntry[];
  latest: LeaderboardEntry | null;
  mode: PresenterMode;
  dim?: boolean;
  ending?: boolean;
}

/** Backbuffer. 480x270 is exactly 1/4 of 1080p, so on a standard projector every
 *  retro pixel is a clean 4x4 block. */
const VW = 480;
const VH = 270;

const COLS = 5;
const ROWS = 2;
const HUD_TOP = 34; // reserved for the metrics strip overlay
const CELL_W = VW / COLS;
const CELL_H = (VH - HUD_TOP) / ROWS;
const PAD = 3;

const TOWER_W = 3;
const TOWER_GAP = 1;
const TOWER_MAX_H = 13;

interface Cell {
  district: (typeof DISTRICTS)[number];
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  /** y of the ground line towers stand on */
  groundY: number;
}

const CELLS: Cell[] = DISTRICTS.map((district, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = Math.round(col * CELL_W + PAD);
  const y = Math.round(HUD_TOP + row * CELL_H + PAD);
  const w = Math.round(CELL_W - PAD * 2);
  const h = Math.round(CELL_H - PAD * 2);
  return { district, x, y, w, h, cx: x + w / 2, cy: y + h / 2, groundY: y + h - 6 };
});

function cellFor(sector: SectorId): Cell {
  return CELLS.find((c) => c.district.id === sector) ?? CELLS[0];
}

function seeded(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: Math.floor(seeded(`sx${i}`) * VW),
  y: Math.floor(seeded(`sy${i}`) * HUD_TOP * 1.6),
  bright: seeded(`sb${i}`) > 0.7,
}));

export default function CityCanvas({ rows, latest, mode, dim, ending }: CityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera>({ x: VW / 2, y: VH / 2, zoom: 1 });
  const autopilotPhaseRef = useRef<"pan" | "focusNewest" | "overview">("overview");
  const phaseStartRef = useRef(0);
  const clockRef = useRef(0);

  const grouped = useMemo(() => buildingsByDistrict(rows), [rows]);

  const topDistrictId = useMemo<SectorId | null>(() => {
    let best: SectorId | null = null;
    let bestCount = -1;
    for (const d of DISTRICTS) {
      const count = grouped[d.id]?.length ?? 0;
      if (count > bestCount) {
        bestCount = count;
        best = d.id;
      }
    }
    return bestCount > 0 ? best : null;
  }, [grouped]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext("2d", { alpha: false });
    if (!maybeCtx) return;
    // Re-bind as non-nullable: TS narrowing does not reach into the nested
    // draw()/drawDistrict() function declarations below, which would otherwise
    // produce dozens of "possibly null" errors.
    const ctx: CanvasRenderingContext2D = maybeCtx;

    canvas.width = VW;
    canvas.height = VH;
    ctx.imageSmoothingEnabled = false;

    let raf = 0;
    let last = performance.now();

    const rect = (x: number, y: number, w: number, h: number, col: PaletteIndex) => {
      ctx.fillStyle = css(col);
      ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    };

    const sprite = (s: ItemSprite, ox: number, oy: number) => {
      for (let r = 0; r < s.length; r++) {
        const row = s[r];
        let c = 0;
        while (c < row.length) {
          const ch = row[c];
          const col = resolveFixed(ch);
          if (col === null) { c++; continue; }
          let run = 1;
          while (c + run < row.length && row[c + run] === ch) run++;
          ctx.fillStyle = css(col);
          ctx.fillRect(Math.round(ox) + c, Math.round(oy) + r, run, 1);
          c += run;
        }
      }
    };

    function targetCameraFor(nowSec: number): Camera {
      if (mode === "topDistrict" && topDistrictId) {
        const cell = cellFor(topDistrictId);
        return { x: cell.cx, y: cell.cy, zoom: 2 };
      }
      if (mode === "latest" && latest) {
        const sector = latest.sectors[0];
        if (sector) {
          const cell = cellFor(sector);
          return { x: cell.cx, y: cell.cy, zoom: 2 };
        }
      }
      if (mode === "overview" || mode === "leaderboard" || mode === "stats") {
        return { x: VW / 2, y: VH / 2, zoom: 1 };
      }
      const elapsed = nowSec - phaseStartRef.current;
      const phase = autopilotPhaseRef.current;
      if (phase === "pan" && elapsed > 9) {
        autopilotPhaseRef.current = latest ? "focusNewest" : "overview";
        phaseStartRef.current = nowSec;
      } else if (phase === "focusNewest" && elapsed > 6) {
        autopilotPhaseRef.current = "overview";
        phaseStartRef.current = nowSec;
      } else if (phase === "overview" && elapsed > 14) {
        autopilotPhaseRef.current = "pan";
        phaseStartRef.current = nowSec;
      }
      if (autopilotPhaseRef.current === "pan") {
        const t = elapsed / 9;
        const idx = Math.floor(t * DISTRICTS.length) % DISTRICTS.length;
        const cell = cellFor(DISTRICTS[idx].id);
        return { x: cell.cx, y: cell.cy, zoom: 2 };
      }
      if (autopilotPhaseRef.current === "focusNewest" && latest) {
        const sector = latest.sectors[0];
        const cell = sector ? cellFor(sector) : null;
        if (cell) return { x: cell.cx, y: cell.cy, zoom: 2 };
      }
      return { x: VW / 2, y: VH / 2, zoom: 1 };
    }

    function drawDistrict(cell: Cell, list: Building[], t: number) {
      const accent = quantize(cell.district.accent);
      const count = list.length;
      const active = count > 0;

      // plot
      rect(cell.x, cell.y, cell.w, cell.h, active ? C.bgDeep : C.black);
      rect(cell.x, cell.y, cell.w, 1, active ? shade(accent, -1) : C.shadow);
      rect(cell.x, cell.y + cell.h - 1, cell.w, 1, active ? shade(accent, -1) : C.shadow);
      rect(cell.x, cell.y, 1, cell.h, active ? shade(accent, -1) : C.shadow);
      rect(cell.x + cell.w - 1, cell.y, 1, cell.h, active ? shade(accent, -1) : C.shadow);

      // landmark + label
      sprite(BUILDINGS[cell.district.id], cell.x + 2, cell.y + 1);
      drawText(ctx, cell.district.name.toUpperCase().slice(0, 12), cell.x + 20, cell.y + 3, css(active ? C.white : C.slate), { scale: 1 });
      drawText(ctx, `${count}`, cell.x + 20, cell.y + 11, css(active ? shade(accent, 2) : C.slate), { scale: 1 });

      // ground
      rect(cell.x + 1, cell.groundY, cell.w - 2, 1, C.slate);
      for (let x = cell.x + 2; x < cell.x + cell.w - 2; x += 4) {
        rect(x, cell.groundY + 2, 2, 1, C.shadow);
      }

      // towers: one per founder, newest on top of the stack
      const perRow = Math.floor((cell.w - 4) / (TOWER_W + TOWER_GAP));
      const maxRows = Math.floor((cell.groundY - (cell.y + 19)) / 4);
      const capacity = Math.max(1, perRow * maxRows);
      const shown = list.slice(-capacity);

      shown.forEach((b, i) => {
        const col = i % perRow;
        const row = Math.floor(i / perRow);
        const x = cell.x + 2 + col * (TOWER_W + TOWER_GAP);
        const baseY = cell.groundY - row * 4;
        const jitter = seeded(b.key);
        const h = 3 + Math.min(TOWER_MAX_H - 3, Math.round(b.valuationCr / 22) + Math.round(jitter * 2));
        const y = baseY - h;

        rect(x, y, TOWER_W, h, shade(accent, -1));
        rect(x, y, TOWER_W, 1, shade(accent, 1));
        // lit window blinking on its own phase so the block shimmers
        if (Math.sin(t * 1.6 + jitter * 12) > 0.35) {
          rect(x + 1, y + 2, 1, 1, C.amber);
        }
      });

      if (list.length > capacity) {
        drawText(ctx, `+${list.length - capacity}`, cell.x + cell.w - 3, cell.y + 3, css(C.amber), {
          scale: 1,
          align: "right",
        });
      }
    }

    function draw(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clockRef.current += dt;
      const t = clockRef.current;

      const target = targetCameraFor(t);
      const cam = cameraRef.current;
      const ease = ending ? 0.02 : 0.05;
      cam.x += (target.x - cam.x) * ease;
      cam.y += (target.y - cam.y) * ease;
      cam.zoom += (target.zoom - cam.zoom) * ease;

      // sky
      rect(0, 0, VW, VH, C.black);
      rect(0, 0, VW, HUD_TOP + 8, C.bgDeep);
      for (const s of STARS) {
        rect(s.x, s.y, 1, 1, s.bright ? C.offWhite : C.slateLight);
      }

      ctx.save();
      // Whole-pixel camera: sub-pixel translation would shimmer the whole grid.
      const z = cam.zoom;
      ctx.translate(
        Math.round(VW / 2 - cam.x * z),
        Math.round(VH / 2 - cam.y * z)
      );
      ctx.scale(z, z);

      for (const cell of CELLS) {
        drawDistrict(cell, grouped[cell.district.id] ?? [], t);
      }

      // roads light up once both districts have founders
      for (let i = 0; i < CELLS.length; i++) {
        for (const j of [i + 1, i + COLS]) {
          if (j >= CELLS.length) continue;
          if (i % COLS === COLS - 1 && j === i + 1) continue;
          const a = CELLS[i];
          const b = CELLS[j];
          const lit = Math.min(grouped[a.district.id]?.length ?? 0, grouped[b.district.id]?.length ?? 0) >= 3;
          const colr = lit ? C.slateLight : C.shadow;
          if (a.y === b.y) {
            const y = a.groundY + 3;
            for (let x = a.x + a.w; x < b.x; x += lit ? 2 : 4) rect(x, y, 1, 1, colr);
            if (lit) {
              const p = (t * 0.35 + seeded(a.district.id)) % 1;
              rect(a.x + a.w + (b.x - a.x - a.w) * p, y - 1, 2, 1, C.yellow);
            }
          } else {
            const x = a.cx;
            for (let y = a.y + a.h; y < b.y; y += lit ? 2 : 4) rect(x, y, 1, 1, colr);
          }
        }
      }

      ctx.restore();

      if (dim) {
        ctx.fillStyle = "rgba(15,15,23,0.82)";
        ctx.fillRect(0, 0, VW, VH);
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [grouped, latest, mode, dim, ending, rows.length, topDistrictId]);

  return (
    <canvas
      ref={canvasRef}
      className="pixel-canvas absolute inset-0 w-full h-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}

export { measureText };

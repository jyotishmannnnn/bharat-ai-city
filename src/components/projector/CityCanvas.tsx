"use client";

// The shared Bharat AI City renderer for /projector.
//
// Deliberately a single <canvas>, not 1200 DOM nodes: every founder's
// building is a cheap fillText/glow draw call, so the auditorium's full
// capacity (1200 founders x up to 3 sectors each) redraws at 60fps. React
// only re-renders this component when `rows`/`mode` change identity (i.e.
// on a new insert or a presenter keypress) — the actual animation (camera,
// traffic, lights, trees, drones) runs entirely inside one rAF loop that
// never touches React state.

import { useEffect, useMemo, useRef } from "react";
import { LeaderboardEntry, SectorId } from "@/game/types";
import {
  Building,
  DISTRICTS,
  buildingsByDistrict,
  themeFor,
} from "@/lib/cityAggregate";

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

const WORLD_W = 2600;
const WORLD_H = 1500;
const COLS = 5;
const GROWS = 2;
const CELL_PAD = 26;
const BUILDING_CELL = 30;
const OVERFLOW_CAP = 260;

interface Cell {
  district: (typeof DISTRICTS)[number];
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

function layoutCells(): Cell[] {
  const cellW = WORLD_W / COLS;
  const cellH = WORLD_H / GROWS;
  return DISTRICTS.map((district, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = col * cellW + CELL_PAD;
    const y = row * cellH + CELL_PAD;
    const w = cellW - CELL_PAD * 2;
    const h = cellH - CELL_PAD * 2;
    return { district, x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  });
}

const CELLS = layoutCells();

function cellFor(sector: SectorId): Cell {
  return CELLS.find((c) => c.district.id === sector) ?? CELLS[0];
}

function buildingPos(cell: Cell, index: number): { x: number; y: number } {
  const cols = Math.max(1, Math.floor(cell.w / BUILDING_CELL));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const x = cell.x + BUILDING_CELL / 2 + col * BUILDING_CELL;
  const y = cell.y + cell.h - BUILDING_CELL / 2 - row * BUILDING_CELL;
  return { x, y };
}

/** Stable pseudo-random in [0,1) seeded from a string — used so a given
 * building/tree/drone always jitters the same way across frames instead of
 * flickering randomly. */
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

function fitAllCamera(): Camera {
  return { x: WORLD_W / 2, y: WORLD_H / 2, zoom: 1 };
}

const AMBIENT_TREES = Array.from({ length: 36 }, (_, i) => {
  // scatter along the street margins between district rows/cols, not on top of buildings
  const laneVertical = i % 2 === 0;
  const t = seeded(`tree-${i}`);
  return laneVertical
    ? { x: (Math.floor(i / 2) % (COLS + 1)) * (WORLD_W / COLS), y: t * WORLD_H }
    : { x: t * WORLD_W, y: WORLD_H / 2 };
});

const AMBIENT_DRONES = Array.from({ length: 6 }, (_, i) => ({
  seed: `drone-${i}`,
  laneY: 60 + i * 55,
  speed: 0.02 + seeded(`speed-${i}`) * 0.02,
}));

export default function CityCanvas({ rows, latest, mode, dim, ending }: CityCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera>(fitAllCamera());
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
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
    }
    resize();
    window.addEventListener("resize", resize);

    function targetCameraFor(nowSec: number): Camera {
      if (mode === "topDistrict" && topDistrictId) {
        const cell = cellFor(topDistrictId);
        return { x: cell.cx, y: cell.cy, zoom: 2.1 };
      }
      if (mode === "latest" && latest) {
        const sector = latest.sectors[0];
        if (sector) {
          const cell = cellFor(sector);
          const list = grouped[sector] ?? [];
          const b = list[list.length - 1];
          const pos = b
            ? buildingPos(cell, Math.min(b.districtIndex, OVERFLOW_CAP - 1))
            : { x: cell.cx, y: cell.cy };
          return { x: pos.x, y: pos.y, zoom: 2.6 };
        }
      }
      if (mode === "overview" || mode === "leaderboard" || mode === "stats") {
        const breathe = 1 + Math.sin(nowSec * 0.15) * 0.03;
        return { x: WORLD_W / 2, y: WORLD_H / 2, zoom: breathe };
      }
      // auto: internal autopilot cycling through pan -> focus newest -> overview
      const elapsed = nowSec - phaseStartRef.current;
      const phase = autopilotPhaseRef.current;
      if (phase === "pan" && elapsed > 9) {
        autopilotPhaseRef.current = latest ? "focusNewest" : "overview";
        phaseStartRef.current = nowSec;
      } else if (phase === "focusNewest" && elapsed > 6) {
        autopilotPhaseRef.current = "overview";
        phaseStartRef.current = nowSec;
      } else if (phase === "overview" && elapsed > 12) {
        autopilotPhaseRef.current = "pan";
        phaseStartRef.current = nowSec;
      }
      if (autopilotPhaseRef.current === "pan") {
        const t = elapsed / 9;
        const idx = Math.floor(t * DISTRICTS.length) % DISTRICTS.length;
        const cell = cellFor(DISTRICTS[idx].id);
        return { x: cell.cx, y: cell.cy, zoom: 1.6 };
      }
      if (autopilotPhaseRef.current === "focusNewest" && latest) {
        const sector = latest.sectors[0];
        const cell = sector ? cellFor(sector) : null;
        return cell ? { x: cell.cx, y: cell.cy, zoom: 2.2 } : fitAllCamera();
      }
      return { x: WORLD_W / 2, y: WORLD_H / 2, zoom: ending ? 0.92 : 1 };
    }

    function draw(now: number) {
      if (!canvas) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clockRef.current += dt;
      const t = clockRef.current;

      const target = targetCameraFor(t);
      const cam = cameraRef.current;
      const ease = ending ? 0.015 : 0.04;
      cam.x += (target.x - cam.x) * ease;
      cam.y += (target.y - cam.y) * ease;
      cam.zoom += (target.zoom - cam.zoom) * ease;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#070B18");
      sky.addColorStop(1, "#0F1B3D");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const scale = (h / WORLD_H) * cam.zoom;
      ctx.save();
      ctx.translate(w / 2 - cam.x * scale, h / 2 - cam.y * scale);
      ctx.scale(scale, scale);

      const totalFounders = rows.length;

      // ground plates + district labels
      for (const cell of CELLS) {
        const count = grouped[cell.district.id]?.length ?? 0;
        ctx.fillStyle = count > 0 ? cell.district.accent + "14" : "#ffffff08";
        ctx.strokeStyle = cell.district.accent + "33";
        ctx.lineWidth = 2;
        roundRect(ctx, cell.x, cell.y, cell.w, cell.h, 24);
        ctx.fill();
        ctx.stroke();

        ctx.font = "28px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.globalAlpha = 0.85;
        ctx.fillText(cell.district.icon, cell.x + 14, cell.y + 10);
        ctx.font = "bold 15px sans-serif";
        ctx.fillStyle = "#E5E7EB";
        ctx.fillText(cell.district.name.toUpperCase(), cell.x + 50, cell.y + 18);
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#94A3B8";
        ctx.fillText(`${count} founder${count === 1 ? "" : "s"}`, cell.x + 50, cell.y + 38);
        ctx.globalAlpha = 1;
      }

      // roads between adjacent districts — brighten & animate as both sides fill up
      for (let i = 0; i < CELLS.length; i++) {
        for (const j of [i + 1, i + COLS]) {
          if (j >= CELLS.length) continue;
          const a = CELLS[i];
          const b = CELLS[j];
          if (i % COLS === COLS - 1 && j === i + 1) continue; // no wraparound row edge
          const countA = grouped[a.district.id]?.length ?? 0;
          const countB = grouped[b.district.id]?.length ?? 0;
          const connected = Math.min(countA, countB) >= 3;
          const alpha = connected ? 0.55 : 0.12;
          ctx.strokeStyle = `rgba(148,163,184,${alpha})`;
          ctx.lineWidth = connected ? 6 : 3;
          ctx.setLineDash(connected ? [] : [10, 10]);
          ctx.beginPath();
          ctx.moveTo(a.cx, a.cy);
          ctx.lineTo(b.cx, b.cy);
          ctx.stroke();
          ctx.setLineDash([]);

          if (connected) {
            // traffic dot running along the lit road
            const speed = 0.08;
            const p = (t * speed + seeded(`${a.district.id}-${b.district.id}`)) % 1;
            const tx = a.cx + (b.cx - a.cx) * p;
            const ty = a.cy + (b.cy - a.cy) * p;
            ctx.fillStyle = "#FDE047";
            ctx.beginPath();
            ctx.arc(tx, ty, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // trees — always present, grow with total founders (city literally greening up)
      const treeScale = Math.min(1, 0.4 + totalFounders / 400);
      ctx.font = `${Math.round(20 * treeScale)}px sans-serif`;
      ctx.globalAlpha = 0.75;
      for (const tr of AMBIENT_TREES) {
        ctx.fillText("🌳", tr.x, tr.y);
      }
      ctx.globalAlpha = 1;

      // buildings
      for (const cell of CELLS) {
        const list = grouped[cell.district.id] ?? [];
        const shown = list.slice(0, OVERFLOW_CAP);
        for (const b of shown) {
          drawBuilding(ctx, cell, b, t);
        }
        if (list.length > OVERFLOW_CAP) {
          ctx.font = "bold 14px sans-serif";
          ctx.fillStyle = "#E5E7EB";
          ctx.textAlign = "left";
          ctx.fillText(`+${list.length - OVERFLOW_CAP} more`, cell.x + 14, cell.y + cell.h - 24);
        }
      }

      // drones — ambient sky life, a few more once robotics/quantum districts populate
      const bonusDrones = Math.min(4, Math.floor(((grouped.robotics?.length ?? 0) + (grouped.quantum?.length ?? 0)) / 40));
      const droneCount = 6 + bonusDrones;
      ctx.font = "18px sans-serif";
      for (let i = 0; i < droneCount; i++) {
        const d = AMBIENT_DRONES[i % AMBIENT_DRONES.length];
        const x = ((t * d.speed * WORLD_W + i * 400) % (WORLD_W + 200)) - 100;
        const y = d.laneY + Math.sin(t * 0.6 + i) * 12;
        ctx.fillText("🛰️", x, y);
      }

      ctx.restore();

      if (dim) {
        ctx.fillStyle = "rgba(3,6,16,0.72)";
        ctx.fillRect(0, 0, w, h);
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // grouped/latest/mode/topDistrictId are read live from refs+closures each
    // frame via the effect's own scope, so we intentionally re-subscribe the
    // rAF loop when any of them changes identity rather than reaching for
    // extra refs — insert cadence is human-paced, not per-frame.
  }, [grouped, latest, mode, dim, ending, rows.length, topDistrictId]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBuilding(ctx: CanvasRenderingContext2D, cell: Cell, b: Building, t: number) {
  const pos = buildingPos(cell, Math.min(b.districtIndex, OVERFLOW_CAP - 1));
  const theme = themeFor(b.sector);
  const jitter = seeded(b.key);
  const size = 18 + Math.min(14, b.valuationCr / 25);
  const pulse = 0.55 + Math.sin(t * 1.4 + jitter * 10) * 0.35;

  // light glow (window lights turning on/off)
  const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size * 1.4);
  glow.addColorStop(0, theme.accent + Math.round(pulse * 255).toString(16).padStart(2, "0"));
  glow.addColorStop(1, theme.accent + "00");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, size * 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `${Math.round(size)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(theme.buildingGlyph, pos.x, pos.y);
}

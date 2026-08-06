"use client";

import { useEffect, useRef } from "react";
import { css } from "@/game/retro/palette";
import {
  ITEMS,
  BUILDINGS,
  POWERUP_ITEMS,
  ItemSprite,
  resolveFixed,
  ITEM_SIZE,
} from "@/game/retro/items";
import { SectorId } from "@/game/types";

/** Renders a fixed-colour item sprite into a tiny canvas and lets CSS upscale
 *  it with nearest-neighbour. Backing store stays 16x16 no matter how large it
 *  is displayed, so a 96px tile costs the same as a 16px one. */
export function PixelSprite({
  sprite,
  size = 4,
  className = "",
}: {
  sprite: ItemSprite;
  /** device-independent pixels per sprite pixel */
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, ITEM_SIZE, ITEM_SIZE);

    for (let r = 0; r < sprite.length; r++) {
      const row = sprite[r];
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
        ctx.fillStyle = css(col);
        ctx.fillRect(c, r, run, 1);
        c += run;
      }
    }
  }, [sprite]);

  return (
    <canvas
      ref={ref}
      width={ITEM_SIZE}
      height={ITEM_SIZE}
      aria-hidden
      className={`pixel-canvas ${className}`}
      style={{ width: ITEM_SIZE * size, height: ITEM_SIZE * size }}
    />
  );
}

export function BuildingSprite({
  sector,
  size = 4,
  className = "",
}: {
  sector: SectorId;
  size?: number;
  className?: string;
}) {
  return <PixelSprite sprite={BUILDINGS[sector]} size={size} className={className} />;
}

export function ItemByName({
  name,
  size = 3,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const s = ITEMS[name] ?? POWERUP_ITEMS[name] ?? ITEMS.CRATE;
  return <PixelSprite sprite={s} size={size} className={className} />;
}

"use client";

import { useGameStore, getSectorTheme } from "@/lib/store";
import { PixelSprite } from "@/components/retro/PixelSprite";
import { ITEMS, POWERUP_ITEMS, SECTOR_ITEMS } from "@/game/retro/items";
import { PowerupEffect } from "@/game/types";
import { chiptune, haptics } from "@/lib/chiptune";

/** Short, phone-readable explanation of what each powerup actually does.
 *  The sector JSON only carries a marketing label ("Government Grant"), which
 *  tells a player nothing about the mechanic. */
const EFFECT_TEXT: Record<PowerupEffect, string> = {
  shield: "BLOCKS ONE HIT",
  multiplier: "DOUBLE POINTS",
  slowmo: "SLOWS EVERYTHING",
  magnet: "PULLS ITEMS IN",
  extraLife: "EXTRA LIFE",
};

export default function ItemBriefing() {
  const chosenSectors = useGameStore((s) => s.chosenSectors);
  const currentMissionIndex = useGameStore((s) => s.currentMissionIndex);
  const startPlaying = useGameStore((s) => s.startPlaying);

  const sectorId = chosenSectors[currentMissionIndex];
  if (!sectorId) return null;

  const theme = getSectorTheme(sectorId);
  const items = SECTOR_ITEMS[sectorId];
  const isFirstMission = currentMissionIndex === 0;

  const start = () => {
    chiptune.init();
    chiptune.uiTap();
    haptics.medium();
    startPlaying();
  };

  return (
    <div className="pixel-screen crt w-full h-full overflow-y-auto px-4 pt-6 pb-28">
      <h2 className="text-[12px] leading-relaxed text-[var(--p-yellow)] text-center">
        BRIEFING
      </h2>
      <p className="text-[6px] leading-[1.9] text-[var(--p-silver)] text-center mt-3">
        {theme.name.toUpperCase()} / MISSION {currentMissionIndex + 1}
      </p>

      {/* ---------------------------------------------------------- collect */}
      <div
        className="pixel-panel mt-5 p-3"
        style={{ background: "var(--p-forest)", borderColor: "var(--p-black)" }}
      >
        <div className="text-[8px] leading-relaxed text-[var(--p-mint)] mb-3">
          + COLLECT THESE
        </div>
        <div className="space-y-2.5">
          {theme.collectibles.map((c, i) => (
            <div key={c.label} className="flex items-center gap-3">
              <div className="shrink-0">
                <PixelSprite sprite={ITEMS[items.collect[i]] ?? ITEMS.CRATE} size={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[7px] leading-[1.7] text-[var(--p-white)]">
                  {c.label.toUpperCase()}
                </div>
              </div>
              <div className="text-[8px] leading-relaxed text-[var(--p-lime)] shrink-0 tabular-nums">
                +{c.points}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------ avoid */}
      <div
        className="pixel-panel mt-3 p-3"
        style={{ background: "var(--p-blood)", borderColor: "var(--p-black)" }}
      >
        <div className="text-[8px] leading-relaxed text-[var(--p-pink)] mb-3">
          - AVOID THESE
        </div>
        <div className="space-y-2.5">
          {theme.obstacles.map((o, i) => (
            <div key={o.label} className="flex items-center gap-3">
              <div className="shrink-0">
                <PixelSprite sprite={ITEMS[items.obstacle[i]] ?? ITEMS.XMARK} size={2} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[7px] leading-[1.7] text-[var(--p-white)]">
                  {o.label.toUpperCase()}
                </div>
              </div>
              <div className="text-[8px] leading-relaxed text-[var(--p-coral)] shrink-0 tabular-nums">
                -{o.penalty}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --------------------------------------------------------- powerups */}
      <div
        className="pixel-panel mt-3 p-3"
        style={{ background: "var(--p-navy)", borderColor: "var(--p-black)" }}
      >
        <div className="text-[8px] leading-relaxed text-[var(--p-ice)] mb-3">
          * GRAB THESE
        </div>
        <div className="space-y-2.5">
          {theme.powerups.map((p) => (
            <div key={p.label} className="flex items-center gap-3">
              <div className="shrink-0">
                <PixelSprite
                  sprite={POWERUP_ITEMS[p.effect] ?? POWERUP_ITEMS.shield}
                  size={2}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[7px] leading-[1.7] text-[var(--p-white)]">
                  {p.label.toUpperCase()}
                </div>
                <div className="text-[6px] leading-[1.8] text-[var(--p-sky)] mt-1">
                  {EFFECT_TEXT[p.effect]}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls are explained only on the first run -- there was previously
          no tutorial anywhere in the game. */}
      {isFirstMission && (
        <div className="pixel-panel mt-3 p-3 bg-[var(--p-shadow)]">
          <div className="text-[8px] leading-relaxed text-[var(--p-yellow)] mb-3">
            HOW TO PLAY
          </div>
          <div className="text-[6px] leading-[2] text-[var(--p-off)]">
            TAP A LANE TO MOVE THERE.
            <br />
            CHAIN PICKUPS FOR A COMBO.
            <br />
            YOU HAVE 45 SECONDS.
          </div>
          <div className="flex gap-1 mt-3" aria-hidden>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex-1 h-6 border-2 border-[var(--p-black)]"
                style={{
                  background: i === 2 ? "var(--p-lime)" : "var(--p-slate)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-[var(--p-black)] border-t-[3px] border-[var(--p-shadow)]">
        <button
          onClick={start}
          className="pixel-btn font-pixel w-full bg-[var(--p-lime)] py-4 text-[10px] leading-relaxed text-[var(--p-black)]"
        >
          I&apos;M READY
        </button>
      </div>
    </div>
  );
}

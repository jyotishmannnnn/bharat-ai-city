"use client";

import { useGameStore, getSectorTheme } from "@/lib/store";
import { BuildingSprite, ItemByName } from "@/components/retro/PixelSprite";
import { SECTOR_ITEMS } from "@/game/retro/items";
import { chiptune, haptics } from "@/lib/chiptune";

export default function MissionIntro() {
  const chosenSectors = useGameStore((s) => s.chosenSectors);
  const currentMissionIndex = useGameStore((s) => s.currentMissionIndex);
  const missionSeeds = useGameStore((s) => s.missionSeeds);
  const beginCurrentMission = useGameStore((s) => s.beginCurrentMission);

  const sectorId = chosenSectors[currentMissionIndex];
  const theme = getSectorTheme(sectorId);
  const seed = missionSeeds[sectorId];
  const items = SECTOR_ITEMS[sectorId];

  const begin = () => {
    // Unlock audio here: this is a real gesture, and iOS needs one before the
    // arcade screen tries to start music.
    chiptune.init();
    chiptune.uiTap();
    haptics.medium();
    beginCurrentMission();
  };

  const rows = [
    { label: "PROBLEM", value: seed?.problem, color: "var(--p-coral)" },
    { label: "MARKET", value: seed?.market, color: "var(--p-sky)" },
    { label: "CHANCE", value: seed?.opportunity, color: "var(--p-lime)" },
  ];

  return (
    <div className="pixel-screen crt w-full h-full overflow-y-auto flex flex-col items-center px-4 py-6">
      <div className="pixel-panel bg-[var(--p-deep)] px-3 py-2 text-[7px] leading-relaxed text-[var(--p-amber)]">
        MISSION {currentMissionIndex + 1} OF {chosenSectors.length}
      </div>

      <div className="mt-4 pixel-bob">
        <BuildingSprite sector={sectorId} size={4} />
      </div>

      <h2 className="text-[13px] leading-[1.6] text-[var(--p-yellow)] text-center mt-3">
        {theme.name.toUpperCase()}
      </h2>
      <p className="text-[7px] leading-relaxed text-[var(--p-silver)] mt-2 text-center">
        {theme.tagline.toUpperCase()}
      </p>

      <div className="w-full max-w-[320px] mt-5 space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="pixel-panel bg-[var(--p-deep)] px-3 py-2.5">
            <div
              className="text-[6px] leading-relaxed"
              style={{ color: r.color }}
            >
              {r.label}
            </div>
            <div className="text-[7px] leading-[1.9] text-[var(--p-off)] mt-1.5">
              {r.value?.toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* legend: shows the actual sprites the player will see in the run */}
      <div className="flex items-start gap-5 mt-5">
        <div className="flex flex-col items-center gap-1.5">
          <ItemByName name={items.collect[0]} size={2} />
          <span className="text-[6px] leading-relaxed text-[var(--p-lime)]">GRAB</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <ItemByName name={items.obstacle[0]} size={2} />
          <span className="text-[6px] leading-relaxed text-[var(--p-coral)]">DODGE</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <ItemByName name={theme.powerups[0].effect} size={2} />
          <span className="text-[6px] leading-relaxed text-[var(--p-cyan)]">POWER</span>
        </div>
      </div>

      <button
        onClick={begin}
        className="pixel-btn font-pixel w-full max-w-[320px] mt-6 bg-[var(--p-lime)] py-4 text-[10px] leading-relaxed text-[var(--p-black)]"
      >
        BUILD STARTUP
      </button>
    </div>
  );
}

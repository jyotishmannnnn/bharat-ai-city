"use client";

import { useEffect, useState } from "react";
import { useGameStore, getSectorTheme } from "@/lib/store";
import { BuildingSprite } from "@/components/retro/PixelSprite";
import { chiptune, haptics } from "@/lib/chiptune";

export default function CityView() {
  const chosenSectors = useGameStore((s) => s.chosenSectors);
  const generatedStartups = useGameStore((s) => s.generatedStartups);
  const finalizeFounderProfile = useGameStore((s) => s.finalizeFounderProfile);

  // Buildings light up in sequence rather than all popping on independent
  // timers, and the CTA waits for the sequence instead of a fixed delay.
  const [revealed, setRevealed] = useState(0);
  const total = chosenSectors.length;

  useEffect(() => {
    if (revealed >= total) return;
    const t = setTimeout(() => {
      setRevealed((n) => n + 1);
      chiptune.collect(revealed * 3);
      haptics.light();
    }, 420);
    return () => clearTimeout(t);
  }, [revealed, total]);

  const done = revealed >= total;

  return (
    <div className="pixel-screen crt relative w-full h-full overflow-hidden flex flex-col items-center px-4 pt-8 pb-6">
      {/* stars */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 18% 14%, #d4d4e4 50%, transparent 50%)," +
            "radial-gradient(1px 1px at 72% 9%, #9a9ab5 50%, transparent 50%)," +
            "radial-gradient(1px 1px at 44% 24%, #d4d4e4 50%, transparent 50%)," +
            "radial-gradient(1px 1px at 88% 20%, #6b6b8c 50%, transparent 50%)",
        }}
      />

      <h2 className="relative z-10 text-[12px] leading-[1.6] text-[var(--p-yellow)] text-center">
        CITY IS RISING
      </h2>
      <p className="relative z-10 text-[7px] leading-[1.9] text-[var(--p-silver)] mt-2 text-center">
        YOUR STARTUPS CHANGED THE SKYLINE
      </p>

      <div className="relative z-10 flex-1 w-full flex items-end justify-center gap-3 pb-4">
        {chosenSectors.map((sectorId, i) => {
          const theme = getSectorTheme(sectorId);
          const startup = generatedStartups[i];
          const shown = i < revealed;
          return (
            <div
              key={sectorId}
              className="flex flex-col items-center transition-opacity duration-200"
              style={{ opacity: shown ? 1 : 0 }}
            >
              <div className={shown ? "pixel-bob" : ""} style={{ animationDelay: `${i * 0.2}s` }}>
                <BuildingSprite sector={sectorId} size={3} />
              </div>
              <div className="mt-2 px-1.5 py-1 bg-[var(--p-shadow)] max-w-[86px]">
                <div className="text-[6px] leading-[1.7] text-[var(--p-off)] text-center break-words">
                  {(startup?.name ?? theme.buildingName).toUpperCase()}
                </div>
              </div>
              {/* lit base -- blinks in steps, no blur */}
              <div
                className="w-12 h-1.5 mt-1.5 pixel-blink"
                style={{
                  background: "var(--p-amber)",
                  animationDelay: `${i * 0.25}s`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* road */}
      <div
        aria-hidden
        className="relative z-10 w-full h-3 mb-5"
        style={{
          background:
            "repeating-linear-gradient(90deg, var(--p-slate) 0 6px, transparent 6px 12px)",
          borderTop: "2px solid var(--p-shadow)",
        }}
      />

      <button
        onClick={() => {
          chiptune.init();
          chiptune.uiTap();
          haptics.medium();
          finalizeFounderProfile();
        }}
        disabled={!done}
        className="pixel-btn font-pixel relative z-10 w-full max-w-[340px] py-4 text-[10px] leading-relaxed"
        style={{
          background: done ? "var(--p-cyan)" : "var(--p-shadow)",
          color: done ? "var(--p-black)" : "var(--p-slate-l)",
        }}
      >
        {done ? "SEE FOUNDER CARD" : "BUILDING..."}
      </button>
    </div>
  );
}

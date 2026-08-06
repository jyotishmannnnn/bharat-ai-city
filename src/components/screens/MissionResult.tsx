"use client";

import { useGameStore, getSectorTheme } from "@/lib/store";
import { BuildingSprite } from "@/components/retro/PixelSprite";
import { useCountUp } from "@/lib/useCountUp";
import { chiptune, haptics } from "@/lib/chiptune";

export default function MissionResult() {
  const missionResults = useGameStore((s) => s.missionResults);
  const generatedStartups = useGameStore((s) => s.generatedStartups);
  const chosenSectors = useGameStore((s) => s.chosenSectors);
  const currentMissionIndex = useGameStore((s) => s.currentMissionIndex);
  const advanceAfterResult = useGameStore((s) => s.advanceAfterResult);

  const result = missionResults[missionResults.length - 1];
  const startup = generatedStartups[generatedStartups.length - 1];

  // Hooks must run unconditionally, so compute against safe defaults and bail
  // out on render instead of before the hook calls.
  const valuation = useCountUp(startup?.estimatedValuationCr ?? 0, 900, 250);
  const citizens = useCountUp(startup?.citizensImpacted ?? 0, 1100, 400);

  if (!result || !startup) return null;
  const theme = getSectorTheme(result.sector);
  const isLast = currentMissionIndex + 1 >= chosenSectors.length;

  const next = () => {
    chiptune.init();
    chiptune.uiTap();
    haptics.medium();
    advanceAfterResult();
  };

  return (
    <div className="pixel-screen crt w-full h-full overflow-y-auto flex flex-col items-center px-4 py-6">
      <div className="text-[9px] leading-relaxed text-[var(--p-lime)] pixel-blink">
        STARTUP LAUNCHED
      </div>

      <div className="mt-4 pixel-bob">
        <BuildingSprite sector={result.sector} size={3} />
      </div>

      <div className="pixel-panel w-full max-w-[340px] bg-[var(--p-deep)] p-4 mt-4">
        <div className="text-[12px] leading-[1.6] text-[var(--p-yellow)]">
          {startup.name.toUpperCase()}
        </div>
        <div className="text-[7px] leading-[1.9] text-[var(--p-silver)] mt-2">
          {startup.tagline.toUpperCase()}
        </div>

        <div className="text-[7px] leading-[1.9] text-[var(--p-off)] mt-3">
          <span className="text-[var(--p-cyan)]">USP: </span>
          {startup.usp.toUpperCase()}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {startup.aiStack.map((t) => (
            <span
              key={t}
              className="text-[6px] leading-relaxed px-1.5 py-1 bg-[var(--p-slate)] text-[var(--p-ice)]"
            >
              {t.toUpperCase()}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="pixel-panel bg-[var(--p-shadow)] py-2.5 text-center">
            <div className="text-[11px] leading-relaxed text-[var(--p-yellow)] tabular-nums">
              {valuation} CR
            </div>
            <div className="text-[6px] leading-relaxed text-[var(--p-silver)] mt-1.5">
              VALUATION
            </div>
          </div>
          <div className="pixel-panel bg-[var(--p-shadow)] py-2.5 text-center">
            <div className="text-[11px] leading-relaxed text-[var(--p-lime)] tabular-nums">
              {citizens.toLocaleString("en-IN")}
            </div>
            <div className="text-[6px] leading-relaxed text-[var(--p-silver)] mt-1.5">
              CITIZENS
            </div>
          </div>
        </div>

        <div className="text-[6px] leading-[1.9] text-[var(--p-slate-l)] text-center mt-3">
          ARCHETYPE:{" "}
          <span className="text-[var(--p-violet)]">
            {startup.founderArchetype.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex gap-4 mt-4 text-[7px] leading-relaxed">
        <span className="text-[var(--p-lime)]">GOT {result.collected}</span>
        <span className="text-[var(--p-coral)]">HIT {result.hits}</span>
        <span className="text-[var(--p-yellow)]">PTS {result.score}</span>
      </div>

      <button
        onClick={next}
        className="pixel-btn font-pixel w-full max-w-[340px] mt-6 py-4 text-[10px] leading-relaxed text-[var(--p-black)]"
        style={{ background: isLast ? "var(--p-cyan)" : "var(--p-lime)" }}
      >
        {isLast ? "REVEAL MY CITY" : "NEXT MISSION"}
      </button>

      <div className="h-4" style={{ color: theme.accent }} />
    </div>
  );
}

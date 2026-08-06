"use client";

import { useEffect, useState } from "react";
import { useGameStore, getSectorTheme } from "@/lib/store";
import { BuildingSprite } from "@/components/retro/PixelSprite";
import { useCountUp } from "@/lib/useCountUp";
import { chiptune, haptics } from "@/lib/chiptune";

/** Deterministic backdrop skyline. Fixed heights rather than random so the
 *  silhouette never reshuffles between renders. */
const BACKDROP = [14, 26, 18, 34, 22, 40, 16, 30, 24, 38, 20, 28, 15, 33];

const REVEAL_FIRST_MS = 180; // near-immediate: an empty stage reads as broken
const REVEAL_STEP_MS = 400;

export default function CityView() {
  const chosenSectors = useGameStore((s) => s.chosenSectors);
  const generatedStartups = useGameStore((s) => s.generatedStartups);
  const playerName = useGameStore((s) => s.playerName);
  const finalizeFounderProfile = useGameStore((s) => s.finalizeFounderProfile);

  const [revealed, setRevealed] = useState(0);
  const total = chosenSectors.length;
  const done = revealed >= total;

  // This is the run's payoff beat, so show what was actually built. Same
  // arithmetic finalizeFounderProfile uses for the founder card.
  const totalValuation = generatedStartups.reduce(
    (s, g) => s + g.estimatedValuationCr,
    0
  );
  const totalCitizens = generatedStartups.reduce(
    (s, g) => s + g.citizensImpacted,
    0
  );

  const revealMs = REVEAL_FIRST_MS + total * REVEAL_STEP_MS;
  const valuation = useCountUp(totalValuation, 900, revealMs);
  const citizens = useCountUp(totalCitizens, 1100, revealMs + 150);

  useEffect(() => {
    if (revealed >= total) return;
    const t = setTimeout(
      () => {
        setRevealed((n) => n + 1);
        chiptune.collect(revealed * 4);
        haptics.light();
      },
      revealed === 0 ? REVEAL_FIRST_MS : REVEAL_STEP_MS
    );
    return () => clearTimeout(t);
  }, [revealed, total]);

  return (
    <div className="pixel-screen crt relative w-full h-full overflow-y-auto flex flex-col items-center px-4 pt-4 pb-6">
      <h2 className="text-[12px] leading-[1.6] text-[var(--p-yellow)] text-center">
        YOUR AI CITY
      </h2>
      <p className="text-[6px] leading-[1.9] text-[var(--p-silver)] mt-2 text-center">
        BUILT BY {playerName.toUpperCase()}
      </p>

      {/* ---------------------------------------------------------- stage -- */}
      <div
        className="pixel-panel relative w-full max-w-[340px] mt-4 overflow-hidden"
        style={{ background: "var(--p-deep)", height: 200 }}
      >
        {/* stars */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(1px 1px at 14% 16%, #d4d4e4 50%, transparent 50%)," +
              "radial-gradient(1px 1px at 68% 11%, #9a9ab5 50%, transparent 50%)," +
              "radial-gradient(1px 1px at 40% 26%, #d4d4e4 50%, transparent 50%)," +
              "radial-gradient(1px 1px at 86% 22%, #6b6b8c 50%, transparent 50%)," +
              "radial-gradient(1px 1px at 26% 8%, #d4d4e4 50%, transparent 50%)",
          }}
        />

        {/* distant skyline silhouette -- gives the stage a horizon so the
            player's own buildings aren't floating in empty space */}
        <div
          aria-hidden
          className="absolute left-0 right-0 flex items-end justify-center"
          style={{ bottom: 26 }}
        >
          {BACKDROP.map((h, i) => (
            <div
              key={i}
              style={{
                width: 22,
                height: h,
                background: "var(--p-shadow)",
                borderTop: "2px solid var(--p-slate)",
                marginLeft: i === 0 ? 0 : -2,
              }}
            />
          ))}
        </div>

        {/* the player's buildings */}
        <div
          className="absolute left-0 right-0 flex items-end justify-center gap-6"
          style={{ bottom: 26 }}
        >
          {chosenSectors.map((sectorId, i) => {
            const theme = getSectorTheme(sectorId);
            const startup = generatedStartups[i];
            const shown = i < revealed;
            return (
              <div
                key={sectorId}
                className="flex flex-col items-center transition-opacity duration-150"
                style={{ opacity: shown ? 1 : 0 }}
              >
                <div className="px-1.5 py-1 mb-1.5 bg-[var(--p-black)] max-w-[104px]">
                  <div className="text-[6px] leading-[1.7] text-[var(--p-lime)] text-center break-words">
                    {(startup?.name ?? theme.buildingName).toUpperCase()}
                  </div>
                </div>
                <div
                  className={shown ? "pixel-bob" : ""}
                  style={{ animationDelay: `${i * 0.25}s` }}
                >
                  <BuildingSprite sector={sectorId} size={4} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ground + road */}
        <div
          aria-hidden
          className="absolute left-0 right-0 bottom-0"
          style={{ height: 26, background: "var(--p-black)", borderTop: "2px solid var(--p-slate)" }}
        >
          <div
            className="absolute left-0 right-0"
            style={{
              top: 11,
              height: 2,
              background:
                "repeating-linear-gradient(90deg, var(--p-slate) 0 8px, transparent 8px 16px)",
            }}
          />
        </div>
      </div>

      {/* ---------------------------------------------------------- stats -- */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-[340px] mt-3">
        <div className="pixel-panel bg-[var(--p-deep)] py-2.5 text-center">
          <div className="text-[11px] leading-relaxed text-[var(--p-yellow)] tabular-nums">
            {valuation} CR
          </div>
          <div className="text-[5px] leading-relaxed text-[var(--p-silver)] mt-1.5">
            CITY VALUATION
          </div>
        </div>
        <div className="pixel-panel bg-[var(--p-deep)] py-2.5 text-center">
          <div className="text-[11px] leading-relaxed text-[var(--p-lime)] tabular-nums">
            {citizens.toLocaleString("en-IN")}
          </div>
          <div className="text-[5px] leading-relaxed text-[var(--p-silver)] mt-1.5">
            CITIZENS SERVED
          </div>
        </div>
      </div>

      <div className="text-[6px] leading-[1.9] text-[var(--p-slate-l)] mt-3 text-center">
        {total} STARTUP{total === 1 ? "" : "S"} ADDED TO BHARAT AI CITY
      </div>

      {/* The CTA is always live. It used to sit disabled reading "BUILDING...",
          which implied work was in progress when it was only a render delay. */}
      <button
        onClick={() => {
          chiptune.init();
          chiptune.uiTap();
          haptics.medium();
          finalizeFounderProfile();
        }}
        className="pixel-btn font-pixel w-full max-w-[340px] mt-4 bg-[var(--p-cyan)] py-4 text-[10px] leading-relaxed text-[var(--p-black)]"
      >
        SEE FOUNDER CARD
      </button>

      {!done && (
        <div className="text-[5px] leading-relaxed text-[var(--p-slate-l)] mt-2 pixel-blink">
          SKYLINE RISING...
        </div>
      )}
    </div>
  );
}

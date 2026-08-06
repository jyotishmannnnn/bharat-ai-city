"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useGameStore } from "@/lib/store";
import { submitRun } from "@/lib/leaderboard";
import { BuildingSprite } from "@/components/retro/PixelSprite";
import { useCountUp } from "@/lib/useCountUp";
import { chiptune, haptics } from "@/lib/chiptune";

const STAT_ROWS = [
  { key: "innovationScore" as const, label: "INNOV", color: "var(--p-cyan)" },
  { key: "impactScore" as const, label: "IMPACT", color: "var(--p-lime)" },
  { key: "executionScore" as const, label: "EXEC", color: "var(--p-yellow)" },
  { key: "originalityScore" as const, label: "ORIG", color: "var(--p-violet)" },
];

const CONFETTI_COLORS = [
  "var(--p-yellow)",
  "var(--p-cyan)",
  "var(--p-coral)",
  "var(--p-lime)",
  "var(--p-violet)",
];

export default function FounderCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const profile = useGameStore((s) => s.founderProfile);
  const playerName = useGameStore((s) => s.playerName);
  const chosenSectors = useGameStore((s) => s.chosenSectors);
  const goTo = useGameStore((s) => s.goTo);
  const restart = useGameStore((s) => s.restart);
  const [submitted, setSubmitted] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confetti, setConfetti] = useState(false);

  const valuation = useCountUp(profile?.totalValuationCr ?? 0, 900, 300);
  const citizens = useCountUp(profile?.citizensImpacted ?? 0, 1100, 450);

  if (!profile) return null;

  const submit = async () => {
    if (submitted) return;
    setSubmitted(true);
    setConfetti(true);
    chiptune.init();
    chiptune.fanfare();
    haptics.pattern([20, 40, 20, 40, 80]);
    await submitRun(playerName, profile, chosenSectors);
    // Let the celebration land before moving on.
    setTimeout(() => goTo("leaderboard"), 1200);
  };

  const download = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const link = document.createElement("a");
      link.download = `${playerName}-bharat-ai-city.png`;
      link.href = dataUrl;
      link.click();
      setSaved(true);
      chiptune.init();
      chiptune.uiTap();
      haptics.light();
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="pixel-screen crt relative w-full h-full overflow-y-auto px-4 pt-6 pb-8 flex flex-col items-center">
      {/* pixel confetti -- plain divs falling on stepped keyframes */}
      {confetti && (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-40">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className="absolute"
              style={{
                left: `${(i * 37) % 100}%`,
                top: "-12px",
                width: 6,
                height: 6,
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animation: `pixel-fall ${1.1 + (i % 5) * 0.25}s steps(10, end) ${
                  (i % 7) * 0.07
                }s forwards`,
              }}
            />
          ))}
        </div>
      )}

      <h2 className="text-[12px] leading-relaxed text-[var(--p-yellow)] mb-4">
        FOUNDER CARD
      </h2>

      <div
        ref={cardRef}
        className="pixel-panel relative w-full max-w-[340px] p-4 overflow-hidden"
        style={{ background: "var(--p-deep)" }}
      >
        {/* foil sheen sweep -- trading-card feel, pure CSS */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-20"
          style={{
            background:
              "linear-gradient(115deg, transparent 30%, var(--p-ice) 45%, transparent 60%)",
            animation: "pixel-sheen 3.5s steps(20, end) infinite",
          }}
        />

        <div className="relative">
          <div className="text-[6px] leading-relaxed text-[var(--p-amber)]">
            BHARAT AI CITY / FOUNDER GRANT
          </div>
          <div className="text-[14px] leading-[1.6] text-[var(--p-white)] mt-2 break-words">
            {playerName.toUpperCase()}
          </div>
          <div className="text-[7px] leading-relaxed text-[var(--p-cyan)] mt-2">
            {profile.founderTitle.toUpperCase()}
          </div>

          <div className="flex gap-2 mt-4">
            {profile.startups.map((s, i) => (
              <div
                key={s.name}
                className="flex-1 bg-[var(--p-shadow)] py-2 flex flex-col items-center gap-1.5"
              >
                <BuildingSprite sector={chosenSectors[i] ?? s.sector} size={2} />
                <div className="text-[5px] leading-[1.7] text-[var(--p-off)] text-center px-1 break-words">
                  {s.name.toUpperCase()}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {STAT_ROWS.map((row) => (
              <div key={row.key} className="flex items-center gap-2">
                <span className="text-[6px] leading-relaxed w-11 text-[var(--p-silver)]">
                  {row.label}
                </span>
                <div className="pixel-bar flex-1 h-3">
                  <div
                    className="pixel-bar-fill"
                    style={{ width: `${profile[row.key]}%`, color: row.color }}
                  />
                </div>
                <span className="text-[7px] leading-relaxed w-6 text-right text-[var(--p-white)] tabular-nums">
                  {profile[row.key]}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-[var(--p-black)] py-2.5 text-center">
              <div className="text-[10px] leading-relaxed text-[var(--p-yellow)] tabular-nums">
                {valuation} CR
              </div>
              <div className="text-[5px] leading-relaxed text-[var(--p-silver)] mt-1.5">
                VALUATION
              </div>
            </div>
            <div className="bg-[var(--p-black)] py-2.5 text-center">
              <div className="text-[10px] leading-relaxed text-[var(--p-lime)] tabular-nums">
                {citizens.toLocaleString("en-IN")}
              </div>
              <div className="text-[5px] leading-relaxed text-[var(--p-silver)] mt-1.5">
                CITIZENS
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-[5px] leading-[1.8] text-[var(--p-slate-l)]">
            {profile.archetype.toUpperCase()} / #BUILDBHARATAICITY
          </div>
        </div>
      </div>

      <div className="w-full max-w-[340px] grid grid-cols-2 gap-3 mt-5">
        <button
          onClick={download}
          disabled={downloading}
          className="pixel-btn font-pixel bg-[var(--p-slate)] py-3 text-[8px] leading-relaxed text-[var(--p-white)]"
        >
          {downloading ? "SAVING" : saved ? "SAVED!" : "SAVE CARD"}
        </button>
        <button
          onClick={submit}
          className="pixel-btn font-pixel bg-[var(--p-lime)] py-3 text-[8px] leading-relaxed text-[var(--p-black)]"
        >
          {submitted ? "SENT!" : "SUBMIT"}
        </button>
      </div>

      <button
        onClick={restart}
        className="mt-5 text-[7px] leading-relaxed text-[var(--p-slate-l)] underline underline-offset-4"
      >
        PLAY AGAIN
      </button>
    </div>
  );
}

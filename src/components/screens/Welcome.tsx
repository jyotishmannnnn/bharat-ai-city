"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/store";
import { PixelSprite } from "@/components/retro/PixelSprite";
import { BUILDINGS } from "@/game/retro/items";
import { chiptune, haptics } from "@/lib/chiptune";
import { MISSIONS_PER_RUN } from "@/lib/gameConfig";
import { PoweredBy } from "@/components/retro/PoweredBy";

// Decorative skyline strip. CSS-animated (not Framer) so it stays off the JS
// main thread on low-end phones -- a real share of a 1200-person room.
const SKYLINE: (keyof typeof BUILDINGS)[] = [
  "healthcare",
  "semiconductors",
  "robotics",
  "climate",
  "education",
];

export default function Welcome() {
  const [name, setName] = useState("");
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const goTo = useGameStore((s) => s.goTo);

  const start = () => {
    chiptune.init();
    chiptune.uiTap();
    haptics.medium();
    setPlayerName(name.trim() || `Founder${Math.floor(Math.random() * 9000 + 1000)}`);
    goTo("select");
  };

  return (
    // justify-start + m-auto on the content wrapper, NOT justify-center: a
    // centred flex child that overflows gets clipped at the top with no way to
    // scroll to it, which would hide the logos on shorter phones.
    <div className="pixel-screen crt relative w-full h-full overflow-y-auto flex flex-col items-center justify-start px-5 py-8">
      {/* starfield */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(1px 1px at 12% 18%, #d4d4e4 50%, transparent 50%)," +
            "radial-gradient(1px 1px at 68% 12%, #9a9ab5 50%, transparent 50%)," +
            "radial-gradient(1px 1px at 34% 42%, #d4d4e4 50%, transparent 50%)," +
            "radial-gradient(1px 1px at 84% 34%, #6b6b8c 50%, transparent 50%)," +
            "radial-gradient(1px 1px at 52% 8%, #d4d4e4 50%, transparent 50%)",
        }}
      />

      <div className="m-auto flex w-full flex-col items-center">
      <PoweredBy height={46} className="mb-6" />

      <div className="relative z-10 text-center">
        <div className="text-[7px] leading-relaxed text-[var(--p-cyan)] mb-3">
          BHARAT AI SUMMIT PRESENTS
        </div>
        <h1
          className="text-[19px] leading-[1.6] text-[var(--p-yellow)]"
          style={{ textShadow: "3px 3px 0 var(--p-blood)" }}
        >
          BUILD
          <br />
          BHARAT
          <br />
          AI CITY
        </h1>
      </div>

      {/* grant panel */}
      <div className="pixel-panel relative z-10 mt-6 bg-[var(--p-deep)] px-5 py-4 text-center">
        <div className="text-[7px] text-[var(--p-amber)] leading-relaxed">
          YOU RECEIVED
        </div>
        <div className="text-[17px] text-[var(--p-white)] mt-2 leading-relaxed">
          100 CR
        </div>
        <div className="text-[7px] text-[var(--p-silver)] mt-2 leading-relaxed">
          INNOVATION GRANT
        </div>
      </div>

      <p className="relative z-10 mt-5 text-center text-[8px] leading-[1.9] text-[var(--p-off)] max-w-[280px]">
        BUILD{" "}
        <span className="text-[var(--p-lime)]">
          {MISSIONS_PER_RUN} AI STARTUPS
        </span>{" "}
        AND TRANSFORM BHARAT
      </p>

      {/* skyline strip */}
      <div className="relative z-10 flex items-end gap-1 mt-5" aria-hidden>
        {SKYLINE.map((s, i) => (
          <div
            key={s}
            className="pixel-bob"
            style={{ animationDelay: `${i * 0.18}s` }}
          >
            <PixelSprite sprite={BUILDINGS[s]} size={2} />
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-6 w-full max-w-[300px]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 12))}
          placeholder="FOUNDER NAME"
          maxLength={12}
          className="pixel-input font-pixel w-full px-3 py-3 text-center text-[9px] leading-relaxed"
        />
        <button
          onClick={start}
          className="pixel-btn font-pixel mt-4 w-full bg-[var(--p-lime)] py-4 text-[10px] leading-relaxed text-[var(--p-black)]"
        >
          START MISSION
        </button>
      </div>
      </div>
    </div>
  );
}

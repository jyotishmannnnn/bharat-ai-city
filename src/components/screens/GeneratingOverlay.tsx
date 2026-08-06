"use client";

import { useEffect, useState } from "react";
import { PixelSprite } from "@/components/retro/PixelSprite";
import { ITEMS } from "@/game/retro/items";

// The QA audit flagged this as the worst screen in the app: one static line,
// identical for all three missions, during the only guaranteed dead-air window.
// Rotating copy + a working progress bar costs nothing and removes the stall.
const LINES = [
  "PITCHING TO VCS...",
  "NAMING YOUR UNICORN...",
  "CRUNCHING MARKET DATA...",
  "HIRING FOUNDING ENGINEERS...",
  "DRAWING THE LOGO...",
  "FILING THE TRADEMARK...",
];

const SPINNER = ["GEAR", "PUZZLE", "BATTERY", "ORB"];

export default function GeneratingOverlay() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 700);
    return () => clearInterval(t);
  }, []);

  const line = LINES[tick % LINES.length];
  const frame = SPINNER[tick % SPINNER.length];
  // Asymptotic fill: always advancing, never reaches 100 before the API returns.
  const pct = Math.min(94, 12 + tick * 11);

  return (
    <div className="pixel-screen crt w-full h-full flex flex-col items-center justify-center px-6">
      <div className="pixel-bob">
        <PixelSprite sprite={ITEMS[frame]} size={4} />
      </div>

      <div className="text-[11px] leading-relaxed text-[var(--p-yellow)] mt-5">
        BUILDING...
      </div>

      <div className="text-[7px] leading-[1.9] text-[var(--p-silver)] mt-3 h-8 text-center max-w-[260px]">
        {line}
      </div>

      <div className="pixel-bar w-[220px] h-4 mt-2">
        <div
          className="pixel-bar-fill text-[var(--p-lime)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import bharat1 from "@/assets/logos/bharat1.png";
import sentrix from "@/assets/logos/sentrix.png";

// Both supplied logos are dark ink on a transparent background (verified with
// scripts/png-luma.mjs: ~100% of opaque pixels below luma 96). On the game's
// #0f0f17 backdrop they would be effectively invisible, so they sit on a white
// plate instead. That keeps both marks unmodified -- inverting or recolouring
// someone's logo is a brand decision, not a styling one.
//
// Static imports (rather than /public + a string src) mean Next resolves the
// URL at build time, so these keep working under basePath=/game.

const RATIO_BHARAT = 1197 / 408; // 2.93:1 landscape
const RATIO_SENTRIX = 500 / 500; // 1:1 square

export function PoweredBy({
  height = 22,
  label = "POWERED BY",
  className = "",
}: {
  /** Rendered logo height in px; widths derive from each logo's true ratio. */
  height?: number;
  label?: string | null;
  className?: string;
}) {
  const bw = Math.round(height * RATIO_BHARAT);
  const sw = Math.round(height * RATIO_SENTRIX);

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {label && (
        <div className="text-[6px] leading-relaxed text-[var(--p-slate-l)]">
          {label}
        </div>
      )}
      <div
        className="pixel-panel flex items-center gap-3 bg-[var(--p-white)] px-3 py-2"
        style={{ borderWidth: 2 }}
      >
        <Image
          src={bharat1}
          alt="Bharat-1.ai"
          width={bw}
          height={height}
          priority
          style={{ width: bw, height, objectFit: "contain" }}
        />
        <div
          aria-hidden
          className="bg-[var(--p-silver)]"
          style={{ width: 2, height: height * 0.8 }}
        />
        <Image
          src={sentrix}
          alt="Sentrix"
          width={sw}
          height={height}
          priority
          style={{ width: sw, height, objectFit: "contain" }}
        />
      </div>
    </div>
  );
}

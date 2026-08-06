"use client";

import Image from "next/image";
import bharat1 from "@/assets/logos/bharat1.png";
import sentrix from "@/assets/logos/sentrix.png";

// Both marks are saturated colour on transparent, not black:
//   Bharat-1.ai  magenta/purple #92218f, #6c06b3  -> 2.56:1 vs #0f0f17
//   Sentrix      orange/rust    #9c472b           -> 3.05:1 vs #0f0f17
// (measured by scripts/png-colors.mjs)
//
// That reads fine directly on the dark backdrop, so they are shown unmodified
// with no plate behind them.
//
// z-60 is deliberate: the CRT scanline overlay (.crt::after) sits at z-50 and
// spans the whole screen, so anything below it gets striped. Brand marks are
// exempt from the scanline treatment.
//
// Static imports (rather than /public + a string src) mean Next resolves the
// URL at build time, so these keep working under basePath=/game.

const RATIO_BHARAT = 1197 / 408; // 2.93:1 landscape
const RATIO_SENTRIX = 500 / 500; // 1:1 square

export function PoweredBy({
  height = 40,
  label = null,
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
    <div
      className={`relative z-[60] flex flex-col items-center gap-1.5 ${className}`}
    >
      {label && (
        <div className="text-[6px] leading-relaxed text-[var(--p-slate-l)]">
          {label}
        </div>
      )}
      <div className="flex items-center" style={{ gap: Math.round(height * 0.35) }}>
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
          className="bg-[var(--p-slate)]"
          style={{ width: 2, height: Math.round(height * 0.62) }}
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

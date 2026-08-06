"use client";

import Image from "next/image";
import bharat1 from "@/assets/logos/bharat1.png";
import sentrix from "@/assets/logos/sentrix.png";

// Both marks are saturated colour on transparent (scripts/png-colors.mjs):
//   Bharat-1.ai  magenta/purple #92218f, #6c06b3
//   Sentrix      orange/rust    #9c472b
//
// Contrast against each backdrop:
//                   on #0f0f17    on #ffffff
//   Bharat-1.ai       2.56:1        7.38:1
//   Sentrix           3.05:1        6.12:1
//
// So a white plate roughly triples legibility. Both marks stay unmodified --
// recolouring someone's logo is a brand decision, not a styling one.
//
// The plate is stripe-free because this bar renders in the page shell, OUTSIDE
// every .crt container, so the scanline overlay cannot reach it. z-60 is kept
// as a belt-and-braces guard in case it is ever nested back inside one.
//
// Static imports (rather than /public + a string src) mean Next resolves the
// URL at build time, so these keep working under basePath=/game.

const RATIO_BHARAT = 1197 / 408; // 2.93:1 landscape
const RATIO_SENTRIX = 500 / 500; // 1:1 square

export type PlateStyle = "white" | "translucent" | "none";

const PLATE_BG: Record<PlateStyle, string | undefined> = {
  white: "var(--p-white)",
  translucent: "rgba(255,255,255,0.85)",
  none: undefined,
};

export function PoweredBy({
  height = 40,
  label = null,
  plate = "white",
  className = "",
}: {
  /** Rendered logo height in px; widths derive from each logo's true ratio. */
  height?: number;
  label?: string | null;
  plate?: PlateStyle;
  className?: string;
}) {
  const bw = Math.round(height * RATIO_BHARAT);
  const sw = Math.round(height * RATIO_SENTRIX);
  const padX = Math.round(height * 0.4);
  const padY = Math.round(height * 0.28);
  const bg = PLATE_BG[plate];

  return (
    <div
      className={`relative z-[60] flex flex-col items-center gap-1.5 ${className}`}
    >
      {label && (
        <div className="text-[6px] leading-relaxed text-[var(--p-slate-l)]">
          {label}
        </div>
      )}
      <div
        className={`flex items-center ${plate !== "none" ? "pixel-panel" : ""}`}
        style={{
          gap: Math.round(height * 0.38),
          background: bg,
          padding: plate !== "none" ? `${padY}px ${padX}px` : undefined,
          borderWidth: plate !== "none" ? 3 : undefined,
        }}
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
          style={{
            width: 2,
            height: Math.round(height * 0.66),
            background: plate === "none" ? "var(--p-slate)" : "var(--p-silver)",
          }}
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

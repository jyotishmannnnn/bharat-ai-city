"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { toPng } from "html-to-image";
import { useGameStore } from "@/lib/store";
import { submitRun } from "@/lib/leaderboard";

const STAT_ROWS = [
  { key: "innovationScore" as const, label: "Innovation", icon: "💡" },
  { key: "impactScore" as const, label: "Impact", icon: "🌍" },
  { key: "executionScore" as const, label: "Execution", icon: "⚡" },
  { key: "originalityScore" as const, label: "Originality", icon: "🎨" },
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

  if (!profile) return null;

  const submit = async () => {
    if (submitted) return;
    setSubmitted(true);
    await submitRun(playerName, profile, chosenSectors);
    goTo("leaderboard");
  };

  const download = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${playerName}-bharat-ai-city.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-b from-[#0B1120] to-[#1B0B3D] text-white px-5 pt-8 pb-8 flex flex-col items-center">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-black mb-4 text-center"
      >
        Your Founder Card 🏆
      </motion.h2>

      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, scale: 0.85, rotate: -2 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 14 }}
        className="w-full max-w-sm rounded-[28px] p-6 shadow-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-400 text-white"
      >
        <div className="text-[10px] uppercase tracking-[0.25em] font-bold opacity-80">
          Bharat AI City · Founder Grant
        </div>
        <div className="text-3xl font-black mt-1">{playerName}</div>
        <div className="text-sm font-semibold opacity-90 mb-4">{profile.founderTitle}</div>

        <div className="flex gap-2 mb-4">
          {profile.startups.map((s) => (
            <div
              key={s.name}
              className="flex-1 bg-white/15 rounded-xl py-2 text-center backdrop-blur"
            >
              <div className="text-2xl">{s.logoGlyph}</div>
              <div className="text-[10px] font-bold truncate px-1">{s.name}</div>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 mb-4">
          {STAT_ROWS.map((row) => (
            <div key={row.key} className="flex items-center gap-2">
              <span className="text-sm w-5">{row.icon}</span>
              <span className="text-xs w-20 font-semibold opacity-90">{row.label}</span>
              <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${profile[row.key]}%` }}
                />
              </div>
              <span className="text-xs font-bold w-7 text-right">{profile[row.key]}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-black/20 rounded-xl py-2 text-center">
            <div className="text-xl font-black">₹{profile.totalValuationCr} Cr</div>
            <div className="text-[9px] uppercase font-bold opacity-70">Total Valuation</div>
          </div>
          <div className="bg-black/20 rounded-xl py-2 text-center">
            <div className="text-xl font-black">
              {profile.citizensImpacted.toLocaleString("en-IN")}
            </div>
            <div className="text-[9px] uppercase font-bold opacity-70">Citizens Impacted</div>
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] font-bold opacity-70">
          {profile.archetype.toUpperCase()} · #BuildBharatAICity
        </div>
      </motion.div>

      <div className="w-full max-w-sm grid grid-cols-2 gap-3 mt-5">
        <button
          onClick={download}
          disabled={downloading}
          className="rounded-xl bg-white/10 border border-white/20 py-3 font-bold text-sm active:scale-95 transition"
        >
          {downloading ? "Saving..." : "📸 Save Card"}
        </button>
        <button
          onClick={submit}
          className="rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-slate-950 py-3 font-black text-sm active:scale-95 transition"
        >
          {submitted ? "Submitted ✓" : "🏁 Submit Score"}
        </button>
      </div>

      <button
        onClick={restart}
        className="mt-4 text-white/50 text-sm underline underline-offset-2"
      >
        Play again with new sectors
      </button>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { useGameStore, getSectorTheme } from "@/lib/store";

export default function MissionResult() {
  const missionResults = useGameStore((s) => s.missionResults);
  const generatedStartups = useGameStore((s) => s.generatedStartups);
  const chosenSectors = useGameStore((s) => s.chosenSectors);
  const currentMissionIndex = useGameStore((s) => s.currentMissionIndex);
  const advanceAfterResult = useGameStore((s) => s.advanceAfterResult);

  const result = missionResults[missionResults.length - 1];
  const startup = generatedStartups[generatedStartups.length - 1];
  if (!result || !startup) return null;
  const theme = getSectorTheme(result.sector);
  const isLast = currentMissionIndex + 1 >= chosenSectors.length;

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center px-6 text-white overflow-y-auto py-8"
      style={{ background: `linear-gradient(160deg, ${theme.gradient[0]}, ${theme.gradient[1]})` }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -8 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 10 }}
        className="text-6xl mb-2"
      >
        🎉
      </motion.div>
      <div className="text-sm font-bold uppercase tracking-widest text-white/70 mb-1">
        Startup Launched!
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="text-4xl">{startup.logoGlyph}</div>
          <div>
            <div className="font-black text-xl leading-tight">{startup.name}</div>
            <div className="text-xs text-slate-500">{startup.tagline}</div>
          </div>
        </div>
        <div className="text-sm text-slate-700 my-2">
          <span className="font-bold">USP:</span> {startup.usp}
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {startup.aiStack.map((t) => (
            <span
              key={t}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: theme.accent + "30", color: theme.gradient[1] }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-slate-100 rounded-xl py-2">
            <div className="text-lg font-black">₹{startup.estimatedValuationCr} Cr</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Valuation</div>
          </div>
          <div className="bg-slate-100 rounded-xl py-2">
            <div className="text-lg font-black">{startup.citizensImpacted.toLocaleString("en-IN")}</div>
            <div className="text-[10px] text-slate-500 uppercase font-bold">Citizens Impacted</div>
          </div>
        </div>
        <div className="mt-2 text-[11px] text-slate-400 text-center">
          Founder Archetype: <span className="font-bold text-slate-600">{startup.founderArchetype}</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex gap-4 mt-4 text-xs text-white/80"
      >
        <span>✅ {result.collected} collected</span>
        <span>💥 {result.hits} hits taken</span>
        <span>🔥 score {result.score}</span>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        onClick={advanceAfterResult}
        className="mt-6 w-full max-w-sm rounded-2xl bg-white text-slate-900 py-4 font-black text-lg shadow-xl active:scale-95 transition"
      >
        {isLast ? "REVEAL MY AI CITY 🏙️" : "NEXT MISSION →"}
      </motion.button>
    </div>
  );
}

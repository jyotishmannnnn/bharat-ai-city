"use client";

import { motion } from "framer-motion";
import { useGameStore, getSectorTheme } from "@/lib/store";

export default function MissionIntro() {
  const chosenSectors = useGameStore((s) => s.chosenSectors);
  const currentMissionIndex = useGameStore((s) => s.currentMissionIndex);
  const missionSeeds = useGameStore((s) => s.missionSeeds);
  const beginCurrentMission = useGameStore((s) => s.beginCurrentMission);

  const sectorId = chosenSectors[currentMissionIndex];
  const theme = getSectorTheme(sectorId);
  const seed = missionSeeds[sectorId];

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center px-6 text-white"
      style={{ background: `linear-gradient(160deg, ${theme.gradient[0]}, ${theme.gradient[1]})` }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-xs font-bold tracking-widest uppercase bg-black/30 px-3 py-1 rounded-full mb-3"
      >
        Mission {currentMissionIndex + 1} of {chosenSectors.length}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-6xl mb-2"
      >
        {theme.buildingGlyph}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-3xl font-black text-center"
      >
        {theme.name}
      </motion.h2>
      <p className="text-white/70 text-sm mb-6">{theme.tagline}</p>

      <div className="w-full max-w-xs space-y-2 mb-6">
        {[
          { label: "Problem", value: seed?.problem, icon: "🎯" },
          { label: "Market Condition", value: seed?.market, icon: "📈" },
          { label: "Opportunity", value: seed?.opportunity, icon: "💡" },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 + i * 0.12 }}
            className="bg-black/25 backdrop-blur rounded-xl px-4 py-2.5 flex items-center gap-3"
          >
            <span className="text-xl">{item.icon}</span>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-white/50 font-bold">
                {item.label}
              </div>
              <div className="text-sm font-semibold">{item.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex items-center gap-6 mb-8 text-xs"
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xl">{theme.collectibles[0].glyph}</span>
          <span className="text-white/70">Collect</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xl">{theme.obstacles[0].glyph}</span>
          <span className="text-white/70">Avoid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xl">{theme.powerups[0].glyph}</span>
          <span className="text-white/70">Power-up</span>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85 }}
        onClick={beginCurrentMission}
        className="w-full max-w-xs rounded-2xl bg-white text-slate-900 py-4 font-black text-lg shadow-xl active:scale-95 transition"
      >
        BUILD THIS STARTUP →
      </motion.button>
    </div>
  );
}

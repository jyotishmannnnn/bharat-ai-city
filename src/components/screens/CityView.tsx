"use client";

import { motion } from "framer-motion";
import { useGameStore, getSectorTheme } from "@/lib/store";

const AMBIENT = ["🚗", "🚁", "🚕", "🛵"];

export default function CityView() {
  const chosenSectors = useGameStore((s) => s.chosenSectors);
  const generatedStartups = useGameStore((s) => s.generatedStartups);
  const finalizeFounderProfile = useGameStore((s) => s.finalizeFounderProfile);

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-b from-[#0B1120] via-[#0F1B3D] to-[#142451] text-white flex flex-col items-center px-6 pt-10 pb-8">
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-black text-center"
      >
        Bharat AI City is Rising 🌆
      </motion.h2>
      <p className="text-white/60 text-sm mb-6 text-center">
        Every startup you built just changed the skyline.
      </p>

      {/* skyline */}
      <div className="relative w-full flex-1 flex items-end justify-center gap-4 pb-6">
        {/* ambient sky traffic */}
        {AMBIENT.map((g, i) => (
          <motion.span
            key={i}
            className="absolute text-2xl"
            style={{ top: `${10 + i * 12}%` }}
            initial={{ x: "-10vw" }}
            animate={{ x: "110vw" }}
            transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "linear", delay: i * 1.5 }}
          >
            {g}
          </motion.span>
        ))}

        {chosenSectors.map((sectorId, i) => {
          const theme = getSectorTheme(sectorId);
          const startup = generatedStartups[i];
          return (
            <motion.div
              key={sectorId}
              initial={{ opacity: 0, y: 120, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.4, type: "spring", damping: 12 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3 }}
                className="text-6xl drop-shadow-lg"
              >
                {theme.buildingGlyph}
              </motion.div>
              <div
                className="mt-2 text-[11px] font-bold px-2 py-1 rounded-full text-center max-w-[90px] truncate"
                style={{ background: theme.accent + "30" }}
              >
                {startup?.name ?? theme.buildingName}
              </div>
              {/* light glow base */}
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                className="w-16 h-1.5 rounded-full mt-1"
                style={{ background: theme.accent, filter: "blur(2px)" }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* road */}
      <div className="w-full h-2 bg-white/10 rounded-full mb-8" />

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.6 }}
        onClick={finalizeFounderProfile}
        className="w-full max-w-sm rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-slate-950 py-4 font-black text-lg shadow-xl active:scale-95 transition"
      >
        SEE MY FOUNDER CARD 🏆
      </motion.button>
    </div>
  );
}

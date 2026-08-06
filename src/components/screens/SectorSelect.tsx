"use client";

import { motion, AnimatePresence } from "framer-motion";
import { allSectors, useGameStore } from "@/lib/store";

export default function SectorSelect() {
  const sectors = allSectors();
  const chosenSectors = useGameStore((s) => s.chosenSectors);
  const toggleSector = useGameStore((s) => s.toggleSector);
  const confirmSectors = useGameStore((s) => s.confirmSectors);

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-b from-[#0B1120] to-[#151A34] text-white px-5 pt-8 pb-28">
      <div className="text-center mb-5">
        <h2 className="text-2xl font-black">Choose 3 AI Sectors</h2>
        <p className="text-white/60 text-sm mt-1">
          Pick the startups you want to build ({chosenSectors.length}/3)
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {sectors.map((s) => {
          const selected = chosenSectors.includes(s.id);
          const order = chosenSectors.indexOf(s.id);
          const disabled = !selected && chosenSectors.length >= 3;
          return (
            <motion.button
              key={s.id}
              onClick={() => toggleSector(s.id)}
              disabled={disabled}
              whileTap={{ scale: 0.94 }}
              className={`relative rounded-2xl p-4 text-left border-2 transition ${
                selected ? "border-white" : "border-white/10"
              } ${disabled ? "opacity-40" : ""}`}
              style={{
                background: `linear-gradient(150deg, ${s.gradient[0]}dd, ${s.gradient[1]}dd)`,
              }}
            >
              <AnimatePresence>
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white text-slate-900 text-xs font-black flex items-center justify-center"
                  >
                    {order + 1}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="text-3xl mb-1">{s.buildingGlyph}</div>
              <div className="font-bold text-sm leading-tight">{s.name}</div>
              <div className="text-[11px] text-white/70 mt-0.5">{s.tagline}</div>
            </motion.button>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0B1120] via-[#0B1120]/95 to-transparent">
        <button
          onClick={confirmSectors}
          disabled={chosenSectors.length !== 3}
          className={`w-full rounded-2xl py-4 font-black text-lg transition active:scale-95 ${
            chosenSectors.length === 3
              ? "bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-slate-950 shadow-lg shadow-fuchsia-500/30"
              : "bg-white/10 text-white/40"
          }`}
        >
          {chosenSectors.length === 3 ? "LAUNCH MISSIONS 🚀" : `Pick ${3 - chosenSectors.length} more`}
        </button>
      </div>
    </div>
  );
}

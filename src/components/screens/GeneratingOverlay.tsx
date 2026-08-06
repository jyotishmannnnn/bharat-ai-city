"use client";

import { motion } from "framer-motion";

export default function GeneratingOverlay() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B1120] text-white">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
        className="text-5xl mb-4"
      >
        ⚙️
      </motion.div>
      <div className="font-bold text-lg">Assembling your startup...</div>
      <div className="text-white/50 text-sm mt-1">Crunching the numbers with AI</div>
    </div>
  );
}

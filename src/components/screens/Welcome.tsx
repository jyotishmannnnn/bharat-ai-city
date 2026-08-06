"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore } from "@/lib/store";

const FLOATERS = ["🏥", "🤖", "🚀", "⚛️", "🌾", "🎬", "🏟️", "🛰️"];

export default function Welcome() {
  const [name, setName] = useState("");
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const goTo = useGameStore((s) => s.goTo);

  const start = () => {
    setPlayerName(name.trim() || `Founder${Math.floor(Math.random() * 9000 + 1000)}`);
    goTo("select");
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-gradient-to-br from-[#0B1120] via-[#111C3D] to-[#1B0B3D] flex flex-col items-center justify-center px-6 text-white">
      {FLOATERS.map((f, i) => (
        <motion.span
          key={i}
          className="absolute text-3xl opacity-20"
          style={{ left: `${(i * 47) % 100}%`, top: `${(i * 31) % 100}%` }}
          animate={{ y: [0, -20, 0], rotate: [0, 8, -8, 0] }}
          transition={{ duration: 5 + i, repeat: Infinity, ease: "easeInOut" }}
        >
          {f}
        </motion.span>
      ))}

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center z-10"
      >
        <div className="text-sm font-bold tracking-[0.3em] text-cyan-300 mb-3">
          BHARAT AI SUMMIT PRESENTS
        </div>
        <h1 className="text-4xl sm:text-5xl font-black leading-tight bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300 bg-clip-text text-transparent">
          BUILD BHARAT
          <br />
          AI CITY
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: "spring" }}
        className="mt-8 z-10 bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl px-6 py-5 text-center shadow-2xl"
      >
        <div className="text-xs uppercase tracking-widest text-amber-300 font-bold">
          You just received
        </div>
        <div className="text-3xl font-black mt-1">₹100 Crore</div>
        <div className="text-sm text-white/70">Innovation Grant</div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-6 z-10 text-center text-white/80 max-w-xs"
      >
        Build <span className="font-bold text-white">three AI startups</span> and transform
        Bharat into a Human-Centric AI City.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="mt-8 z-10 w-full max-w-xs"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 16))}
          placeholder="Enter founder name"
          className="w-full rounded-2xl bg-white/10 border border-white/30 px-4 py-3 text-center text-white placeholder-white/40 outline-none focus:border-cyan-300"
        />
        <button
          onClick={start}
          className="mt-4 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-4 font-black text-lg text-slate-950 shadow-lg shadow-fuchsia-500/30 active:scale-95 transition"
        >
          START MY MISSION 🚀
        </button>
      </motion.div>
    </div>
  );
}

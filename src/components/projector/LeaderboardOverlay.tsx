"use client";

// Presenter mode "2" — reuses the same runs data the city canvas already
// holds, just re-sorted and re-rendered as a podium instead of buildings.

import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/game/types";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardOverlay({ rows }: { rows: LeaderboardEntry[] }) {
  const ranked = [...rows].sort((a, b) => b.totalScore - a.totalScore).slice(0, 10);

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center px-10">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-black text-white mb-8 tracking-tight"
      >
        🏆 Top Founders
      </motion.h1>
      <div className="w-full max-w-3xl space-y-2">
        {ranked.map((r, i) => (
          <motion.div
            key={r.id}
            layout
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, layout: { type: "spring", damping: 20 } }}
            className={`flex items-center gap-4 rounded-2xl px-6 py-3 ${
              i < 3 ? "bg-gradient-to-r from-white/15 to-white/5" : "bg-white/5"
            } border border-white/10`}
          >
            <span className="text-2xl w-10 text-center">{MEDALS[i] ?? `#${i + 1}`}</span>
            <span className="flex-1 text-lg font-bold text-white truncate">{r.playerName}</span>
            <span className="text-sm text-white/50 font-semibold">{r.archetype}</span>
            <span className="text-xl font-black text-cyan-300 tabular-nums w-20 text-right">
              {r.totalScore}
            </span>
          </motion.div>
        ))}
        {ranked.length === 0 && (
          <div className="text-center text-white/40 font-semibold py-10">
            Waiting for the first founder to finish...
          </div>
        )}
      </div>
    </div>
  );
}

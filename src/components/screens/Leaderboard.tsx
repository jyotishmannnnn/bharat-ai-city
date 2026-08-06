"use client";

import { motion } from "framer-motion";
import { useLeaderboard } from "@/lib/leaderboard";
import { useGameStore } from "@/lib/store";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function Leaderboard() {
  const { entries, loading, enabled } = useLeaderboard();
  const playerName = useGameStore((s) => s.playerName);
  const restart = useGameStore((s) => s.restart);

  return (
    <div className="w-full h-full overflow-y-auto bg-gradient-to-b from-[#0B1120] to-[#151A34] text-white px-5 pt-8 pb-8">
      <h2 className="text-2xl font-black text-center mb-1">Live Leaderboard 📡</h2>
      <p className="text-white/50 text-sm text-center mb-5">
        Ranked by innovation, impact, execution &amp; valuation
      </p>

      {!enabled && (
        <div className="bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs rounded-xl px-4 py-3 mb-4 text-center">
          Leaderboard offline (no Supabase configured for this run).
        </div>
      )}

      {loading && enabled && (
        <div className="text-center text-white/50 py-10">Loading rankings...</div>
      )}

      <div className="space-y-2">
        {entries.map((e, i) => {
          const isMe = e.playerName === playerName;
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.6) }}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
                isMe ? "bg-fuchsia-500/25 border border-fuchsia-400/50" : "bg-white/5"
              }`}
            >
              <div className="w-8 text-center font-black text-lg">
                {MEDALS[i] ?? i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{e.playerName}</div>
                <div className="text-[11px] text-white/50">
                  {e.archetype} · ₹{e.totalValuationCr} Cr
                </div>
              </div>
              <div className="text-right">
                <div className="font-black">{e.totalScore}</div>
                <div className="text-[10px] text-white/40">score</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {!loading && entries.length === 0 && (
        <div className="text-center text-white/40 py-10">
          Be the first founder on the board!
        </div>
      )}

      <button
        onClick={restart}
        className="mt-6 w-full rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-slate-950 py-4 font-black text-lg active:scale-95 transition"
      >
        PLAY AGAIN 🔁
      </button>
    </div>
  );
}

"use client";

// Presenter mode "2" -- the same runs data the city canvas holds, re-sorted as
// a podium. This is the applause moment, so #1 gets its own block rather than
// being one row among ten.

import { motion } from "framer-motion";
import { LeaderboardEntry } from "@/game/types";
import { getSectorTheme } from "@/lib/store";

const RANK = ["1ST", "2ND", "3RD"];

export default function LeaderboardOverlay({ rows }: { rows: LeaderboardEntry[] }) {
  const ranked = [...rows].sort((a, b) => b.totalScore - a.totalScore).slice(0, 10);
  const champion = ranked[0];
  const rest = ranked.slice(1);

  return (
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-center px-12 font-pixel">
      <motion.h1
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-[var(--p-yellow)] mb-8"
        style={{ fontSize: 34, textShadow: "5px 5px 0 var(--p-blood)" }}
      >
        TOP FOUNDERS
      </motion.h1>

      {champion && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 18 }}
          className="pixel-panel mb-5 flex items-center gap-8 px-10 py-6"
          style={{ background: "var(--p-purple)", borderWidth: 5 }}
        >
          <div className="text-[var(--p-yellow)]" style={{ fontSize: 26 }}>
            1ST
          </div>
          <div className="min-w-0">
            <div className="text-[var(--p-white)] truncate" style={{ fontSize: 30 }}>
              {champion.playerName.toUpperCase()}
            </div>
            <div className="text-[var(--p-ice)] mt-3" style={{ fontSize: 12 }}>
              {champion.archetype.toUpperCase()} /{" "}
              {champion.sectors
                .map((s) => getSectorTheme(s)?.name?.toUpperCase() ?? s.toUpperCase())
                .join(" + ")}
            </div>
          </div>
          <div className="text-[var(--p-lime)] tabular-nums ml-auto" style={{ fontSize: 34 }}>
            {champion.totalScore}
          </div>
        </motion.div>
      )}

      <div className="w-full max-w-4xl flex flex-col gap-2">
        {rest.map((r, i) => {
          const place = i + 1; // champion already shown
          return (
            <motion.div
              key={r.id}
              layout
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4), layout: { type: "spring", damping: 22 } }}
              className="pixel-panel flex items-center gap-6 px-6 py-3"
              style={{
                background: place < 3 ? "var(--p-slate)" : "var(--p-deep)",
                borderWidth: 3,
              }}
            >
              <span
                className="w-16 text-center"
                style={{
                  fontSize: 15,
                  color: place < 3 ? "var(--p-yellow)" : "var(--p-slate-l)",
                }}
              >
                {RANK[place] ?? `#${place + 1}`}
              </span>
              <span className="flex-1 text-[var(--p-white)] truncate" style={{ fontSize: 17 }}>
                {r.playerName.toUpperCase()}
              </span>
              <span className="text-[var(--p-silver)]" style={{ fontSize: 11 }}>
                {r.archetype.toUpperCase()}
              </span>
              <span
                className="text-[var(--p-lime)] tabular-nums w-28 text-right"
                style={{ fontSize: 20 }}
              >
                {r.totalScore}
              </span>
            </motion.div>
          );
        })}

        {ranked.length === 0 && (
          <div
            className="text-center text-[var(--p-slate-l)] py-14 pixel-blink"
            style={{ fontSize: 15 }}
          >
            WAITING FOR THE FIRST FOUNDER...
          </div>
        )}
      </div>
    </div>
  );
}

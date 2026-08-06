"use client";

// "Someone just finished" toast. Fires off the same realtime insert the
// city canvas reacts to — no extra subscription, just a prop.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LeaderboardEntry } from "@/game/types";
import { getSectorTheme } from "@/lib/store";

interface QueuedCallout {
  id: string;
  entry: LeaderboardEntry;
}

export default function FounderCallout({ latest }: { latest: LeaderboardEntry | null }) {
  const [visible, setVisible] = useState<QueuedCallout | null>(null);

  useEffect(() => {
    if (!latest) return;
    setVisible({ id: latest.id, entry: latest });
    const t = setTimeout(() => setVisible(null), 4200);
    return () => clearTimeout(t);
  }, [latest]);

  const sector = visible?.entry.sectors[0];
  const theme = sector ? getSectorTheme(sector) : null;

  return (
    <div className="pointer-events-none fixed top-24 right-6 z-30">
      <AnimatePresence>
        {visible && theme && (
          <motion.div
            key={visible.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 16 }}
            className="w-80 rounded-2xl p-4 shadow-2xl border border-white/15 backdrop-blur-md"
            style={{ background: `linear-gradient(135deg, ${theme.gradient[0]}dd, ${theme.gradient[1]}dd)` }}
          >
            <div className="flex items-center gap-3">
              <div className="text-4xl leading-none">{theme.buildingGlyph}</div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest font-bold text-white/70">
                  {theme.buildingName} District
                </div>
                <div className="text-lg font-black text-white truncate">
                  {visible.entry.playerName}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-white/90">
              <span className="text-xs font-semibold opacity-80">just built</span>
              <span className="text-sm font-bold">
                +{visible.entry.citizensImpacted.toLocaleString("en-IN")} citizens
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

// "Someone just finished" toast. Fires off the same realtime insert the
// city canvas reacts to — no extra subscription, just a prop.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LeaderboardEntry } from "@/game/types";
import { getSectorTheme } from "@/lib/store";

interface QueuedCallout {
  id: string;
  entry: LeaderboardEntry;
}

/** How long each callout holds the screen. */
const DWELL_MS = 2600;
/** Backlog cap. At the end-of-session rush founders land several per second;
 *  without a cap the queue would run minutes behind and the projector would be
 *  celebrating people who finished long ago. Newest wins, oldest is dropped. */
const MAX_QUEUE = 3;

export default function FounderCallout({ latest }: { latest: LeaderboardEntry | null }) {
  const [visible, setVisible] = useState<QueuedCallout | null>(null);
  const queue = useRef<QueuedCallout[]>([]);
  const showing = useRef(false);
  const seen = useRef<Set<string>>(new Set());

  // Enqueue only. Previously this set state directly on every new row, so a
  // burst of finishers replaced each callout within milliseconds and nobody's
  // name was readable.
  useEffect(() => {
    if (!latest || seen.current.has(latest.id)) return;
    seen.current.add(latest.id);
    queue.current.push({ id: latest.id, entry: latest });
    if (queue.current.length > MAX_QUEUE) {
      queue.current.splice(0, queue.current.length - MAX_QUEUE);
    }
  }, [latest]);

  // Drain the queue on a fixed cadence so every callout gets its full dwell.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pump = () => {
      if (stopped) return;
      if (!showing.current && queue.current.length > 0) {
        const next = queue.current.shift()!;
        showing.current = true;
        setVisible(next);
        timer = setTimeout(() => {
          if (stopped) return;
          setVisible(null);
          showing.current = false;
          timer = setTimeout(pump, 260); // brief gap so the exit animation reads
        }, DWELL_MS);
        return;
      }
      timer = setTimeout(pump, 200);
    };

    timer = setTimeout(pump, 200);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

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

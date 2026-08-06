"use client";

// "Someone just finished" toast. Fires off the same realtime insert the
// city canvas reacts to — no extra subscription, just a prop.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LeaderboardEntry } from "@/game/types";
import { getSectorTheme } from "@/lib/store";
import { PixelSprite } from "@/components/retro/PixelSprite";
import { BUILDINGS } from "@/game/retro/items";

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
  const accent = theme?.accent ?? "#3fc9d4";

  return (
    <div className="pointer-events-none fixed top-28 right-8 z-30 font-pixel">
      <AnimatePresence>
        {visible && theme && sector && (
          <motion.div
            key={visible.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ type: "spring", damping: 18 }}
            className="pixel-panel px-5 py-4"
            style={{ background: "var(--p-deep)", borderWidth: 4, width: 400 }}
          >
            <div className="flex items-center gap-4">
              <PixelSprite sprite={BUILDINGS[sector]} size={3} />
              <div className="min-w-0">
                <div style={{ fontSize: 10, color: accent }}>
                  {theme.buildingName.toUpperCase()} DISTRICT
                </div>
                <div
                  className="text-[var(--p-white)] truncate"
                  style={{ fontSize: 20, marginTop: 8 }}
                >
                  {visible.entry.playerName.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between" style={{ marginTop: 14 }}>
              <span className="text-[var(--p-silver)]" style={{ fontSize: 10 }}>
                JUST BUILT
              </span>
              <span className="text-[var(--p-lime)] tabular-nums" style={{ fontSize: 14 }}>
                +{visible.entry.citizensImpacted.toLocaleString("en-IN")}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

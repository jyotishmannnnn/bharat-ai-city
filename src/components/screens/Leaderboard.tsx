"use client";

import { useEffect, useRef, useState } from "react";
import { useLeaderboard } from "@/lib/leaderboard";
import { useGameStore } from "@/lib/store";
import { chiptune, haptics } from "@/lib/chiptune";

const RANK_LABEL = ["1ST", "2ND", "3RD"];

export default function Leaderboard() {
  const { entries, loading, enabled } = useLeaderboard();
  const playerName = useGameStore((s) => s.playerName);
  const restart = useGameStore((s) => s.restart);

  // Track rank movement so a live change is visible instead of silent.
  const prevRanks = useRef<Map<string, number>>(new Map());
  const [moved, setMoved] = useState<Set<string>>(new Set());

  useEffect(() => {
    const next = new Set<string>();
    entries.forEach((e, i) => {
      const before = prevRanks.current.get(e.id);
      if (before !== undefined && before !== i) next.add(e.id);
      prevRanks.current.set(e.id, i);
    });
    if (next.size > 0) {
      setMoved(next);
      const t = setTimeout(() => setMoved(new Set()), 1800);
      return () => clearTimeout(t);
    }
  }, [entries]);

  const myIndex = entries.findIndex((e) => e.playerName === playerName);

  return (
    <div className="pixel-screen crt w-full h-full overflow-y-auto px-4 pt-6 pb-8">
      <h2 className="text-[12px] leading-relaxed text-[var(--p-yellow)] text-center">
        LEADERBOARD
      </h2>
      <p className="text-[6px] leading-[1.9] text-[var(--p-silver)] text-center mt-3 mb-5">
        RANKED BY INNOVATION, IMPACT,
        <br />
        EXECUTION &amp; VALUATION
      </p>

      {!enabled && (
        <div className="pixel-panel bg-[var(--p-blood)] px-3 py-2.5 mb-4">
          <div className="text-[7px] leading-[1.8] text-[var(--p-sand)] text-center">
            LEADERBOARD OFFLINE
          </div>
        </div>
      )}

      {loading && enabled && (
        <div className="text-[8px] leading-relaxed text-[var(--p-slate-l)] text-center py-10 pixel-blink">
          LOADING...
        </div>
      )}

      <div className="space-y-2">
        {entries.map((e, i) => {
          const isMe = e.playerName === playerName;
          const justMoved = moved.has(e.id);
          const top3 = i < 3;
          return (
            <div
              key={e.id}
              className="pixel-panel flex items-center gap-2.5 px-2.5 py-2.5"
              style={{
                background: isMe
                  ? "var(--p-purple)"
                  : justMoved
                  ? "var(--p-slate)"
                  : "var(--p-deep)",
                borderColor: justMoved ? "var(--p-yellow)" : "var(--p-black)",
              }}
            >
              <div
                className="w-9 text-[7px] leading-relaxed text-center"
                style={{
                  color: top3 ? "var(--p-yellow)" : "var(--p-slate-l)",
                }}
              >
                {RANK_LABEL[i] ?? i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[8px] leading-relaxed text-[var(--p-white)] truncate">
                  {e.playerName.toUpperCase()}
                </div>
                <div className="text-[5px] leading-[1.8] text-[var(--p-silver)] mt-1 truncate">
                  {e.archetype.toUpperCase()} / {e.totalValuationCr} CR
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] leading-relaxed text-[var(--p-lime)] tabular-nums">
                  {e.totalScore}
                </div>
                <div className="text-[5px] leading-relaxed text-[var(--p-slate-l)] mt-1">
                  PTS
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && entries.length === 0 && enabled && (
        <div className="text-[7px] leading-[1.9] text-[var(--p-slate-l)] text-center py-10">
          BE THE FIRST FOUNDER
          <br />
          ON THE BOARD!
        </div>
      )}

      {/* Removes the "I don't exist" feeling for players outside the visible top set. */}
      {myIndex === -1 && entries.length > 0 && (
        <div className="pixel-panel bg-[var(--p-shadow)] px-3 py-2.5 mt-3">
          <div className="text-[6px] leading-[1.8] text-[var(--p-silver)] text-center">
            YOU&apos;RE ON THE BOARD BELOW THE TOP {entries.length}
          </div>
        </div>
      )}

      <button
        onClick={() => {
          chiptune.init();
          chiptune.uiTap();
          haptics.medium();
          restart();
        }}
        className="pixel-btn font-pixel w-full mt-6 bg-[var(--p-cyan)] py-4 text-[10px] leading-relaxed text-[var(--p-black)]"
      >
        PLAY AGAIN
      </button>
    </div>
  );
}

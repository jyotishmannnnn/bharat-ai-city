import { useEffect, useRef, useState, useCallback } from "react";
import { supabase, supabaseEnabled } from "@/lib/supabaseClient";
import { FounderProfile, LeaderboardEntry, SectorId } from "@/game/types";

/** Composite leaderboard score blending innovation, impact, execution,
 * originality, valuation and "budget efficiency" (impact per crore spent —
 * rewards founders who did more with the same ₹100 Cr grant). */
export function computeCompositeScore(profile: FounderProfile): number {
  const skillAvg =
    (profile.innovationScore +
      profile.impactScore +
      profile.executionScore +
      profile.originalityScore) /
    4;
  const budgetEfficiency = Math.min(
    100,
    (profile.citizensImpacted / Math.max(1, profile.totalValuationCr)) / 50
  );
  return Math.round(
    skillAvg * 4 + profile.totalValuationCr * 0.6 + budgetEfficiency * 3
  );
}

/** Submit with bounded retry. A dropped submission means a founder never
 *  appears on the board or the projector, which is the worst single-player
 *  failure at the event, so this is worth three attempts. */
export async function submitRun(
  playerName: string,
  profile: FounderProfile,
  sectors: SectorId[]
): Promise<boolean> {
  if (!supabaseEnabled || !supabase) return false;

  const row = {
    player_name: playerName,
    total_score: computeCompositeScore(profile),
    total_valuation_cr: profile.totalValuationCr,
    citizens_impacted: profile.citizensImpacted,
    archetype: profile.archetype,
    sectors,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabase.from("runs").insert(row);
    if (!error) return true;
    // 250ms, 750ms — short enough that the player never notices a stall
    await new Promise((r) => setTimeout(r, 250 * Math.pow(3, attempt)));
  }
  return false;
}

interface RunRow {
  id: string;
  player_name: string;
  total_score: number;
  total_valuation_cr: number;
  citizens_impacted: number;
  archetype: string;
  sectors: SectorId[];
  created_at: string;
}

function rowToEntry(r: RunRow): LeaderboardEntry {
  return {
    id: r.id,
    playerName: r.player_name,
    totalScore: r.total_score,
    totalValuationCr: r.total_valuation_cr,
    citizensImpacted: r.citizens_impacted,
    archetype: r.archetype,
    sectors: r.sectors,
    createdAt: r.created_at,
  };
}

/** Player-device leaderboard.
 *
 *  Deliberately does NOT open a realtime subscription. Supabase's free tier
 *  caps concurrent realtime clients (commonly 200) and this hook runs on every
 *  one of ~1200 phones. Worse, the previous version re-ran the full top-50
 *  query on every INSERT event, so N phones watching N submissions produced
 *  O(N^2) queries — peaking exactly when the room is watching the projector.
 *
 *  Instead: one fetch on mount, then a jittered poll. The jitter matters — a
 *  fixed interval would make 1200 devices fire in lockstep. Polling pauses
 *  while the tab is hidden.
 *
 *  The projector keeps its single realtime channel via useCityFeed, so the big
 *  screen stays live. */
export function useLeaderboard(limit = 50, pollMs = 20000) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  // If Supabase is off there is nothing to wait for, so don't start in a
  // loading state (and don't setState synchronously inside the effect).
  const [loading, setLoading] = useState(supabaseEnabled);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!supabaseEnabled || !supabase) return;
    const { data, error: err } = await supabase
      .from("runs")
      .select("*")
      .order("total_score", { ascending: false })
      .limit(limit);

    if (err) {
      setError(true);
    } else if (data) {
      setEntries((data as RunRow[]).map(rowToEntry));
      setError(false);
    }
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    if (!supabaseEnabled) return;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      if (typeof document === "undefined" || !document.hidden) {
        await refresh();
      }
      if (stopped) return;
      // +/-40% jitter so 1200 devices never align on the same tick
      timerRef.current = setTimeout(tick, pollMs * (0.8 + Math.random() * 0.4));
    };

    // Even the FIRST fetch is jittered. Players reach this screen in a burst
    // once the presenter calls time, and an un-staggered mount fetch from ~1200
    // devices is a thundering herd. Also keeps setState out of the effect body.
    timerRef.current = setTimeout(tick, Math.random() * 400);

    return () => {
      stopped = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [refresh, pollMs]);

  return { entries, loading, error, enabled: supabaseEnabled, refresh };
}

/** Exact rank for a score, for players outside the visible top N.
 *  Uses a HEAD count rather than fetching rows, so it stays cheap at scale. */
export function useMyRank(score: number | null) {
  const [rank, setRank] = useState<number | null>(null);

  useEffect(() => {
    if (!supabaseEnabled || !supabase || score === null) return;
    let cancelled = false;

    void (async () => {
      const { count, error } = await supabase!
        .from("runs")
        .select("*", { count: "exact", head: true })
        .gt("total_score", score);
      if (!cancelled && !error && typeof count === "number") {
        setRank(count + 1);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [score]);

  return rank;
}

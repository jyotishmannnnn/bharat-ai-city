import { useEffect, useState, useCallback } from "react";
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

export async function submitRun(
  playerName: string,
  profile: FounderProfile,
  sectors: SectorId[]
): Promise<void> {
  if (!supabaseEnabled || !supabase) return;
  await supabase.from("runs").insert({
    player_name: playerName,
    total_score: computeCompositeScore(profile),
    total_valuation_cr: profile.totalValuationCr,
    citizens_impacted: profile.citizensImpacted,
    archetype: profile.archetype,
    sectors,
  });
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

export function useLeaderboard(limit = 50) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabaseEnabled || !supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("runs")
      .select("*")
      .order("total_score", { ascending: false })
      .limit(limit);
    if (data) setEntries((data as RunRow[]).map(rowToEntry));
    setLoading(false);
  }, [limit]);

  useEffect(() => {
    refresh();
    const client = supabase;
    if (!supabaseEnabled || !client) return;
    const channel = client
      .channel("runs-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "runs" },
        () => refresh()
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [refresh]);

  return { entries, loading, enabled: supabaseEnabled };
}

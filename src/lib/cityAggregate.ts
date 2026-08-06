// Shared-city aggregation layer for /projector.
// Reuses the existing `public.runs` table and realtime publication — no
// schema changes, no new tables. Every completed run is turned into one or
// more "buildings" (one per sector the player played) and folded into
// running city-wide metrics.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, supabaseEnabled } from "@/lib/supabaseClient";
import { allSectors, getSectorTheme } from "@/lib/store";
import { LeaderboardEntry, SectorId } from "@/game/types";

/** Hard cap so a very long-running event never grows state unbounded.
 * 1200 matches the auditorium capacity this was built for. */
export const MAX_FOUNDERS = 1200;

export interface DistrictInfo {
  id: SectorId;
  name: string;
  icon: string;
  accent: string;
  gradient: [string, string];
}

/** One district per sector, in a stable order (JSON key order) so district
 * grid positions never shuffle as data streams in. */
export const DISTRICTS: DistrictInfo[] = allSectors().map((theme) => ({
  id: theme.id,
  name: theme.buildingName,
  icon: theme.buildingGlyph,
  accent: theme.accent,
  gradient: theme.gradient,
}));

export interface Building {
  /** stable key: `${runId}-${sector}` */
  key: string;
  runId: string;
  sector: SectorId;
  playerName: string;
  citizensImpacted: number;
  valuationCr: number;
  archetype: string;
  createdAt: string;
  /** insertion order within its district — used for stable grid placement */
  districtIndex: number;
}

export interface CityMetrics {
  founders: number;
  population: number;
  jobs: number;
  gdpCr: number;
  innovationIndex: number;
  healthcareCoveragePct: number;
  educationReachPct: number;
  climateImpactPct: number;
}

function emptyMetrics(): CityMetrics {
  return {
    founders: 0,
    population: 0,
    jobs: 0,
    gdpCr: 0,
    innovationIndex: 0,
    healthcareCoveragePct: 0,
    educationReachPct: 0,
    climateImpactPct: 0,
  };
}

function sectorSharePct(rows: LeaderboardEntry[], sector: SectorId, population: number): number {
  if (population <= 0) return 0;
  const impacted = rows
    .filter((r) => r.sectors.includes(sector))
    .reduce((sum, r) => sum + r.citizensImpacted / Math.max(1, r.sectors.length), 0);
  return Math.min(100, Math.round((impacted / population) * 100));
}

export function computeCityMetrics(rows: LeaderboardEntry[]): CityMetrics {
  if (rows.length === 0) return emptyMetrics();
  const population = rows.reduce((s, r) => s + r.citizensImpacted, 0);
  const gdpCr = rows.reduce((s, r) => s + r.totalValuationCr, 0);
  const innovationIndex = Math.round(
    rows.reduce((s, r) => s + r.totalScore, 0) / rows.length
  );
  // Heuristic: every ~8 citizens impacted implies roughly 1 job created
  // across the founder's supply chain. Tunable, not a database value.
  const jobs = Math.round(population / 8);
  return {
    founders: rows.length,
    population,
    jobs,
    gdpCr,
    innovationIndex,
    healthcareCoveragePct: sectorSharePct(rows, "healthcare", population),
    educationReachPct: sectorSharePct(rows, "education", population),
    climateImpactPct: sectorSharePct(rows, "climate", population),
  };
}

/** Expands runs into per-sector buildings, preserving arrival order so a
 * district's layout only ever appends — never reshuffles. */
export function buildingsByDistrict(rows: LeaderboardEntry[]): Record<SectorId, Building[]> {
  const out: Record<string, Building[]> = {};
  for (const d of DISTRICTS) out[d.id] = [];
  for (const row of rows) {
    for (const sector of row.sectors) {
      if (!out[sector]) continue; // unknown sector id — ignore defensively
      out[sector].push({
        key: `${row.id}-${sector}`,
        runId: row.id,
        sector,
        playerName: row.playerName,
        citizensImpacted: Math.round(row.citizensImpacted / Math.max(1, row.sectors.length)),
        valuationCr: Math.round(row.totalValuationCr / Math.max(1, row.sectors.length)),
        archetype: row.archetype,
        createdAt: row.createdAt,
        districtIndex: out[sector].length,
      });
    }
  }
  return out as Record<SectorId, Building[]>;
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

/** Live city feed: one initial fetch, then incremental appends off the same
 * realtime channel pattern as useLeaderboard — but unlike that hook this
 * never re-fetches on insert, it just appends the row that arrived. That's
 * the perf difference that lets this survive 1200 rapid inserts. */
export function useCityFeed() {
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [latest, setLatest] = useState<LeaderboardEntry | null>(null);
  const [connected, setConnected] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  /** Newest created_at seen, so reconciliation only asks for what it missed. */
  const watermark = useRef<string | null>(null);

  const append = useCallback((entry: LeaderboardEntry) => {
    if (seenIds.current.has(entry.id)) return;
    seenIds.current.add(entry.id);
    if (!watermark.current || entry.createdAt > watermark.current) {
      watermark.current = entry.createdAt;
    }
    setRows((prev) => {
      const next = prev.length >= MAX_FOUNDERS ? prev.slice(1) : prev;
      return [...next, entry];
    });
    setLatest(entry);
  }, []);

  useEffect(() => {
    if (!supabaseEnabled || !supabase) return;
    const client = supabase;
    let stopped = false;
    let channel: ReturnType<typeof client.channel> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    /** Pull anything newer than the watermark. Covers two failure modes that
     *  would otherwise silently freeze the projector for the whole event:
     *  a websocket drop, and INSERT events delivered while reconnecting. */
    const reconcile = async () => {
      let q = client
        .from("runs")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(MAX_FOUNDERS);
      if (watermark.current) q = q.gt("created_at", watermark.current);

      const { data } = await q;
      if (!stopped && data) {
        for (const r of data as RunRow[]) append(rowToEntry(r));
      }
    };

    const subscribe = () => {
      if (stopped) return;
      channel = client
        .channel(`projector-city-${Date.now()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "runs" },
          (payload) => append(rowToEntry(payload.new as RunRow))
        )
        .subscribe((status) => {
          if (stopped) return;
          if (status === "SUBSCRIBED") {
            setConnected(true);
            // Catch up on anything that landed while we were away.
            void reconcile();
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            setConnected(false);
            if (channel) {
              void client.removeChannel(channel);
              channel = null;
            }
            reconnectTimer = setTimeout(subscribe, 2000);
          }
        });
    };

    // Safety net: even with a healthy socket, poll periodically so a dropped
    // event can never cost a founder their building on the big screen.
    const poll = () => {
      pollTimer = setTimeout(async () => {
        if (stopped) return;
        await reconcile();
        poll();
      }, 15000);
    };

    void reconcile();
    subscribe();
    poll();

    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollTimer) clearTimeout(pollTimer);
      if (channel) void client.removeChannel(channel);
    };
  }, [append]);

  return { rows, latest, connected, enabled: supabaseEnabled };
}

export function districtFor(sector: SectorId): DistrictInfo {
  return DISTRICTS.find((d) => d.id === sector) ?? DISTRICTS[0];
}

export function themeFor(sector: SectorId) {
  return getSectorTheme(sector);
}

"use client";

// /projector — the auditorium screen. Not a phone page: fullscreen,
// no buttons, auto-running. Presenter drives it with keyboard shortcuts
// only (see PRESENTER NOTES below); attendees never touch this route.
//
// PRESENTER NOTES
//   1  Overview          — autopilot camera (pan / focus-newest / breathe)
//   2  Leaderboard        — live top-10 podium overlay
//   3  City Stats         — metrics bar front and center
//   4  Top District       — camera zooms into the leading sector
//   5  Latest Founders    — camera snaps to whoever just finished
//   Space  Auto-cycle through 1-5 every ~8s
//   M      Play the closing sequence (final tally, thank-you, branding)
//   Esc    Exit closing sequence / back to Overview

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CityCanvas, { PresenterMode } from "@/components/projector/CityCanvas";
import MetricsBar from "@/components/projector/MetricsBar";
import FounderCallout from "@/components/projector/FounderCallout";
import MilestoneBanner from "@/components/projector/MilestoneBanner";
import LeaderboardOverlay from "@/components/projector/LeaderboardOverlay";
import ClosingSequence from "@/components/projector/ClosingSequence";
import { useCityFeed, computeCityMetrics, buildingsByDistrict, DISTRICTS } from "@/lib/cityAggregate";
import { PoweredBy } from "@/components/retro/PoweredBy";

const CYCLE: PresenterMode[] = ["overview", "leaderboard", "stats", "topDistrict", "latest"];

export default function ProjectorPage() {
  const { rows, latest, enabled } = useCityFeed();
  const [mode, setMode] = useState<PresenterMode>("auto");
  const [cycling, setCycling] = useState(false);
  const [ending, setEnding] = useState(false);
  const cycleIndexRef = useRef(0);

  const metrics = useMemo(() => computeCityMetrics(rows), [rows]);
  const grouped = useMemo(() => buildingsByDistrict(rows), [rows]);
  const topDistrict = useMemo(() => {
    let best = null as (typeof DISTRICTS)[number] | null;
    let bestCount = -1;
    for (const d of DISTRICTS) {
      const c = grouped[d.id]?.length ?? 0;
      if (c > bestCount) {
        bestCount = c;
        best = d;
      }
    }
    return bestCount > 0 ? best : null;
  }, [grouped]);

  useEffect(() => {
    if (!cycling) return;
    const id = setInterval(() => {
      cycleIndexRef.current = (cycleIndexRef.current + 1) % CYCLE.length;
      setMode(CYCLE[cycleIndexRef.current]);
    }, 8000);
    return () => clearInterval(id);
  }, [cycling]);

  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === "1") { setCycling(false); setMode("overview"); }
    else if (e.key === "2") { setCycling(false); setMode("leaderboard"); }
    else if (e.key === "3") { setCycling(false); setMode("stats"); }
    else if (e.key === "4") { setCycling(false); setMode("topDistrict"); }
    else if (e.key === "5") { setCycling(false); setMode("latest"); }
    else if (e.key === " ") { e.preventDefault(); setCycling((c) => !c); }
    else if (e.key.toLowerCase() === "m") { setEnding(true); }
    else if (e.key === "Escape") { setEnding(false); setCycling(false); setMode("overview"); }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[var(--p-black)] select-none font-pixel">
      <CityCanvas rows={rows} latest={latest} mode={mode} dim={mode === "leaderboard"} ending={ending} />

      {/* Metrics ride at the top in every mode; "stats" just enlarges them. */}
      {!ending && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-20">
          <MetricsBar metrics={metrics} big={mode === "stats"} />
        </div>
      )}

      {mode === "leaderboard" && !ending && <LeaderboardOverlay rows={rows} />}

      {!ending && <FounderCallout latest={latest} />}
      {!ending && <MilestoneBanner founders={rows.length} />}

      {ending && <ClosingSequence metrics={metrics} topDistrictName={topDistrict?.name ?? null} />}

      {/* Branding sits bottom-left, clear of the callout column on the right. */}
      {!ending && (
        <div className="fixed bottom-6 left-8 z-20">
          <PoweredBy height={30} />
        </div>
      )}

      {!enabled && (
        <div
          className="pixel-panel fixed bottom-6 left-1/2 -translate-x-1/2 z-20 px-5 py-3"
          style={{ background: "var(--p-blood)", borderWidth: 3 }}
        >
          <span className="text-[var(--p-sand)]" style={{ fontSize: 11 }}>
            SUPABASE NOT CONFIGURED / PROJECTOR OFFLINE
          </span>
        </div>
      )}

      {/* Presenter-only status readout, deliberately dim so the room ignores it. */}
      <div
        className="fixed bottom-5 right-6 z-20 text-[var(--p-slate)]"
        style={{ fontSize: 9 }}
      >
        {cycling ? "AUTO-CYCLE" : mode.toUpperCase()}
      </div>
    </div>
  );
}

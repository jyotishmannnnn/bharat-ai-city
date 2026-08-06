"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameStore, getSectorTheme } from "@/lib/store";
import type { Phase } from "@/lib/store";
import { generateStartup } from "@/lib/generateStartup";
import { MissionResult as MissionResultType } from "@/game/types";
import { PoweredBy } from "@/components/retro/PoweredBy";

import Welcome from "@/components/screens/Welcome";
import SectorSelect from "@/components/screens/SectorSelect";
import MissionIntro from "@/components/screens/MissionIntro";
import ItemBriefing from "@/components/screens/ItemBriefing";
import GameCanvas from "@/components/screens/GameCanvas";
import GeneratingOverlay from "@/components/screens/GeneratingOverlay";
import MissionResult from "@/components/screens/MissionResult";
import CityView from "@/components/screens/CityView";
import FounderCard from "@/components/screens/FounderCard";
import Leaderboard from "@/components/screens/Leaderboard";

/** Phases that surrender the logo bar's vertical space.
 *  - playing:  the arcade field needs every pixel of height
 *  - briefing: the densest screen in the game; the logos would push the
 *              "I'M READY" button below the fold on shorter phones */
const HIDE_LOGOS: Phase[] = ["playing", "briefing"];

export default function Home() {
  const phase = useGameStore((s) => s.phase);
  const chosenSectors = useGameStore((s) => s.chosenSectors);
  const currentMissionIndex = useGameStore((s) => s.currentMissionIndex);
  const missionSeeds = useGameStore((s) => s.missionSeeds);
  const completeMission = useGameStore((s) => s.completeMission);
  const goTo = useGameStore((s) => s.goTo);

  const sectorId = chosenSectors[currentMissionIndex];
  const theme = sectorId ? getSectorTheme(sectorId) : null;
  const seed = sectorId ? missionSeeds[sectorId] : null;

  const showLogos = !HIDE_LOGOS.includes(phase);

  /** Startups now resolve from a pre-generated on-device pool, so this returns
   *  in ~0ms. Hold the overlay for a deliberate beat anyway: an instant cut from
   *  gameplay to result gives the reveal no weight, and the overlay's rotating
   *  copy needs a moment to read. This is a fixed, predictable pause rather than
   *  the old open-ended wait on a network call. */
  const handleMissionComplete = async (
    result: MissionResultType,
    valuationMultiplier: number
  ) => {
    goTo("generating");
    const startedAt = Date.now();
    const startup = await generateStartup(result, valuationMultiplier);
    const elapsed = Date.now() - startedAt;
    if (elapsed < 1400) {
      await new Promise((r) => setTimeout(r, 1400 - elapsed));
    }
    result.valuation = startup.estimatedValuationCr;
    completeMission(result, startup);
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-[var(--p-black)]">
      {/* Persistent logo bar. Lives outside AnimatePresence so it stays put
          across phase transitions instead of fading in and out on every screen. */}
      {showLogos && (
        <header className="safe-top shrink-0">
          <PoweredBy height={30} />
        </header>
      )}

      <div className="relative w-full flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
          >
            {phase === "welcome" && <Welcome />}
            {phase === "select" && <SectorSelect />}
            {phase === "missionIntro" && <MissionIntro />}
            {phase === "briefing" && <ItemBriefing />}
            {phase === "playing" && theme && seed && (
              <GameCanvas theme={theme} seed={seed} onComplete={handleMissionComplete} />
            )}
            {phase === "generating" && <GeneratingOverlay />}
            {phase === "missionResult" && <MissionResult />}
            {phase === "cityReveal" && <CityView />}
            {phase === "founderCard" && <FounderCard />}
            {phase === "leaderboard" && <Leaderboard />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

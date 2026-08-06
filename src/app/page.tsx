"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameStore, getSectorTheme } from "@/lib/store";
import { generateStartup } from "@/lib/generateStartup";
import { MissionResult as MissionResultType } from "@/game/types";

import Welcome from "@/components/screens/Welcome";
import SectorSelect from "@/components/screens/SectorSelect";
import MissionIntro from "@/components/screens/MissionIntro";
import GameCanvas from "@/components/screens/GameCanvas";
import GeneratingOverlay from "@/components/screens/GeneratingOverlay";
import MissionResult from "@/components/screens/MissionResult";
import CityView from "@/components/screens/CityView";
import FounderCard from "@/components/screens/FounderCard";
import Leaderboard from "@/components/screens/Leaderboard";

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

  const handleMissionComplete = async (
    result: MissionResultType,
    valuationMultiplier: number
  ) => {
    goTo("generating");
    const startup = await generateStartup(result, valuationMultiplier);
    result.valuation = startup.estimatedValuationCr;
    completeMission(result, startup);
  };

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden">
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
  );
}

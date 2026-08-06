import { create } from "zustand";
import sectorsData from "@/data/sectors.json";
import {
  SectorId,
  SectorTheme,
  MissionSeed,
  MissionResult,
  GeneratedStartup,
  FounderProfile,
} from "@/game/types";
import { deriveFounderScores, pickArchetype } from "@/lib/scoring";

export type Phase =
  | "welcome"
  | "select"
  | "missionIntro"
  | "playing"
  | "generating"
  | "missionResult"
  | "cityReveal"
  | "founderCard"
  | "leaderboard";

const sectors = sectorsData as unknown as Record<SectorId, SectorTheme>;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rollSeed(sector: SectorId): MissionSeed {
  const theme = sectors[sector];
  return {
    sector,
    problem: pick(theme.problems),
    market: pick(theme.markets),
    opportunity: pick(theme.opportunities),
  };
}

interface GameState {
  phase: Phase;
  playerName: string;
  chosenSectors: SectorId[];
  missionSeeds: Record<string, MissionSeed>;
  missionResults: MissionResult[];
  generatedStartups: GeneratedStartup[];
  founderProfile: FounderProfile | null;
  currentMissionIndex: number;

  setPlayerName: (name: string) => void;
  goTo: (phase: Phase) => void;
  toggleSector: (sector: SectorId) => void;
  confirmSectors: () => void;
  beginCurrentMission: () => void;
  completeMission: (result: MissionResult, startup: GeneratedStartup) => void;
  advanceAfterResult: () => void;
  finalizeFounderProfile: () => void;
  restart: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "welcome",
  playerName: "",
  chosenSectors: [],
  missionSeeds: {},
  missionResults: [],
  generatedStartups: [],
  founderProfile: null,
  currentMissionIndex: 0,

  setPlayerName: (name) => set({ playerName: name }),
  goTo: (phase) => set({ phase }),

  toggleSector: (sector) => {
    const { chosenSectors } = get();
    if (chosenSectors.includes(sector)) {
      set({ chosenSectors: chosenSectors.filter((s) => s !== sector) });
    } else if (chosenSectors.length < 3) {
      set({ chosenSectors: [...chosenSectors, sector] });
    }
  },

  confirmSectors: () => {
    const { chosenSectors } = get();
    const seeds: Record<string, MissionSeed> = {};
    chosenSectors.forEach((s) => {
      seeds[s] = rollSeed(s);
    });
    set({ missionSeeds: seeds, currentMissionIndex: 0, phase: "missionIntro" });
  },

  beginCurrentMission: () => set({ phase: "playing" }),

  completeMission: (result, startup) => {
    const { missionResults, generatedStartups } = get();
    set({
      missionResults: [...missionResults, result],
      generatedStartups: [...generatedStartups, startup],
      phase: "missionResult",
    });
  },

  advanceAfterResult: () => {
    const { currentMissionIndex, chosenSectors } = get();
    const next = currentMissionIndex + 1;
    if (next >= chosenSectors.length) {
      set({ phase: "cityReveal" });
    } else {
      set({ currentMissionIndex: next, phase: "missionIntro" });
    }
  },

  finalizeFounderProfile: () => {
    const { missionResults, generatedStartups } = get();
    const scores = deriveFounderScores(missionResults);
    const archetype = pickArchetype(scores);
    const totalValuationCr = generatedStartups.reduce(
      (s, g) => s + g.estimatedValuationCr,
      0
    );
    const citizensImpacted = generatedStartups.reduce(
      (s, g) => s + g.citizensImpacted,
      0
    );
    set({
      founderProfile: {
        founderTitle: `${archetype} of Bharat AI City`,
        innovationScore: scores.innovationScore,
        impactScore: scores.impactScore,
        executionScore: scores.executionScore,
        originalityScore: scores.originalityScore,
        totalValuationCr,
        citizensImpacted,
        startups: generatedStartups,
        archetype,
      },
      phase: "founderCard",
    });
  },

  restart: () =>
    set({
      phase: "welcome",
      chosenSectors: [],
      missionSeeds: {},
      missionResults: [],
      generatedStartups: [],
      founderProfile: null,
      currentMissionIndex: 0,
    }),
}));

export function getSectorTheme(sector: SectorId): SectorTheme {
  return sectors[sector];
}

export function allSectors(): SectorTheme[] {
  return Object.values(sectors);
}

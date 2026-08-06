// Core type definitions for Build Bharat AI City game engine.
// Everything gameplay-related is data-driven from src/data/*.json so the
// SAME arcade engine can be reskinned per sector without code changes.

export type SectorId =
  | "healthcare"
  | "sports"
  | "semiconductors"
  | "quantum"
  | "entertainment"
  | "robotics"
  | "agriculture"
  | "mobility"
  | "education"
  | "climate";

export interface SpriteRef {
  /** emoji or short glyph used as the sprite (fast, no asset loading) */
  glyph: string;
  color: string;
}

export interface SectorTheme {
  id: SectorId;
  name: string;
  tagline: string;
  gradient: [string, string];
  accent: string;
  buildingGlyph: string;
  buildingName: string;
  playerGlyph: string;
  collectibles: (SpriteRef & { label: string; points: number })[];
  obstacles: (SpriteRef & { label: string; penalty: number })[];
  powerups: (SpriteRef & { label: string; effect: PowerupEffect; duration: number })[];
  problems: string[];
  markets: string[];
  opportunities: string[];
}

export type PowerupEffect =
  | "shield"
  | "multiplier"
  | "slowmo"
  | "magnet"
  | "extraLife";

export interface RandomEventChoice {
  label: string;
  description: string;
  scoreDelta?: number;
  valuationMultiplier?: number;
  spawnRateDelta?: number;
  speedDelta?: number;
  livesDelta?: number;
}

export interface RandomEventDef {
  id: string;
  title: string;
  flavor: string; // sector-agnostic template, {sector} gets substituted
  icon: string;
  choices: RandomEventChoice[];
}

export interface MissionSeed {
  sector: SectorId;
  problem: string;
  market: string;
  opportunity: string;
}

export interface MissionResult {
  sector: SectorId;
  seed: MissionSeed;
  score: number;
  collected: number;
  avoided: number;
  hits: number;
  eventChoices: { eventId: string; choiceLabel: string }[];
  durationMs: number;
  valuation: number; // derived
}

export interface GeneratedStartup {
  name: string;
  tagline: string;
  problemSolved: string;
  usp: string;
  aiStack: string[];
  businessModel: string;
  estimatedValuationCr: number;
  citizensImpacted: number;
  founderArchetype: string;
  sector: SectorId;
  logoGlyph: string;
}

export interface FounderProfile {
  founderTitle: string;
  innovationScore: number;
  impactScore: number;
  executionScore: number;
  originalityScore: number;
  totalValuationCr: number;
  citizensImpacted: number;
  startups: GeneratedStartup[];
  archetype: string;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  totalScore: number;
  totalValuationCr: number;
  citizensImpacted: number;
  archetype: string;
  sectors: SectorId[];
  createdAt: string;
}

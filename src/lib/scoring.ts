import { MissionResult } from "@/game/types";

/** Convert raw arcade score into a startup valuation (in Cr) with a bit of
 * randomness so identical scores never produce identical valuations. */
export function scoreToValuation(score: number, seedJitter = Math.random()): number {
  const base = Math.max(5, Math.round(score * 0.42));
  const jitter = 0.85 + seedJitter * 0.4; // 0.85x - 1.25x
  return Math.round(base * jitter);
}

export function scoreToCitizensImpacted(score: number, valuation: number): number {
  const base = score * 850 + valuation * 12000;
  const jitter = 0.9 + Math.random() * 0.3;
  return Math.round((base * jitter) / 100) * 100;
}

export interface FounderScores {
  innovationScore: number;
  impactScore: number;
  executionScore: number;
  originalityScore: number;
}

/** Derive founder-card scores (0-100) from the three mission results. */
export function deriveFounderScores(results: MissionResult[]): FounderScores {
  const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;
  const avgAccuracy =
    results.reduce((s, r) => {
      const total = r.collected + r.hits;
      return s + (total > 0 ? r.collected / total : 0.5);
    }, 0) / results.length;
  const eventBoldness =
    results.reduce((s, r) => s + r.eventChoices.length, 0) / (results.length * 3);

  const clamp = (n: number) => Math.max(35, Math.min(99, Math.round(n)));

  return {
    innovationScore: clamp(50 + avgScore / 12 + Math.random() * 10),
    impactScore: clamp(45 + avgAccuracy * 40 + avgScore / 20),
    executionScore: clamp(40 + avgAccuracy * 50 + Math.random() * 8),
    originalityScore: clamp(50 + eventBoldness * 30 + Math.random() * 15),
  };
}

const ARCHETYPES = [
  "AI Pioneer",
  "DeepTech Visionary",
  "Future Builder",
  "Health Transformer",
  "Chip Architect",
  "Impact Maximizer",
  "Serial Founder",
  "Moonshot Maker",
  "Bharat Builder",
  "Grid Architect",
];

export function pickArchetype(scores: FounderScores): string {
  const top = Math.max(
    scores.innovationScore,
    scores.impactScore,
    scores.executionScore,
    scores.originalityScore
  );
  if (top === scores.innovationScore) return ARCHETYPES[Math.floor(Math.random() * 3)];
  if (top === scores.impactScore) return ARCHETYPES[3 + Math.floor(Math.random() * 2)];
  if (top === scores.executionScore) return ARCHETYPES[5 + Math.floor(Math.random() * 2)];
  return ARCHETYPES[7 + Math.floor(Math.random() * 3)];
}

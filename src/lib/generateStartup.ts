import { GeneratedStartup, MissionResult } from "@/game/types";
import { getSectorTheme } from "@/lib/store";
import { scoreToValuation, scoreToCitizensImpacted } from "@/lib/scoring";
import { generateOfflineStartup } from "@/lib/startupTemplates";

export async function generateStartup(
  result: MissionResult,
  valuationMultiplier: number
): Promise<GeneratedStartup> {
  const theme = getSectorTheme(result.sector);
  const valuation = Math.round(
    scoreToValuation(result.score) * valuationMultiplier
  );
  const citizens = scoreToCitizensImpacted(result.score, valuation);

  let creative;
  try {
    const res = await fetch("/api/generate-startup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector: result.sector,
        seed: result.seed,
        score: result.score,
      }),
    });
    if (!res.ok) throw new Error("bad status");
    creative = await res.json();
  } catch {
    creative = generateOfflineStartup(result.sector);
  }

  return {
    name: creative.name,
    tagline: creative.tagline,
    problemSolved: result.seed.problem,
    usp: creative.usp,
    aiStack: creative.aiStack,
    businessModel: creative.businessModel,
    estimatedValuationCr: valuation,
    citizensImpacted: citizens,
    founderArchetype: creative.founderArchetype,
    sector: result.sector,
    logoGlyph: theme.buildingGlyph,
  };
}

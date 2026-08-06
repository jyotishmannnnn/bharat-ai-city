import { GeneratedStartup, MissionResult, SectorId } from "@/game/types";
import { getSectorTheme } from "@/lib/store";
import { scoreToValuation, scoreToCitizensImpacted } from "@/lib/scoring";
import { generateOfflineStartup } from "@/lib/startupTemplates";
import poolData from "@/data/startupPool.json";

/** One pre-generated startup, produced ahead of the event by
 *  scripts/build-startup-pool.mjs. */
interface PoolEntry {
  name: string;
  tagline: string;
  usp: string;
  aiStack: string[];
  businessModel: string;
  founderArchetype: string;
}

const pool = poolData as unknown as Record<SectorId, PoolEntry[]>;

/** Per-sector cursor into a shuffled copy of the pool. Drawing without
 *  replacement means one device never repeats a name until its sector's pool is
 *  exhausted -- important because a single player plays two missions and would
 *  otherwise occasionally get the same startup twice. */
const decks = new Map<SectorId, { order: number[]; next: number }>();

function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function drawFromPool(sector: SectorId): PoolEntry | null {
  const entries = pool[sector];
  if (!entries || entries.length === 0) return null;

  let deck = decks.get(sector);
  if (!deck || deck.next >= deck.order.length) {
    deck = { order: shuffled(entries.length), next: 0 };
    decks.set(sector, deck);
  }
  const entry = entries[deck.order[deck.next]];
  deck.next += 1;
  return entry ?? null;
}

/** Build the player's startup.
 *
 *  Runs entirely on-device against a pre-generated pool -- no network call, so
 *  there is nothing to rate-limit, time out or queue. Groq's free tier allows
 *  1,000 requests/day and 30/minute, while 1200 players x 2 missions needs
 *  2,400, so calling the API live would have failed for well over half the room.
 *  The pool was produced by the same model ahead of time.
 *
 *  generateOfflineStartup remains as a final guard in case a sector is ever
 *  missing from the pool. */
export async function generateStartup(
  result: MissionResult,
  valuationMultiplier: number
): Promise<GeneratedStartup> {
  const theme = getSectorTheme(result.sector);
  const valuation = Math.round(
    scoreToValuation(result.score) * valuationMultiplier
  );
  const citizens = scoreToCitizensImpacted(result.score, valuation);

  const creative = drawFromPool(result.sector) ?? generateOfflineStartup(result.sector);

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

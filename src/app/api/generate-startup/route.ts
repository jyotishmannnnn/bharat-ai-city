import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import sectorsData from "@/data/sectors.json";
import { SectorId, SectorTheme, MissionSeed } from "@/game/types";
import { generateOfflineStartup } from "@/lib/startupTemplates";

const sectors = sectorsData as unknown as Record<SectorId, SectorTheme>;

export const runtime = "nodejs";
export const maxDuration = 15;

interface Body {
  sector: SectorId;
  seed: MissionSeed;
  score: number;
  playerName?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const { sector, seed, score } = body;
  const theme = sectors[sector];

  const fallback = () => {
    const off = generateOfflineStartup(sector);
    return NextResponse.json({ ...off, source: "offline" });
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallback();

  try {
    const client = new Anthropic({ apiKey });
    const prompt = `You are a witty startup-naming engine for a game called "Build Bharat AI City".
Generate ONE fictional AI startup for the sector "${theme.name}".
Context (randomly rolled this playthrough): problem="${seed.problem}", market condition="${seed.market}", opportunity="${seed.opportunity}". Player performance score: ${score}.
Be creative, punchy, and slightly futuristic. Avoid generic names like "AI Health" or "TechCorp". Never repeat a name you'd consider cliché.
Respond with ONLY minified JSON, no markdown, matching exactly:
{"name":string (1-2 words, catchy, brandable),"tagline":string (<=12 words),"usp":string (<=18 words, unique selling point),"aiStack":string[] (3 short AI technique names),"businessModel":string (<=6 words),"founderArchetype":string (<=4 words, e.g. "The Relentless Builder")}`;

    const resp = await withTimeout(
      client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
      6000
    );

    const textBlock = resp.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return fallback();

    const raw = textBlock.text.trim().replace(/^```json\s*|```$/g, "");
    const parsed = JSON.parse(raw);
    if (!parsed.name || !parsed.tagline) return fallback();

    return NextResponse.json({ ...parsed, source: "llm" });
  } catch {
    return fallback();
  }
}

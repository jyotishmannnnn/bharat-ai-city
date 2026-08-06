import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const { sector, seed, score } = body;
  const theme = sectors[sector];

  const fallback = () => {
    const off = generateOfflineStartup(sector);
    return NextResponse.json({ ...off, source: "offline" });
  };

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return fallback();

  const prompt = `You are a witty startup-naming engine for a game called "Build Bharat AI City".
Generate ONE fictional AI startup for the sector "${theme.name}".
Context (randomly rolled this playthrough): problem="${seed.problem}", market condition="${seed.market}", opportunity="${seed.opportunity}". Player performance score: ${score}.
Be creative, punchy, and slightly futuristic. Avoid generic names like "AI Health" or "TechCorp". Never repeat a name you'd consider cliché.
Respond with ONLY minified JSON, no markdown, matching exactly:
{"name":string (1-2 words, catchy, brandable),"tagline":string (<=12 words),"usp":string (<=18 words, unique selling point),"aiStack":string[] (3 short AI technique names),"businessModel":string (<=6 words),"founderArchetype":string (<=4 words, e.g. "The Relentless Builder")}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: 300,
        temperature: 0.9,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!resp.ok) return fallback();

    const data = await resp.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const raw = text.trim().replace(/^```json\s*|```$/g, "");
    const parsed = JSON.parse(raw);
    if (!parsed.name || !parsed.tagline) return fallback();

    return NextResponse.json({ ...parsed, source: "llm" });
  } catch {
    return fallback();
  }
}

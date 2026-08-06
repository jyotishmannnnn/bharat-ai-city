// Pre-generates a pool of LLM-quality startups and commits it as JSON, so the
// live event makes ZERO API calls.
//
// Why: Groq's free tier allows 1,000 requests/day and 30/minute, but 1200
// players x 2 missions needs 2,400 -- the quota would be exhausted after ~500
// players and the rest would fall back to templates. Generating ahead of time
// removes the dependency completely, and also deletes the "generating" dead-air
// window because lookups are instant.
//
// Batches 10 startups per request, so ~50 requests yields ~500 entries.
// Resumable: the pool is written after every batch.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

for (const raw of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  const eq = line.indexOf("=");
  if (eq > 0 && !line.startsWith("#")) {
    process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
}

const KEY = process.env.GROQ_API_KEY;
if (!KEY) { console.error("GROQ_API_KEY missing"); process.exit(1); }

const OUT = "src/data/startupPool.json";
const MODEL = "llama-3.3-70b-versatile";
const PER_BATCH = 10;
const TARGET_PER_SECTOR = Number(process.argv[2] ?? 50);
// Free tier is 30 req/min and 12k tokens/min; each batch costs ~1.3k tokens,
// so pace at ~8/min to stay clear of both ceilings.
const SPACING_MS = 7500;

const sectors = JSON.parse(readFileSync("src/data/sectors.json", "utf8"));
const pool = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function batch(sectorId, theme, avoid) {
  const prompt = `You are a witty startup-naming engine for a game called "Build Bharat AI City".
Generate ${PER_BATCH} DISTINCT fictional AI startups for the sector "${theme.name}" (${theme.tagline}).
Indian-founded, futuristic, punchy, brandable. Vary the naming style: Sanskrit-rooted, coined words, compound words, short punchy words.
Avoid generic names like "AI Health" or "TechCorp". Do NOT reuse any of these existing names: ${avoid.slice(-60).join(", ") || "(none yet)"}.
Respond with ONLY a minified JSON array of ${PER_BATCH} objects, no markdown, each exactly:
{"name":string (1-2 words, catchy, brandable),"tagline":string (<=12 words),"usp":string (<=18 words),"aiStack":string[] (3 short AI technique names),"businessModel":string (<=6 words),"founderArchetype":string (<=4 words)}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      temperature: 1.0,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (res.status === 429) {
    const retry = Number(res.headers.get("retry-after") ?? 20);
    console.log(`      rate limited, waiting ${retry}s`);
    await sleep((retry + 2) * 1000);
    return [];
  }
  if (!res.ok) {
    console.log(`      HTTP ${res.status}`);
    return [];
  }

  const data = await res.json();
  let text = (data.choices?.[0]?.message?.content ?? "").trim();
  text = text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  // models occasionally wrap the array in an object
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) return [];

  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    return arr.filter(
      (o) =>
        o && typeof o.name === "string" && typeof o.tagline === "string" &&
        typeof o.usp === "string" && Array.isArray(o.aiStack) &&
        typeof o.businessModel === "string" && typeof o.founderArchetype === "string"
    );
  } catch {
    return [];
  }
}

let totalCalls = 0;
const sectorIds = Object.keys(sectors);

for (const sectorId of sectorIds) {
  const theme = sectors[sectorId];
  pool[sectorId] = pool[sectorId] ?? [];
  const seen = new Set(pool[sectorId].map((e) => e.name.toLowerCase()));

  console.log(`\n${theme.name} (${sectorId}) -- have ${pool[sectorId].length}/${TARGET_PER_SECTOR}`);

  let stalls = 0;
  while (pool[sectorId].length < TARGET_PER_SECTOR && stalls < 3) {
    const before = pool[sectorId].length;
    const got = await batch(sectorId, theme, [...seen]);
    totalCalls++;

    let added = 0;
    for (const s of got) {
      const k = s.name.toLowerCase().trim();
      if (seen.has(k)) continue;
      seen.add(k);
      pool[sectorId].push({
        name: s.name.trim(),
        tagline: s.tagline.trim(),
        usp: s.usp.trim(),
        aiStack: s.aiStack.slice(0, 3).map(String),
        businessModel: s.businessModel.trim(),
        founderArchetype: s.founderArchetype.trim(),
      });
      added++;
      if (pool[sectorId].length >= TARGET_PER_SECTOR) break;
    }

    writeFileSync(OUT, JSON.stringify(pool, null, 0));
    console.log(`   +${added} (${pool[sectorId].length}/${TARGET_PER_SECTOR}) call #${totalCalls}`);
    if (pool[sectorId].length === before) stalls++; else stalls = 0;
    await sleep(SPACING_MS);
  }
}

const counts = sectorIds.map((s) => `${s}:${pool[s]?.length ?? 0}`);
const total = sectorIds.reduce((n, s) => n + (pool[s]?.length ?? 0), 0);
console.log(`\nDONE  ${total} startups across ${sectorIds.length} sectors in ${totalCalls} API calls`);
console.log(counts.join("  "));
console.log(`written to ${OUT} (${(JSON.stringify(pool).length / 1024).toFixed(0)} KB)`);

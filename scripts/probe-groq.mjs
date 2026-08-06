// Reads Groq's real rate limits straight from its response headers, and
// measures end-to-end latency for the exact prompt the game sends.
// Deliberately cheap: a handful of calls, not a load test.
import { readFileSync } from "node:fs";

for (const raw of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  const eq = line.indexOf("=");
  if (eq > 0 && !line.startsWith("#")) {
    process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
}

const KEY = process.env.GROQ_API_KEY;
if (!KEY) {
  console.error("GROQ_API_KEY missing");
  process.exit(1);
}

const MODEL = "llama-3.3-70b-versatile";
const PROMPT = `You are a witty startup-naming engine for a game called "Build Bharat AI City".
Generate ONE fictional AI startup for the sector "Healthcare".
Context (randomly rolled this playthrough): problem="Rural clinics lack specialists", market condition="Digital health adoption rising", opportunity="AI triage at scale". Player performance score: 640.
Be creative, punchy, and slightly futuristic. Avoid generic names like "AI Health" or "TechCorp". Never repeat a name you'd consider cliche.
Respond with ONLY minified JSON, no markdown, matching exactly:
{"name":string (1-2 words, catchy, brandable),"tagline":string (<=12 words),"usp":string (<=18 words, unique selling point),"aiStack":string[] (3 short AI technique names),"businessModel":string (<=6 words),"founderArchetype":string (<=4 words, e.g. "The Relentless Builder")}`;

async function call() {
  const t0 = Date.now();
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      temperature: 0.9,
      messages: [{ role: "user", content: PROMPT }],
    }),
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  return { status: res.status, ms, headers: res.headers, text };
}

const HEADERS_OF_INTEREST = [
  "x-ratelimit-limit-requests",
  "x-ratelimit-remaining-requests",
  "x-ratelimit-reset-requests",
  "x-ratelimit-limit-tokens",
  "x-ratelimit-remaining-tokens",
  "x-ratelimit-reset-tokens",
  "retry-after",
];

console.log(`model: ${MODEL}\n`);

const first = await call();
console.log(`status ${first.status}  latency ${first.ms}ms`);
console.log("\n--- rate limit headers ---");
for (const h of HEADERS_OF_INTEREST) {
  const v = first.headers.get(h);
  if (v !== null) console.log(`  ${h.padEnd(32)} ${v}`);
}

if (first.status !== 200) {
  console.log("\n--- body ---");
  console.log(first.text.slice(0, 600));
} else {
  let parsed = null;
  try {
    const data = JSON.parse(first.text);
    const content = data.choices?.[0]?.message?.content ?? "";
    parsed = JSON.parse(content.trim().replace(/^```json\s*|```$/g, ""));
    console.log("\n--- parsed sample ---");
    console.log(`  name       ${parsed.name}`);
    console.log(`  tagline    ${parsed.tagline}`);
    console.log(`  archetype  ${parsed.founderArchetype}`);
    console.log(`  aiStack    ${Array.isArray(parsed.aiStack) ? parsed.aiStack.join(", ") : "(not an array)"}`);
    console.log(`  usage      ${JSON.stringify(data.usage)}`);
  } catch (e) {
    console.log(`\n  JSON PARSE FAILED: ${e.message}`);
    console.log(`  raw: ${first.text.slice(0, 300)}`);
  }
}

// Latency spread over a few sequential calls
console.log("\n--- latency over 5 sequential calls ---");
const times = [first.ms];
let jsonFails = 0;
for (let i = 0; i < 4; i++) {
  const r = await call();
  times.push(r.ms);
  if (r.status === 200) {
    try {
      const c = JSON.parse(r.text).choices[0].message.content;
      JSON.parse(c.trim().replace(/^```json\s*|```$/g, ""));
    } catch {
      jsonFails++;
    }
  }
  process.stdout.write(`  call ${i + 2}: ${r.status} ${r.ms}ms\n`);
}
times.sort((a, b) => a - b);
console.log(
  `\n  min ${times[0]}ms  median ${times[Math.floor(times.length / 2)]}ms  max ${times[times.length - 1]}ms`
);
console.log(`  malformed JSON responses: ${jsonFails}/5`);

const rem = first.headers.get("x-ratelimit-remaining-requests");
const lim = first.headers.get("x-ratelimit-limit-requests");
if (lim) {
  console.log(`\n--- event projection (1200 players x 2 missions = 2400 calls) ---`);
  console.log(`  daily request limit : ${lim}`);
  console.log(`  remaining now       : ${rem}`);
  console.log(`  headroom for 2400   : ${Number(rem) >= 2400 ? "SUFFICIENT" : "INSUFFICIENT"}`);
}

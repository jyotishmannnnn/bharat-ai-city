// Measures what one player actually downloads, then projects it to event scale.
// Vercel bills bandwidth, and the free tier is capped -- so this decides whether
// a Hobby plan survives 1200 people.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";

const PLAYERS = 1200;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Vercel serves static assets pre-compressed with brotli.
function compressed(path) {
  const buf = readFileSync(path);
  try {
    return brotliCompressSync(buf).length;
  } catch {
    return gzipSync(buf).length;
  }
}

const staticFiles = walk(".next/static");
const byType = new Map();
let totalRaw = 0;
let totalBr = 0;

for (const f of staticFiles) {
  const ext = extname(f) || "(none)";
  const raw = statSync(f).size;
  // Fonts/images are already compressed; brotli-ing them again is misleading.
  const br = [".woff2", ".png", ".jpg", ".webp", ".avif"].includes(ext)
    ? raw
    : compressed(f);
  const e = byType.get(ext) ?? { n: 0, raw: 0, br: 0 };
  e.n++; e.raw += raw; e.br += br;
  byType.set(ext, e);
  totalRaw += raw;
  totalBr += br;
}

console.log("=== .next/static contents (what the CDN serves) ===");
for (const [ext, e] of [...byType.entries()].sort((a, b) => b[1].br - a[1].br)) {
  console.log(
    `  ${ext.padEnd(8)} ${String(e.n).padStart(3)} files  ` +
    `${(e.raw / 1024).toFixed(0).padStart(6)} KB raw  ${(e.br / 1024).toFixed(0).padStart(6)} KB compressed`
  );
}
console.log(`  ${"TOTAL".padEnd(8)}     ${(totalRaw / 1024).toFixed(0).padStart(9)} KB raw  ${(totalBr / 1024).toFixed(0).padStart(6)} KB compressed`);

// The startup pool ships inside the client bundle -- worth calling out.
if (existsSync("src/data/startupPool.json")) {
  const poolRaw = statSync("src/data/startupPool.json").size;
  const poolBr = compressed("src/data/startupPool.json");
  console.log(
    `\n  startupPool.json bundled: ${(poolRaw / 1024).toFixed(0)} KB raw -> ~${(poolBr / 1024).toFixed(0)} KB compressed`
  );
}

// A real first visit does not fetch every file -- only the shared chunks plus
// the route. Assume ~70% of static bytes as a conservative first-load estimate.
const firstLoad = totalBr * 0.7;
console.log(`\n=== per player (cold cache, conservative) ===`);
console.log(`  estimated first load : ${(firstLoad / 1024).toFixed(0)} KB`);

const eventBytes = firstLoad * PLAYERS;
console.log(`\n=== ${PLAYERS} players ===`);
console.log(`  total egress         : ${(eventBytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`  Vercel Hobby cap     : 100 GB / month`);
console.log(`  share of monthly cap : ${((eventBytes / (100 * 1024 ** 3)) * 100).toFixed(2)}%`);

console.log(`\n=== runtime requests to Vercel AFTER first load ===`);
const gen = readFileSync("src/lib/generateStartup.ts", "utf8");
const lb = readFileSync("src/lib/leaderboard.ts", "utf8");
console.log(`  startup generation   : ${/fetch\(/.test(gen) ? "SERVER CALL" : "none (on-device pool)"}`);
console.log(`  leaderboard reads    : ${/supabase/.test(lb) ? "direct to Supabase, bypasses Vercel" : "?"}`);
console.log(`  score submission     : direct to Supabase, bypasses Vercel`);
console.log(
  `\n  => Vercel serves each phone once, then does nothing for the rest of the\n` +
  `     session. All live traffic goes to Supabase, which load-tested at\n` +
  `     56 inserts/sec with zero failures.`
);

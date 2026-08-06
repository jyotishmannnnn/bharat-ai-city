// Event rehearsal tool: simulates founders finishing runs.
//
//   node scripts/seed-leaderboard.mjs 30              insert 30 rows instantly
//   node scripts/seed-leaderboard.mjs 40 --drip 1500  one row every 1.5s (live)
//   node scripts/seed-leaderboard.mjs --clear         delete ALL rows
//   node scripts/seed-leaderboard.mjs --count         show current row count
//
// Drip mode is the useful one: leave /projector open on a second screen and
// watch buildings appear, founder callouts fire and milestone banners trigger,
// without playing 40 full runs by hand.
//
// !! Inserts real rows into the configured Supabase project. Run --clear before
// !! the event so rehearsal founders don't appear on the real leaderboard.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const raw of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}
const supabase = createClient(url, key);

const SECTORS = [
  "healthcare", "sports", "semiconductors", "quantum", "entertainment",
  "robotics", "agriculture", "mobility", "education", "climate",
];

const ARCHETYPES = [
  "AI Pioneer", "DeepTech Visionary", "Future Builder", "Health Transformer",
  "Chip Architect", "Impact Maximizer", "Serial Founder", "Moonshot Maker",
  "Bharat Builder", "Grid Architect",
];

const FIRST = [
  "Aarav", "Diya", "Vihaan", "Ananya", "Arjun", "Ishita", "Kabir", "Meera",
  "Rohan", "Saanvi", "Advait", "Nisha", "Karthik", "Priya", "Rahul", "Tara",
  "Vikram", "Zoya", "Aditya", "Lakshmi", "Neel", "Riya", "Sameer", "Divya",
  "Harsh", "Kavya", "Manav", "Pooja", "Siddharth", "Anjali",
];
const LAST = ["S", "K", "R", "M", "N", "P", "V", "B", "J", "T"];

const rand = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rand(a.length)];

function makeRun() {
  // Mirrors the real distribution: composite score is dominated by skill
  // average and valuation, so a wide spread keeps the podium interesting.
  const skill = 40 + rand(58);
  const valuation = 60 + rand(520);
  const citizens = Math.round((skill * 8500 + valuation * 12000) / 100) * 100;
  const score = Math.round(skill * 4 + valuation * 0.6 + rand(40));

  const sectors = [];
  while (sectors.length < 3) {
    const s = pick(SECTORS);
    if (!sectors.includes(s)) sectors.push(s);
  }

  return {
    player_name: `${pick(FIRST)} ${pick(LAST)}`,
    total_score: score,
    total_valuation_cr: valuation,
    citizens_impacted: citizens,
    archetype: pick(ARCHETYPES),
    sectors,
  };
}

const args = process.argv.slice(2);

async function count() {
  const { count: n, error } = await supabase
    .from("runs")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return n ?? 0;
}

// NOTE: never call process.exit() here. The Supabase client keeps handles open,
// and forcing exit trips a libuv assertion on Windows. Set exitCode and let the
// event loop drain naturally instead.
async function main() {
  if (args.includes("--count")) {
    console.log(`runs table currently holds ${await count()} rows`);
    return;
  }

  if (args.includes("--clear")) {
    // Anon role has no DELETE policy (deliberately -- attendees must not be
    // able to wipe the board), so this usually reports zero and needs SQL.
    const { data, error } = await supabase
      .from("runs")
      .delete()
      .not("id", "is", null)
      .select();
    if (error) {
      console.error("delete failed:", error.message);
      process.exitCode = 1;
    } else if (!data || data.length === 0) {
      console.log("Deleted 0 rows -- the anon key has no DELETE policy (by design).");
      console.log("Run this in the Supabase SQL Editor instead:\n");
      console.log("    truncate public.runs;\n");
      process.exitCode = 1;
    } else {
      console.log(`Deleted ${data.length} rows.`);
    }
    return;
  }

  const total = Number(args.find((a) => /^\d+$/.test(a)) ?? 25);
  const dripIdx = args.indexOf("--drip");
  const dripMs = dripIdx !== -1 ? Number(args[dripIdx + 1] ?? 1500) : 0;

  console.log(`Seeding ${total} runs${dripMs ? ` (one every ${dripMs}ms)` : " (bulk)"}`);
  console.log(`Starting row count: ${await count()}\n`);

  if (dripMs > 0) {
    for (let i = 0; i < total; i++) {
      const run = makeRun();
      const { error } = await supabase.from("runs").insert(run);
      if (error) {
        console.error(`  ${i + 1}/${total} FAILED: ${error.message}`);
      } else {
        console.log(
          `  ${String(i + 1).padStart(3)}/${total}  ${run.player_name.padEnd(14)} ` +
          `${String(run.total_score).padStart(5)} pts  ${run.sectors.join(", ")}`
        );
      }
      if (i < total - 1) await new Promise((r) => setTimeout(r, dripMs));
    }
  } else {
    const rows = Array.from({ length: total }, makeRun);
    const { error } = await supabase.from("runs").insert(rows);
    if (error) {
      console.error("insert failed:", error.message);
      process.exitCode = 1;
      return;
    }
    console.log(`Inserted ${total} rows.`);
  }

  console.log(`\nFinal row count: ${await count()}`);
  console.log("\nRemember to clear rehearsal data before the event:");
  console.log("    truncate public.runs;");
}

await main();

// Event-scale load test for Supabase.
// Measures insert throughput under burst, top-N read latency under concurrent
// load, and how many realtime channels the project will actually accept --
// which is the number that decides whether player devices may subscribe.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const raw of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  const eq = line.indexOf("=");
  if (eq > 0 && !line.startsWith("#")) {
    process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const MARKER = "__loadtest__";
const SECTORS = ["healthcare", "climate", "robotics", "education", "mobility"];

const supabase = createClient(url, key);

function pct(arr, p) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

// ------------------------------------------------------- insert burst -----
const INSERTS = Number(process.argv[2] ?? 120);
const CONCURRENCY = 30;

console.log(`=== INSERT BURST: ${INSERTS} rows, ${CONCURRENCY} concurrent ===`);
const insertTimes = [];
let insertFails = 0;
const t0 = Date.now();

let cursor = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < INSERTS) {
      const i = cursor++;
      const s = Date.now();
      const { error } = await supabase.from("runs").insert({
        player_name: `${MARKER}${i}`,
        total_score: 200 + Math.floor(Math.random() * 900),
        total_valuation_cr: 50 + Math.floor(Math.random() * 400),
        citizens_impacted: Math.floor(Math.random() * 900000),
        archetype: "Load Tester",
        sectors: [SECTORS[i % SECTORS.length], SECTORS[(i + 1) % SECTORS.length]],
      });
      insertTimes.push(Date.now() - s);
      if (error) {
        insertFails++;
        if (insertFails <= 3) console.log(`   insert error: ${error.message}`);
      }
    }
  })
);

const wall = Date.now() - t0;
console.log(`  wall time     ${wall}ms  ->  ${(INSERTS / (wall / 1000)).toFixed(0)} inserts/sec`);
console.log(`  latency       p50 ${pct(insertTimes, 50)}ms  p95 ${pct(insertTimes, 95)}ms  max ${Math.max(...insertTimes)}ms`);
console.log(`  failures      ${insertFails}/${INSERTS}`);
const projected = 1200 / (INSERTS / (wall / 1000));
console.log(`  => 1200 submissions would take ~${projected.toFixed(1)}s if all arrived at once\n`);

// --------------------------------------------------------- read burst -----
const READS = 60;
console.log(`=== TOP-50 READ BURST: ${READS} concurrent ===`);
const readTimes = [];
let readFails = 0;
const r0 = Date.now();
await Promise.all(
  Array.from({ length: READS }, async () => {
    const s = Date.now();
    const { error } = await supabase
      .from("runs")
      .select("*")
      .order("total_score", { ascending: false })
      .limit(50);
    readTimes.push(Date.now() - s);
    if (error) {
      readFails++;
      if (readFails <= 3) console.log(`   read error: ${error.message}`);
    }
  })
);
console.log(`  wall time     ${Date.now() - r0}ms`);
console.log(`  latency       p50 ${pct(readTimes, 50)}ms  p95 ${pct(readTimes, 95)}ms  max ${Math.max(...readTimes)}ms`);
console.log(`  failures      ${readFails}/${READS}\n`);

// ---------------------------------------------------- realtime channels ---
const CHANNELS = Number(process.argv[3] ?? 40);
console.log(`=== REALTIME: opening ${CHANNELS} concurrent channels ===`);
const chans = [];
let subscribed = 0;
let chanErrors = 0;

await Promise.all(
  Array.from({ length: CHANNELS }, (_, i) =>
    new Promise((resolve) => {
      const ch = supabase
        .channel(`loadtest-${i}-${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "runs" }, () => {});
      chans.push(ch);
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") { subscribed++; resolve(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { chanErrors++; resolve(); }
      });
      setTimeout(resolve, 12000);
    })
  )
);
console.log(`  subscribed    ${subscribed}/${CHANNELS}`);
console.log(`  errors        ${chanErrors}`);
console.log(
  subscribed === CHANNELS
    ? `  => ${CHANNELS} channels OK. Free tier caps concurrent realtime clients (commonly 200);\n     1200 player devices subscribing would blow past it.\n`
    : `  => FAILED to open all channels -- concurrent realtime ceiling reached.\n`
);
for (const c of chans) await supabase.removeChannel(c);

// -------------------------------------------------------------- cleanup ---
const { data: del } = await supabase
  .from("runs")
  .delete()
  .like("player_name", `${MARKER}%`)
  .select();
if (del && del.length) {
  console.log(`cleanup: removed ${del.length} test rows`);
} else {
  console.log(
    `cleanup: NOT removed (no anon delete policy -- this is correct for the event).\n` +
    `         Run in SQL Editor:  delete from public.runs where player_name like '${MARKER}%';`
  );
}

const { count } = await supabase.from("runs").select("*", { count: "exact", head: true });
console.log(`rows now in table: ${count}`);
process.exit(0);

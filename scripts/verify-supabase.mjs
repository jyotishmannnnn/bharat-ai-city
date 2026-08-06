// One-off preflight check for the live event.
// Verifies: env vars load, `runs` table exists, RLS allows anon select+insert,
// and realtime INSERT events actually reach a subscribed client.
// Run with: node scripts/verify-supabase.mjs
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
  console.error("FAIL: missing env vars");
  process.exit(1);
}
console.log("env       OK  ", url);

const supabase = createClient(url, key);
let failed = false;

// 1. SELECT (RLS read policy + table exists)
const { error: selErr, count } = await supabase
  .from("runs")
  .select("*", { count: "exact", head: true });
if (selErr) {
  console.error("select    FAIL", selErr.message);
  failed = true;
} else {
  console.log(`select    OK   (${count} existing rows)`);
}

// 2. Realtime subscribe, then INSERT, and confirm the event arrives.
let gotRealtime = false;
const channel = supabase
  .channel("verify")
  .on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "runs" },
    () => { gotRealtime = true; }
  );

const subStatus = await new Promise((resolve) => {
  channel.subscribe((status, err) => {
    if (err) console.error("          subscribe error:", err.message || err);
    if (status !== "SUBSCRIBING") resolve(status);
  });
  setTimeout(() => resolve("TIMED_OUT_WAITING"), 15000);
});
if (subStatus === "SUBSCRIBED") {
  console.log("subscribe OK   (channel joined)");
} else {
  console.error(`subscribe FAIL  status=${subStatus}`);
  failed = true;
}

const { data: ins, error: insErr } = await supabase
  .from("runs")
  .insert({
    player_name: "__preflight__",
    total_score: 1,
    total_valuation_cr: 1,
    citizens_impacted: 1,
    archetype: "test",
    sectors: ["healthcare", "climate"],
  })
  .select()
  .single();

if (insErr) {
  console.error("insert    FAIL", insErr.message);
  failed = true;
} else {
  console.log("insert    OK  ", ins.id);
}

await new Promise((r) => setTimeout(r, 3000));
if (gotRealtime) {
  console.log("realtime  OK   (INSERT event received)");
} else {
  console.error("realtime  FAIL  no event received -- run:");
  console.error("          alter publication supabase_realtime add table public.runs;");
  failed = true;
}

// 3. Clean up the probe row so it never shows on the leaderboard.
// NOTE: under RLS, a DELETE with no matching policy affects 0 rows and returns
// NO error -- so we must check the returned row count, not just `error`.
if (ins) {
  const { data: del } = await supabase
    .from("runs")
    .delete()
    .eq("id", ins.id)
    .select();
  if (del && del.length > 0) {
    console.log("cleanup   OK   (probe row removed)");
  } else {
    console.log("cleanup   WARN probe row NOT removed (no anon delete policy).");
    console.log("          Run in SQL Editor before the event:");
    console.log("          delete from public.runs where player_name = '__preflight__';");
  }
}

await supabase.removeChannel(channel);
console.log(failed ? "\nRESULT: FAILED" : "\nRESULT: ALL CHECKS PASSED");
process.exit(failed ? 1 : 0);

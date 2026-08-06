// Single pre-event go/no-go check. Run this on the venue network before doors.
//   node scripts/preflight.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

for (const raw of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const line = raw.trim();
  const eq = line.indexOf("=");
  if (eq > 0 && !line.startsWith("#")) {
    process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
}

let fail = 0;
let warn = 0;
const ok = (m) => console.log(`  PASS  ${m}`);
const bad = (m) => { console.log(`  FAIL  ${m}`); fail++; };
const wrn = (m) => { console.log(`  WARN  ${m}`); warn++; };

console.log("=== 1. Startup pool (removes all API dependency) ===");
if (!existsSync("src/data/startupPool.json")) {
  bad("startupPool.json missing -- every player would get template names");
} else {
  const pool = JSON.parse(readFileSync("src/data/startupPool.json", "utf8"));
  const sectors = Object.keys(JSON.parse(readFileSync("src/data/sectors.json", "utf8")));
  const short = sectors.filter((s) => (pool[s]?.length ?? 0) < 20);
  const total = sectors.reduce((n, s) => n + (pool[s]?.length ?? 0), 0);
  if (short.length) bad(`under-filled sectors: ${short.join(", ")}`);
  else ok(`${total} startups across ${sectors.length} sectors, all >= 20`);
}

console.log("\n=== 2. No live LLM call on the player path ===");
const gen = readFileSync("src/lib/generateStartup.ts", "utf8");
if (/fetch\s*\(/.test(gen)) bad("generateStartup still performs a network fetch");
else ok("generateStartup resolves on-device, zero network calls");

console.log("\n=== 3. Realtime subscriptions ===");
const lb = readFileSync("src/lib/leaderboard.ts", "utf8");
const cf = readFileSync("src/lib/cityAggregate.ts", "utf8");
if (/postgres_changes/.test(lb)) {
  bad("player leaderboard subscribes to realtime -- ~1200 devices would exceed the free-tier cap");
} else ok("player leaderboard polls (no realtime); only the projector subscribes");
if (!/postgres_changes/.test(cf)) bad("projector feed has no realtime subscription");
else ok("projector feed subscribes to realtime");
if (!/CHANNEL_ERROR/.test(cf)) wrn("projector has no reconnect handler");
else ok("projector reconnects on channel error");
if (!/watermark/.test(cf)) wrn("projector has no reconciliation poll");
else ok("projector reconciles missed inserts via watermark poll");

console.log("\n=== 4. Supabase connectivity ===");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  bad("Supabase env vars missing -- leaderboard and projector will be dark");
} else {
  const supabase = createClient(url, key);
  const t0 = Date.now();
  const { count, error } = await supabase.from("runs").select("*", { count: "exact", head: true });
  if (error) bad(`select failed: ${error.message}`);
  else {
    ok(`runs table reachable in ${Date.now() - t0}ms (${count} rows)`);
    if (count > 0) wrn(`${count} rows already present -- truncate before doors if these are tests`);
  }

  const probe = {
    player_name: "__preflight__",
    total_score: 1, total_valuation_cr: 1, citizens_impacted: 1,
    archetype: "preflight", sectors: ["healthcare"],
  };
  const { data: ins, error: insErr } = await supabase.from("runs").insert(probe).select().single();
  if (insErr) bad(`insert failed: ${insErr.message}`);
  else {
    ok("anon insert works (players can submit)");
    const { data: del } = await supabase.from("runs").delete().eq("id", ins.id).select();
    if (del?.length) wrn("anon DELETE is allowed -- an attendee could wipe the board");
    else ok("anon delete correctly blocked; remove probe row via SQL");
  }

  // Realtime round trip. Retried: channel joins are occasionally rejected when
  // the project has just churned connections, and a single miss here would
  // otherwise produce a false NO-GO minutes before doors. The projector itself
  // survives this via its reconnect + watermark reconciliation.
  let delivered = false;
  for (let attempt = 1; attempt <= 3 && !delivered; attempt++) {
    let got = false;
    const ch = supabase.channel(`preflight-${Date.now()}-${attempt}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "runs" }, () => { got = true; });
    const status = await new Promise((res) => {
      ch.subscribe((s) => { if (s !== "SUBSCRIBING") res(s); });
      setTimeout(() => res("TIMEOUT"), 15000);
    });
    if (status === "SUBSCRIBED") {
      const { data: r2 } = await supabase.from("runs")
        .insert({ ...probe, player_name: "__preflight2__" }).select().single();
      await new Promise((r) => setTimeout(r, 4000));
      delivered = got;
      if (r2) await supabase.from("runs").delete().eq("id", r2.id);
    }
    await supabase.removeChannel(ch);
    if (!delivered && attempt < 3) await new Promise((r) => setTimeout(r, 2000));
  }
  if (delivered) ok("realtime INSERT events delivered (projector will update live)");
  else bad("realtime not delivered after 3 attempts -- run: alter publication supabase_realtime add table public.runs;");
}

console.log("\n=== 5. Groq (optional -- pool means this is not on the critical path) ===");
if (!process.env.GROQ_API_KEY) {
  wrn("GROQ_API_KEY not set (fine: the pool is pre-generated)");
} else {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 5, messages: [{ role: "user", content: "hi" }] }),
  });
  const rem = res.headers.get("x-ratelimit-remaining-requests");
  const lim = res.headers.get("x-ratelimit-limit-requests");
  if (res.ok) ok(`Groq reachable, ${rem}/${lim} daily requests remaining (unused at runtime)`);
  else wrn(`Groq returned ${res.status} -- harmless, nothing depends on it`);
}

console.log(`\n${"=".repeat(52)}`);
console.log(fail ? `NO-GO: ${fail} failure(s), ${warn} warning(s)` : `GO  (${warn} warning(s))`);
console.log(`${"=".repeat(52)}`);
process.exit(fail ? 1 : 0);

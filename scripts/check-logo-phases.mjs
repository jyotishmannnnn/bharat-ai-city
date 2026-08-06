// Cross-checks the Phase union in store.ts against HIDE_LOGOS in page.tsx, so
// a phase added later can't silently end up on the wrong side of the rule.
import { readFileSync } from "node:fs";

const store = readFileSync("src/lib/store.ts", "utf8");
const page = readFileSync("src/app/page.tsx", "utf8");

const union = store.match(/export type Phase =([\s\S]*?);/)?.[1] ?? "";
const phases = [...union.matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]);

const hideBlock = page.match(/HIDE_LOGOS:\s*Phase\[\]\s*=\s*\[([\s\S]*?)\]/)?.[1] ?? "";
const hidden = [...hideBlock.matchAll(/"([a-zA-Z]+)"/g)].map((m) => m[1]);

if (phases.length === 0) {
  console.error("could not parse Phase union");
  process.exit(1);
}

const EXPECTED_HIDDEN = ["playing", "briefing"];

let bad = 0;
console.log("phase           logos");
console.log("-------------   -----");
for (const p of phases) {
  const shows = !hidden.includes(p);
  console.log(`${p.padEnd(15)} ${shows ? "shown" : "HIDDEN"}`);
}

// every entry in HIDE_LOGOS must be a real phase
for (const h of hidden) {
  if (!phases.includes(h)) {
    console.log(`\nFAIL  HIDE_LOGOS lists "${h}", which is not a Phase`);
    bad++;
  }
}
// and the hidden set must be exactly the two intended screens
const missing = EXPECTED_HIDDEN.filter((p) => !hidden.includes(p));
const extra = hidden.filter((p) => !EXPECTED_HIDDEN.includes(p));
if (missing.length) {
  console.log(`\nFAIL  expected hidden but shown: ${missing.join(", ")}`);
  bad++;
}
if (extra.length) {
  console.log(`\nFAIL  unexpectedly hidden: ${extra.join(", ")}`);
  bad++;
}

const shownCount = phases.length - hidden.length;
console.log(
  bad
    ? `\nFAILED: ${bad} problem(s)`
    : `\nCorrect: logos on ${shownCount}/${phases.length} phases, hidden on ${hidden.join(" + ")}`
);
process.exit(bad ? 1 : 0);

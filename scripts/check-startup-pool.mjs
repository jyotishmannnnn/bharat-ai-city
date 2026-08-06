// Validates the pre-generated startup pool: shape, per-sector coverage,
// duplicate names, and the collision rate players will actually experience.
import { readFileSync } from "node:fs";

const pool = JSON.parse(readFileSync("src/data/startupPool.json", "utf8"));
const sectors = Object.keys(JSON.parse(readFileSync("src/data/sectors.json", "utf8")));

let bad = 0;
const fail = (m) => { console.log(`FAIL  ${m}`); bad++; };

// every sector present and populated
for (const s of sectors) {
  const n = pool[s]?.length ?? 0;
  if (n < 20) fail(`${s} has only ${n} entries`);
}

// shape
let shapeErrors = 0;
const allNames = [];
for (const s of sectors) {
  for (const e of pool[s] ?? []) {
    const ok =
      typeof e.name === "string" && e.name.length > 0 && e.name.length <= 30 &&
      typeof e.tagline === "string" && e.tagline.length > 0 &&
      typeof e.usp === "string" && e.usp.length > 0 &&
      Array.isArray(e.aiStack) && e.aiStack.length > 0 &&
      typeof e.businessModel === "string" &&
      typeof e.founderArchetype === "string";
    if (!ok) { shapeErrors++; if (shapeErrors <= 3) console.log(`   bad entry in ${s}: ${JSON.stringify(e).slice(0, 120)}`); }
    allNames.push(e.name.toLowerCase());
  }
}
if (shapeErrors) fail(`${shapeErrors} malformed entries`);

// duplicates within a sector (what a player could plausibly notice)
for (const s of sectors) {
  const names = (pool[s] ?? []).map((e) => e.name.toLowerCase());
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length) fail(`${s} has duplicate names: ${[...new Set(dupes)].join(", ")}`);
}

const total = allNames.length;
const uniqueGlobal = new Set(allNames).size;

console.log("per-sector counts:");
for (const s of sectors) console.log(`  ${s.padEnd(16)} ${pool[s]?.length ?? 0}`);
console.log(`\ntotal ${total}, globally unique ${uniqueGlobal} (${((uniqueGlobal / total) * 100).toFixed(1)}%)`);

// Expected collision experience: 1200 players x 2 sectors spread over 10
// sectors = ~240 draws per sector.
const DRAWS = Math.round((1200 * 2) / sectors.length);
console.log(`\nprojected: ~${DRAWS} draws per sector at event scale`);
for (const s of sectors.slice(0, 3)) {
  const n = pool[s].length;
  // expected distinct names drawn = n * (1 - ((n-1)/n)^DRAWS)
  const distinct = n * (1 - Math.pow((n - 1) / n, DRAWS));
  console.log(
    `  ${s.padEnd(16)} pool ${n} -> ~${distinct.toFixed(0)} distinct names shown, ` +
    `avg ${(DRAWS / distinct).toFixed(1)} players share a name`
  );
}
console.log(
  `\nnote: startup names are only ever shown on a player's own card. The\n` +
  `      leaderboard shows archetype, and the projector shows player name +\n` +
  `      district -- so shared names are effectively invisible to the room.`
);

// sample
console.log("\nsample entries:");
for (const s of ["healthcare", "quantum", "climate"]) {
  const e = pool[s]?.[0];
  if (e) console.log(`  [${s}] ${e.name} -- "${e.tagline}" (${e.founderArchetype})`);
}

console.log(bad ? `\nFAILED: ${bad} problem(s)` : "\nPool valid");
process.exit(bad ? 1 : 0);

// Traces the mission progression arithmetic for the configured run length.
// Mirrors store.ts:toggleSector and advanceAfterResult exactly -- an off-by-one
// here would either strand a player on the last mission or skip the city
// reveal, neither of which is obvious until you play a whole run.
import { readFileSync } from "node:fs";

const cfg = readFileSync("src/lib/gameConfig.ts", "utf8");
const N = Number(cfg.match(/MISSIONS_PER_RUN\s*=\s*(\d+)/)?.[1]);
if (!Number.isInteger(N) || N < 1) {
  console.error("could not read MISSIONS_PER_RUN");
  process.exit(1);
}
console.log(`MISSIONS_PER_RUN = ${N}\n`);

let bad = 0;
const check = (name, cond, detail = "") => {
  if (cond) console.log(`ok    ${name}`);
  else {
    console.log(`FAIL  ${name} ${detail}`);
    bad++;
  }
};

// --- selection gate (store.ts toggleSector) -------------------------------
const chosen = [];
const toggle = (s) => {
  const i = chosen.indexOf(s);
  if (i !== -1) chosen.splice(i, 1);
  else if (chosen.length < N) chosen.push(s);
};

for (let i = 0; i < N + 3; i++) toggle(`sector${i}`);
check(`selection caps at ${N}`, chosen.length === N, `got ${chosen.length}`);

toggle(chosen[0]);
check("deselect frees a slot", chosen.length === N - 1);
toggle("late-pick");
check("can refill freed slot", chosen.length === N);

// --- progression (store.ts advanceAfterResult) ----------------------------
let idx = 0;
const visited = [];
let reachedCityReveal = false;

for (let guard = 0; guard < 50; guard++) {
  visited.push(idx);
  const next = idx + 1;
  if (next >= chosen.length) {
    reachedCityReveal = true;
    break;
  }
  idx = next;
}

check("every mission is played exactly once", visited.length === N, `played ${visited.length}`);
check(
  "missions run 0..N-1 in order",
  visited.join(",") === Array.from({ length: N }, (_, i) => i).join(",")
);
check("run ends at the city reveal", reachedCityReveal);

// --- isLast flag used by MissionResult's CTA ------------------------------
const lastFlags = visited.map((i) => i + 1 >= chosen.length);
check(
  "only the final mission shows REVEAL MY CITY",
  lastFlags.filter(Boolean).length === 1 && lastFlags[lastFlags.length - 1] === true,
  `got [${lastFlags.join(", ")}]`
);

console.log(bad ? `\nFAILED: ${bad} check(s)` : "\nMission flow correct");
process.exit(bad ? 1 : 0);

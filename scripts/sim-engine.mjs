// Headless verification of the continuous-movement collision model.
// Compiles engine.ts standalone (it only imports ./types, no path aliases) and
// simulates runs, because the balance impact of switching from integer-lane
// matching to distance-based collision cannot be checked by eye.
import { execSync } from "node:child_process";
import { rmSync, mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const OUT = ".tmp-sim";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
execSync(
  `npx tsc src/game/engine.ts src/game/types.ts --outDir ${OUT} --module es2022 --target es2022 --moduleResolution bundler --skipLibCheck`,
  { stdio: "inherit" }
);

const mod = await import(pathToFileURL(resolve(OUT, "engine.js")).href);
const { ArcadeEngine, LANES, laneToX, COLLECT_RADIUS, OBSTACLE_RADIUS, PLAYER_HALF_W, MISSION_DURATION_MS } = mod;

const theme = {
  id: "healthcare",
  name: "Healthcare",
  collectibles: [
    { glyph: "a", color: "#fff", label: "A", points: 10 },
    { glyph: "b", color: "#fff", label: "B", points: 12 },
    { glyph: "c", color: "#fff", label: "C", points: 14 },
  ],
  obstacles: [
    { glyph: "x", color: "#f00", label: "X", penalty: 15 },
    { glyph: "y", color: "#f00", label: "Y", penalty: 18 },
    { glyph: "z", color: "#f00", label: "Z", penalty: 20 },
  ],
  powerups: [
    { glyph: "p", color: "#0ff", label: "Shield", effect: "shield", duration: 4000 },
    { glyph: "q", color: "#0ff", label: "Boost", effect: "multiplier", duration: 4000 },
    { glyph: "r", color: "#0ff", label: "Magnet", effect: "magnet", duration: 4000 },
  ],
};

let failures = 0;
function check(name, cond, detail = "") {
  if (cond) console.log(`ok    ${name}`);
  else {
    console.log(`FAIL  ${name} ${detail}`);
    failures++;
  }
}

console.log("\n--- constants ---");
check("collect radius is more forgiving than obstacle", COLLECT_RADIUS > OBSTACLE_RADIUS,
  `(${COLLECT_RADIUS} vs ${OBSTACLE_RADIUS})`);
check("obstacle radius below half a lane", OBSTACLE_RADIUS < (1 / LANES) / 2,
  `(${OBSTACLE_RADIUS} vs ${(1 / LANES) / 2})`);
check("collect radius near half a lane", Math.abs(COLLECT_RADIUS - (1 / LANES) / 2) < 0.03);

console.log("\n--- clamping ---");
{
  const e = new ArcadeEngine(theme);
  e.setPlayerX(-5);
  check("clamps left edge", Math.abs(e.playerX - PLAYER_HALF_W) < 1e-9, `got ${e.playerX}`);
  e.setPlayerX(5);
  check("clamps right edge", Math.abs(e.playerX - (1 - PLAYER_HALF_W)) < 1e-9, `got ${e.playerX}`);
  e.setPlayerX(0.5);
  check("accepts mid value", Math.abs(e.playerX - 0.5) < 1e-9);
}

/** Drop one entity of `kind` at `lane` with the player parked at `playerX`. */
function dropOne(kind, lane, playerX) {
  const e = new ArcadeEngine(theme);
  e.setPlayerX(playerX);
  e.spawnCooldown = Number.POSITIVE_INFINITY; // suppress random spawns
  e.entities = [
    { id: 1, kind, lane, x: laneToX(lane), y: 0.0, defIndex: 0, glyph: "", color: "#fff" },
  ];
  for (let i = 0; i < 400 && e.entities.length > 0; i++) e.tick(16, i * 16);
  return { collected: e.collected, hits: e.hits, score: e.score };
}

console.log("\n--- collision, player centred on the lane ---");
for (let lane = 0; lane < LANES; lane++) {
  const x = laneToX(lane);
  check(`lane ${lane}: collectible picked up`, dropOne("collect", lane, x).collected === 1);
  check(`lane ${lane}: obstacle hits`, dropOne("obstacle", lane, x).hits === 1);
}

console.log("\n--- collision, player one full lane away (must miss) ---");
{
  const r1 = dropOne("collect", 2, laneToX(1));
  check("collectible one lane away is missed", r1.collected === 0);
  const r2 = dropOne("obstacle", 2, laneToX(1));
  check("obstacle one lane away is dodged", r2.hits === 0);
}

console.log("\n--- collision, player half a lane away ---");
{
  const halfLane = (1 / LANES) / 2; // 0.1
  const r1 = dropOne("collect", 2, laneToX(2) + halfLane * 0.8); // 0.08 off
  check("collectible at 0.08 offset still collected", r1.collected === 1);
  const r2 = dropOne("obstacle", 2, laneToX(2) + halfLane * 0.95); // 0.095 off
  check("obstacle at 0.095 offset is dodged", r2.hits === 0);
}

console.log("\n--- full 45s runs ---");
{
  const scores = [];
  for (let run = 0; run < 5; run++) {
    const e = new ArcadeEngine(theme);
    let t = 0;
    while (t < MISSION_DURATION_MS) {
      // crude bot: drift toward the lowest unclaimed collectible
      const target = e.entities
        .filter((x) => x.kind === "collect")
        .sort((a, b) => b.y - a.y)[0];
      if (target) {
        const d = target.x - e.playerX;
        e.setPlayerX(e.playerX + Math.max(-0.03, Math.min(0.03, d)));
      }
      e.tick(16, t);
      t += 16;
    }
    scores.push(e.score);
    check(`run ${run}: finite score`, Number.isFinite(e.score), `got ${e.score}`);
    check(`run ${run}: no NaN player x`, Number.isFinite(e.playerX));
    check(`run ${run}: entities bounded`, e.entities.length < 200, `got ${e.entities.length}`);
  }
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  console.log(`\n  bot average score over 5 runs: ${avg}  [${scores.join(", ")}]`);
}

rmSync(OUT, { recursive: true, force: true });
console.log(failures ? `\nFAILED: ${failures} check(s)` : "\nAll checks passed");
process.exit(failures ? 1 : 0);

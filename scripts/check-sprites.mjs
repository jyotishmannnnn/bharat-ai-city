// Validates that every sprite grid is a perfect rectangle of the expected size.
// A sheared sprite renders as garbage rather than throwing, so this is checked
// mechanically instead of by eye.
import { readFileSync } from "node:fs";

let bad = 0;
let total = 0;

function checkFile(path, charClass, expected) {
  const src = readFileSync(path, "utf8");
  const re = new RegExp(
    `const\\s+(\\w+)\\s*:\\s*(?:Sprite|ItemSprite)(?:\\[\\])?\\s*=\\s*(\\[[\\s\\S]*?\\n\\];)`,
    "g"
  );
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = m[1];
    const rows = [...m[2].matchAll(new RegExp(`"([${charClass}]*)"`, "g"))].map((x) => x[1]);
    if (rows.length === 0) continue;
    total++;

    const widths = [...new Set(rows.map((r) => r.length))];
    const problems = [];
    if (widths.length !== 1) problems.push(`ragged widths [${widths.join(", ")}]`);
    if (expected && widths[0] !== expected) problems.push(`width ${widths[0]} != ${expected}`);
    if (expected && rows.length % expected !== 0) {
      problems.push(`rows ${rows.length} not a multiple of ${expected}`);
    }

    if (problems.length) {
      console.log(`FAIL ${name}: ${problems.join("; ")}`);
      rows.forEach((r, i) => {
        if (r.length !== (expected || widths[0])) {
          console.log(`     row ${i}: len ${r.length} "${r}"`);
        }
      });
      bad++;
    } else {
      console.log(`ok   ${name.padEnd(16)} ${widths[0]}x${rows.length}`);
    }
  }
}

console.log("--- sprites.ts (tinted) ---");
checkFile("src/game/retro/sprites.ts", ".KDMLWHS", null);
console.log("\n--- items.ts (fixed colour, must be 16 wide) ---");
checkFile("src/game/retro/items.ts", ".kjzZwWrRepnoadbyYfglLtTcivBSuU", 16);

console.log(bad ? `\nFAILED: ${bad} sprite block(s)` : `\nAll ${total} sprite blocks valid`);
process.exit(bad ? 1 : 0);

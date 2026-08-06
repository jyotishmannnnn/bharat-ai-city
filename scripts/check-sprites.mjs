// Validates that every sprite grid in sprites.ts is a perfect rectangle.
// A sheared sprite renders as garbage rather than throwing, so this is checked
// mechanically instead of by eye.
import { readFileSync } from "node:fs";

const src = readFileSync("src/game/retro/sprites.ts", "utf8");
const blockRe = /const\s+(\w+)\s*:\s*Sprite(?:\[\])?\s*=\s*([\s\S]*?\n\];)/g;

let bad = 0;
let total = 0;
let m;

while ((m = blockRe.exec(src)) !== null) {
  const name = m[1];
  const rows = [...m[2].matchAll(/"([.KDMLWHS]*)"/g)].map((x) => x[1]);
  if (rows.length === 0) continue;
  total++;

  const widths = new Set(rows.map((r) => r.length));
  if (widths.size !== 1) {
    console.log(`MISMATCH ${name}: widths=[${[...widths].join(", ")}] rows=${rows.length}`);
    rows.forEach((r, i) => {
      if (r.length !== rows[0].length) console.log(`   row ${i}: len ${r.length} "${r}"`);
    });
    bad++;
  } else {
    console.log(`ok  ${name.padEnd(16)} w=${rows[0].length} rows=${rows.length}`);
  }
}

console.log(bad ? `\nFAILED: ${bad} sprite block(s)` : `\nAll ${total} sprite blocks rectangular`);
process.exit(bad ? 1 : 0);

// Reads width/height/colour-type straight from the PNG IHDR chunk.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? "logos";
for (const f of readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".png"))) {
  const b = readFileSync(join(dir, f));
  const sig = b.subarray(0, 8).toString("hex");
  if (sig !== "89504e470d0a1a0a") {
    console.log(`${f}: NOT a PNG`);
    continue;
  }
  const w = b.readUInt32BE(16);
  const h = b.readUInt32BE(20);
  const bitDepth = b[24];
  const colorType = b[25];
  const types = {
    0: "grayscale",
    2: "rgb",
    3: "palette",
    4: "grayscale+alpha",
    6: "rgba",
  };
  console.log(
    `${f}\n   ${w}x${h}  ratio ${(w / h).toFixed(2)}:1  ${bitDepth}-bit ${types[colorType] ?? colorType}  ${(b.length / 1024).toFixed(0)} KB  alpha=${colorType === 4 || colorType === 6 ? "yes" : "no"}`
  );
}

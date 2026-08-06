// Tight bounding box of the visible ink in each logo.
// A mark with heavy transparent padding renders visually smaller than one that
// fills its canvas, even at identical CSS height -- so the two logos need
// different scale factors to look the same size side by side.
import { readFileSync, readdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join } from "node:path";

function decode(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const colorType = buf[25];
  const channels = colorType === 6 ? 4 : 3;
  const parts = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    if (type === "IDAT") parts.push(buf.subarray(off + 8, off + 8 + len));
    if (type === "IEND") break;
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(parts));
  const stride = w * channels;
  const out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[i] = v & 0xff;
    }
  }
  return { w, h, channels, data: out };
}

const dir = process.argv[2] ?? "logos";
for (const f of readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".png"))) {
  const { w, h, channels, data } = decode(readFileSync(join(dir, f)));
  let minX = w, minY = h, maxX = -1, maxY = -1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * channels;
      const a = channels === 4 ? data[o + 3] : 255;
      if (a < 24) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < 0) {
    console.log(`${f}: fully transparent`);
    continue;
  }

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  console.log(
    `${f}\n` +
      `   canvas   ${w}x${h}\n` +
      `   ink bbox ${bw}x${bh}  at (${minX},${minY})  ratio ${(bw / bh).toFixed(3)}:1\n` +
      `   padding  L${minX} R${w - 1 - maxX} T${minY} B${h - 1 - maxY}\n` +
      `   ink fills ${((bh / h) * 100).toFixed(0)}% of canvas height, ${((bw / w) * 100).toFixed(0)}% of width\n`
  );
}

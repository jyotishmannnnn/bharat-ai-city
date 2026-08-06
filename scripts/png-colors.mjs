// Dominant-colour report for the logos. Average luminance alone was too blunt:
// a mark can average "dark" while still carrying bright accent colours that
// read fine on a near-black background. This buckets the actual opaque pixels.
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

const BG = [0x0f, 0x0f, 0x17]; // --p-black, the game backdrop
const bgLum = 0.2126 * BG[0] + 0.7152 * BG[1] + 0.0722 * BG[2];

function contrastRatio(r, g, b) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const L1 = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const L2 = 0.2126 * lin(BG[0]) + 0.7152 * lin(BG[1]) + 0.0722 * lin(BG[2]);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

for (const f of readdirSync("logos").filter((n) => n.toLowerCase().endsWith(".png"))) {
  const { w, h, channels, data } = decode(readFileSync(join("logos", f)));
  const buckets = new Map();
  let opaque = 0;

  for (let i = 0; i < w * h; i++) {
    const o = i * channels;
    const a = channels === 4 ? data[o + 3] : 255;
    if (a < 128) continue;
    opaque++;
    // quantise to 32-level buckets so near-identical shades group together
    const key = `${data[o] >> 5},${data[o + 1] >> 5},${data[o + 2] >> 5}`;
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += data[o]; e.g += data[o + 1]; e.b += data[o + 2];
    buckets.set(key, e);
  }

  const top = [...buckets.values()]
    .sort((x, y) => y.n - x.n)
    .slice(0, 6)
    .map((e) => {
      const r = Math.round(e.r / e.n), g = Math.round(e.g / e.n), b = Math.round(e.b / e.n);
      return { r, g, b, pct: (e.n / opaque) * 100, cr: contrastRatio(r, g, b) };
    });

  console.log(`\n${f}  (${w}x${h}, ${opaque.toLocaleString()} opaque px)`);
  console.log(`  backdrop #0f0f17 (luma ${bgLum.toFixed(0)})`);
  for (const c of top) {
    const hex = `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    const verdict =
      c.cr >= 4.5 ? "OK" : c.cr >= 3 ? "LOW" : "FAILS";
    console.log(
      `  ${hex}  ${c.pct.toFixed(1).padStart(5)}%  contrast ${c.cr.toFixed(2).padStart(5)}:1  ${verdict}`
    );
  }
  const weighted = top.reduce((s, c) => s + c.cr * c.pct, 0) / top.reduce((s, c) => s + c.pct, 0);
  console.log(`  weighted contrast vs backdrop: ${weighted.toFixed(2)}:1`);
}

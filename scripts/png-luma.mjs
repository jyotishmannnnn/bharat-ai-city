// Minimal PNG decoder (8-bit RGBA/RGB, non-interlaced) used to answer one
// question: is the visible ink in these logos light or dark? A dark-on-
// transparent logo disappears on the game's near-black background, and that is
// not something you notice until it is on a projector in front of an audience.
import { readFileSync, readdirSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { join } from "node:path";

function decode(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  const interlace = buf[28];
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(`unsupported: depth=${bitDepth} color=${colorType} interlace=${interlace}`);
  }
  const channels = colorType === 6 ? 4 : 3;

  // collect IDAT
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
      switch (filter) {
        case 0: break;
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          break;
        }
        default: throw new Error(`bad filter ${filter}`);
      }
      cur[i] = v & 0xff;
    }
  }
  return { w, h, channels, data: out };
}

const dir = process.argv[2] ?? "logos";
for (const f of readdirSync(dir).filter((n) => n.toLowerCase().endsWith(".png"))) {
  try {
    const { w, h, channels, data } = decode(readFileSync(join(dir, f)));
    let lumSum = 0, opaque = 0, transparent = 0;
    let dark = 0, light = 0;

    for (let i = 0; i < w * h; i++) {
      const o = i * channels;
      const alpha = channels === 4 ? data[o + 3] : 255;
      if (alpha < 24) { transparent++; continue; }
      opaque++;
      const lum = 0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2];
      lumSum += lum;
      if (lum < 96) dark++;
      else if (lum > 160) light++;
    }

    const avg = opaque ? lumSum / opaque : 0;
    const transPct = Math.round((transparent / (w * h)) * 100);
    const verdict =
      avg < 96
        ? "DARK ink  -> INVISIBLE on the dark game background"
        : avg > 160
        ? "LIGHT ink -> safe on the dark background"
        : "MID tone  -> check contrast manually";

    console.log(
      `${f}\n   ${w}x${h}  transparent ${transPct}%  avg luma ${avg.toFixed(0)}/255\n` +
      `   dark px ${Math.round((dark / Math.max(1, opaque)) * 100)}%  light px ${Math.round((light / Math.max(1, opaque)) * 100)}%\n` +
      `   => ${verdict}\n`
    );
  } catch (e) {
    console.log(`${f}: could not analyse (${e.message})\n`);
  }
}

// Verifies .vercelignore does not exclude anything the build imports.
//
// This caught a real outage: an unanchored "logos/" pattern also matched
// src/assets/logos/, so the logo PNGs were stripped from the upload and the
// Vercel build failed with "Module not found" -- while building fine locally,
// because .vercelignore has no effect on a local build.
import { readFileSync, existsSync } from "node:fs";

// Files the build will fail without.
const REQUIRED = [
  "src/assets/logos/bharat1.png",
  "src/assets/logos/sentrix.png",
  "src/data/startupPool.json",
  "src/data/sectors.json",
  "src/data/events.json",
  "next.config.ts",
  "tsconfig.json",
  "package.json",
];

/** Minimal .gitignore-style matcher covering the syntax we actually use. */
function makeMatcher(patterns) {
  const rules = patterns
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("#"))
    .map((raw) => {
      const negate = raw.startsWith("!");
      let p = negate ? raw.slice(1) : raw;
      const anchored = p.startsWith("/");
      if (anchored) p = p.slice(1);
      const dirOnly = p.endsWith("/");
      if (dirOnly) p = p.slice(0, -1);
      const body = p
        .split("/")
        .map((seg) => seg.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]"))
        .join("/");
      // Unanchored patterns match at ANY depth -- this is the trap.
      const re = anchored
        ? new RegExp(`^${body}(/|$)`)
        : new RegExp(`(^|/)${body}(/|$)`);
      return { re, negate, raw, anchored };
    });

  return (path) => {
    let hit = null;
    for (const r of rules) if (r.re.test(path)) hit = r;
    return hit && !hit.negate ? hit : null;
  };
}

if (!existsSync(".vercelignore")) {
  console.log("no .vercelignore -- nothing to check");
  process.exit(0);
}

const lines = readFileSync(".vercelignore", "utf8").split(/\r?\n/);
const match = makeMatcher(lines);

let bad = 0;
console.log("checking required build inputs against .vercelignore:\n");
for (const f of REQUIRED) {
  const hit = match(f);
  if (hit) {
    console.log(`  FAIL  ${f}\n        excluded by pattern "${hit.raw}"` +
      (hit.anchored ? "" : "  <- unanchored, matches at any depth"));
    bad++;
  } else {
    console.log(`  ok    ${f}`);
  }
  if (!existsSync(f)) {
    console.log(`  FAIL  ${f} does not exist on disk`);
    bad++;
  }
}

// Warn about any unanchored directory pattern, since that is the failure mode.
const risky = lines
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#") && !l.startsWith("/") && !l.startsWith("!") && l.endsWith("/"));
if (risky.length) {
  console.log(`\n  WARN  unanchored directory patterns match at any depth: ${risky.join(", ")}`);
  console.log(`        prefix with "/" to anchor them to the repo root`);
}

console.log(bad ? `\nFAILED: ${bad} problem(s)` : "\n.vercelignore is safe");
process.exit(bad ? 1 : 0);

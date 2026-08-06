// The "stripes" bug was the CRT scanline overlay (.crt::after) drawing across
// the logo plate. This asserts the two structural facts that keep it fixed:
//   1. the logo bar renders in the page shell, not inside a .crt screen
//   2. the plate still outranks the overlay's z-index if it is ever re-nested
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync("src/app/page.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");
const comp = readFileSync("src/components/retro/PoweredBy.tsx", "utf8");

let bad = 0;
const check = (name, cond, detail = "") => {
  if (cond) console.log(`ok    ${name}`);
  else {
    console.log(`FAIL  ${name} ${detail}`);
    bad++;
  }
};

// 1. the <header> holding PoweredBy must come before the phase container and
//    must not itself carry the crt class
const headerMatch = page.match(/<header[^>]*>([\s\S]*?)<\/header>/);
check("logo bar lives in a <header>", Boolean(headerMatch));
if (headerMatch) {
  check("header contains PoweredBy", headerMatch[1].includes("<PoweredBy"));
  check("header is not itself a .crt surface", !/class[^>]*\bcrt\b/.test(headerMatch[0]));
  // Compare JSX positions, not the bare identifier -- "AnimatePresence" also
  // appears in the import statement at the top of the file.
  const headerIdx = page.indexOf("<header");
  const phaseIdx = page.indexOf("<AnimatePresence");
  check(
    "header renders outside/above the phase container",
    headerIdx !== -1 && phaseIdx !== -1 && headerIdx < phaseIdx,
    `header@${headerIdx} phase@${phaseIdx}`
  );
}

// 2. no screen component renders PoweredBy any more (those roots carry .crt)
const screens = readdirSync("src/components/screens").filter((f) => f.endsWith(".tsx"));
const offenders = screens.filter((f) =>
  readFileSync(join("src/components/screens", f), "utf8").includes("<PoweredBy")
);
check(
  "no .crt screen renders the logo bar",
  offenders.length === 0,
  offenders.join(", ")
);

// 3. z-index guard still holds
const overlayZ = Number(css.match(/\.crt::after\s*\{[\s\S]*?z-index:\s*(\d+)/)?.[1]);
const plateZ = Number(comp.match(/z-\[(\d+)\]/)?.[1]);
check(
  `plate z-index (${plateZ}) outranks scanline overlay (${overlayZ})`,
  Number.isInteger(overlayZ) && Number.isInteger(plateZ) && plateZ > overlayZ
);

// 4. plate is actually opaque enough to lift contrast
const plateBg = comp.match(/white:\s*"([^"]+)"/)?.[1];
check("white plate uses the palette's white", plateBg === "var(--p-white)", `got ${plateBg}`);

console.log(bad ? `\nFAILED: ${bad} check(s)` : "\nLogo plate cannot be striped");
process.exit(bad ? 1 : 0);

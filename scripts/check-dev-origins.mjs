// Verifies allowedDevOrigins patterns against Next's OWN matcher, so we know
// the LAN IP is actually allowed rather than assuming the glob syntax works.
import { isCsrfOriginAllowed } from "next/dist/esm/server/app-render/csrf-protection.js";

const allowed = ["192.168.*.*", "10.*.*.*", "172.*.*.*"];
// Next always prepends these internally.
const effective = ["**.localhost", "localhost", ...allowed];

const cases = [
  ["172.20.10.4", true, "current iOS hotspot IP"],
  ["172.20.189.53", true, "previous lease"],
  ["192.168.1.42", true, "typical home router"],
  ["192.168.0.7", true, "typical home router"],
  ["10.0.0.15", true, "corporate / venue"],
  ["localhost", true, "loopback name"],
  ["evil.example.com", false, "public host must stay blocked"],
  ["8.8.8.8", false, "public IP must stay blocked"],
];

let bad = 0;
for (const [host, expected, note] of cases) {
  const got = isCsrfOriginAllowed(host, effective);
  const ok = got === expected;
  if (!ok) bad++;
  console.log(
    `${ok ? "ok  " : "FAIL"}  ${host.padEnd(18)} allowed=${String(got).padEnd(5)} ${note}`
  );
}

console.log(bad ? `\nFAILED: ${bad} case(s)` : "\nAll dev-origin cases correct");
process.exit(bad ? 1 : 0);

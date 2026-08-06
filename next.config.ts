import type { NextConfig } from "next";

// Subpath hosting (e.g. yoursite.com/game).
//
// Set NEXT_PUBLIC_BASE_PATH at BUILD time -- Next bakes basePath into the
// generated asset URLs, so changing it after `next build` has no effect.
// Leave unset to serve from the domain root.
//
//   NEXT_PUBLIC_BASE_PATH=/game npm run build
//
// Must start with a slash and must NOT end with one.
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const basePath = rawBasePath.replace(/\/$/, "");

if (basePath && !basePath.startsWith("/")) {
  throw new Error(
    `NEXT_PUBLIC_BASE_PATH must start with "/" (got "${rawBasePath}")`
  );
}

// Next 16 blocks cross-origin requests to dev-only assets (/_next/*, HMR)
// unless the requesting host is allowlisted. Testing on a real phone over the
// LAN therefore fails with a blank screen until the laptop's IP is allowed.
//
// Pinning a single IP is useless here: DHCP reassigns it on every reconnect,
// and the venue network will hand out a different subnet again. So allow the
// RFC1918 private ranges instead.
//
// Patterns are matched segment-by-segment against the host, so "192.168.*.*"
// matches any address on that range. This setting applies to `next dev` ONLY
// and has no effect on a production build.
const devOrigins = [
  "192.168.*.*", // typical home/office routers
  "10.*.*.*", // corporate and many venue networks
  "172.*.*.*", // includes 172.20.10.x, the iOS Personal Hotspot range
  ...(process.env.EXTRA_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;

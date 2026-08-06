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

const nextConfig: NextConfig = {
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;

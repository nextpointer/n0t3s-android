import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export — the web app runs with no server, and the same output
  // (`out/`) is what the Capacitor Android shell serves offline.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;

import type { CapacitorConfig } from "@capacitor/cli";

// Static Next.js export in `out/` is what the Android WebView serves offline.
const config: CapacitorConfig = {
  appId: "io.github.nextpointer.n0t3s",
  appName: "N0T3S",
  webDir: "out",
  server: { androidScheme: "https" },
};

export default config;

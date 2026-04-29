import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  env: {
    NEXT_TELEMETRY_DISABLED: "1",
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Polling nécessaire dans Docker sur WSL2 (inotify non fiable)
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;

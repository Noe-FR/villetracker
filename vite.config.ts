import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// API_URL is set to http://api:8000 inside Docker, localhost:8000 locally
const apiTarget = process.env.API_URL ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});

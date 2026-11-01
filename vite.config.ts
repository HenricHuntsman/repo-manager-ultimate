import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: { port: 4173, allowedHosts: ["terminal.local"] },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});


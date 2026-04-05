/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["__tests__/**/*.test.tsx", "__tests__/**/*.test.ts"],
    setupFiles: ["__tests__/setup.tsx"],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.tsx", "src/**/*.ts"],
      exclude: ["src/main.tsx", "src/vite-env.d.ts"],
    },
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@dompetaing/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
});

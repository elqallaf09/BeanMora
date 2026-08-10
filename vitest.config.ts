import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  // esbuild's automatic JSX runtime — matches Next's own "jsx": "preserve"
  // + automatic-runtime transform, so .tsx test files don't need an
  // explicit `import React from "react"` and don't require pulling in
  // @vitejs/plugin-react just for JSX support.
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

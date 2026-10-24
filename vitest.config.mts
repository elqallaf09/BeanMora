import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // Cross-client pure-logic tests use the root transform configuration even
  // when Expo dependencies have not been installed by the web-only CI job.
  tsconfig: fileURLToPath(new URL('./tsconfig.json', import.meta.url)),
  // Next keeps JSX for SWC; tests must transform it before import analysis.
  // Vite 8 uses Oxc, so the former esbuild-only override no longer applies.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    maxWorkers: 2,
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});

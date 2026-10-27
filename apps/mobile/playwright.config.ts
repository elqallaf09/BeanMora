import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', workers: process.env.CI ? 2 : 1, retries: 0, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:8088', viewport: { width: 390, height: 844 } },
  webServer: { command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:8088', reuseExistingServer: false },
});

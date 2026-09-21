import { defineConfig, devices } from '@playwright/test';

if (process.env.BEANMORA_SMOKE !== '1' || process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:54329') {
  throw new Error('Smoke tests require isolated loopback configuration, never a live Supabase project');
}
export default defineConfig({
  testDir: './e2e',
  testMatch: 'release-smoke.spec.ts',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 45000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-smoke-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium-320', use: { browserName: 'chromium', viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 14'] } },
  ],
  webServer: [
    { command: 'node e2e/fixtures/supabase-smoke.mjs', url: 'http://127.0.0.1:54329/health', reuseExistingServer: false },
    { command: 'npm run start -- --hostname 127.0.0.1', url: 'http://127.0.0.1:3000/en/login', reuseExistingServer: false, timeout: 60000 },
  ],
});

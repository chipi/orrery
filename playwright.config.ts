import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e config (per ADR-015).
 *
 * Tests live in `tests/e2e/`. They run against the production build via
 * `vite preview` so we exercise the same artefacts the user gets — the
 * adapter-static SPA on a real port, not the dev server.
 *
 * Two projects: desktop Chromium and mobile Chromium (Pixel 5 viewport).
 * Both use Chromium so CI installs only one browser binary. The mobile
 * project is what catches the bottom-sheet panel layout, the porkchop
 * magnifier touch interaction, and the touch-target rules from
 * ADR-018.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  // Cap workers locally — Chromium's rAF runs slower under high
  // concurrency, which destabilises canvas-based tests that wait for
  // a paint frame. CI uses a single worker for determinism.
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      // Pixel 5 is a Chromium-based mobile device profile, so CI only
      // needs to install one browser. iPhone profiles use WebKit which
      // doubles install time + image footprint.
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    // Build is run beforehand by `test:e2e` to keep this command fast
    // and the timeout small. Preview-only typically starts in < 2 s.
    command: 'npx vite preview --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

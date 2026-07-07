import { defineConfig, devices } from '@playwright/test';

/**
 * Mobile (Capacitor stream-heavy) e2e config — Layer 1 of the mobile test
 * strategy (docs/guides/mobile-testing.md).
 *
 * SEPARATE from playwright.config.ts on purpose. The browser e2e suite runs
 * against the full local build (every image/audio/locale on-device). This
 * suite runs against the `MOBILE=1` build (ADR-078/-079): images + audio +
 * non-default locales pruned off-device and streamed from GitHub Pages. The
 * two serve DIFFERENT `build/` artefacts from the same port, so they can't
 * share a webServer — hence a second config + `npm run test:e2e:mobile`,
 * which runs `build:mobile` first.
 *
 * What it validates WITHOUT a device or simulator: the `__MOBILE__` streaming
 * contract baked into the prerendered bundle — CDN-routed asset URLs, the
 * on-device prune, and the en-US-only service-worker precache. The genuinely
 * native surface (safe-area, plugins, WebGL context-loss) is Layer 2/3 —
 * see the guide.
 *
 * Runs on plain Chromium (Pixel 5 profile) so CI installs one browser binary,
 * matching playwright.config.ts's rationale. The CDN origin is stubbed per
 * spec so the run never depends on chipi.github.io being reachable.
 */
export default defineConfig({
  testDir: './tests/e2e/mobile',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    // Same override seam as the browser config: point at an external base
    // URL (e.g. a device-served bundle) and the local preview is skipped.
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Block the SW so a precached response from an earlier spec can't mask
    // the pruned-locally (404) assertions. The precache MANIFEST is still
    // asserted directly by reading /sw.js as text.
    serviceWorkers: 'block',
  },

  projects: [
    {
      name: 'mobile-streaming',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // Serves the PRUNED build/ (produced by `build:mobile`, run beforehand
        // by `test:e2e:mobile`) — NOT `vite preview`, which serves the unpruned
        // `.svelte-kit/output/`. This is the exact tree Capacitor ships. See
        // scripts/mobile/serve-build.mjs.
        command: 'node scripts/mobile/serve-build.mjs',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});

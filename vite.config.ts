import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
) as { version: string };

/**
 * v0.1.12 / ADR-029 — service worker via @vite-pwa/sveltekit. Cache
 * strategies:
 *   - Shell + textures + fonts + logos + images: precache (cache-first)
 *   - Mission JSON + i18n overlays: stale-while-revalidate
 *   - Mission gallery + porkchop manifests: network-first
 *
 * The static manifest (static/manifest.webmanifest) is shipped as-is
 * by adapter-static; we tell the plugin not to generate one.
 */
export default defineConfig({
  // Expose package.json version as a global at build time so the
  // footer can render `v0.3.0` without runtime fetches or extra JSON.
  // Replaced literally in the bundle by Vite's `define`.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5273,
    strictPort: true,
    // Allow imports from static/ — used by $data/ alias for build-time
    // JSON imports (planets, small-bodies, scenarios). Without this,
    // Vite's default fs.allow excludes static/ and dev-only 404s flood
    // the console.
    fs: { allow: ['static'] },
  },
  preview: { port: 5273, strictPort: true },
  plugins: [
    sveltekit(),
    SvelteKitPWA({
      strategies: 'generateSW',
      registerType: 'prompt',
      // Existing static manifest is the source of truth.
      manifest: false,
      injectRegister: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,webp,woff2,ico}', 'manifest.webmanifest'],
        // Don't precache the porkchop grid JSONs — large + per-route.
        globIgnores: ['**/porkchop/*.json'],
        // Default cap is 2 MiB; some agency mission photos (e.g. Hope Probe
        // hi-res) sit at 3–4 MB. Bump the precache ceiling to 8 MiB so the
        // PWA build doesn't reject them.
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        runtimeCaching: [
          {
            // Mission base files + per-locale overlays.
            urlPattern: ({ url }) => /\/data\/(missions|i18n)\/.*\.json$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'orrery-mission-data',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Gallery manifests + flight-data manifests.
            urlPattern: ({ url }) =>
              /\/data\/(mission-galleries|planet-galleries|sun-gallery|earth-object-galleries|moon-site-galleries|iss-galleries)\.json$/.test(
                url.pathname,
              ),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'orrery-gallery-manifests',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 10 },
            },
          },
        ],
        // SPA fallback so deep links work offline. SvelteKit's static
        // adapter writes 404.html as fallback (svelte.config.js:13).
        navigateFallback: '404.html',
      },
      devOptions: {
        // Don't run the SW in `vite dev` — only in `vite preview` /
        // production. Prevents stale-cache headaches during dev.
        enabled: false,
      },
    }),
  ],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.test.ts'],
    // S1 (Test-coverage gap-closure plan) — print-only baseline via
    // `npm run test:coverage`. Not gated in CI; threshold revisited
    // after 2 weeks of baseline data. Excludes auto-generated paraglide
    // bundle, one-shot migration scripts, the screenshot harness, and
    // Svelte SFCs (route pages exercise their lib code; tracking SFCs
    // separately adds noise without signal).
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/lib/paraglide/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/routes/**/+page.svelte',
        'src/routes/**/+layout.svelte',
        'src/routes/**/+page.ts',
        'src/routes/**/+layout.ts',
        'scripts/migrate-*.ts',
        'scripts/capture-screenshots.ts',
        'scripts/wave23/',
        '*.config.{js,ts}',
        '.svelte-kit/',
      ],
    },
  },
});

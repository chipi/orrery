import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vitest/config';

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
  },
});

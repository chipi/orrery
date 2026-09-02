import { sveltekit } from '@sveltejs/kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { compression } from 'vite-plugin-compression2';
import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
// GH Pages compat — see scripts/gh-pages-compat.mjs header. Returns
// `undefined` when VITE_BASE is empty, so the canonical no-base build
// (VPS) is byte-identical to what it was before this file existed.
import { ghPagesUrlPatterns } from './scripts/gh-pages-compat.mjs';

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
export default defineConfig(({ mode }) => {
  // loadEnv() reads .env / .env.local / .env.<mode> in CWD merged into
  // a plain map — same precedence vite uses for app-time env, but
  // available here at config-eval time (process.env alone wouldn't
  // catch .env.local).
  const env = loadEnv(mode, process.cwd(), '');
  const devPort = parseInt(env.VITE_DEV_PORT || '5273', 10);
  // MOBILE=1 selects the Capacitor stream-heavy profile (RFC-018 §4 /
  // ADR-078): heavy asset buckets (images, audio, non-default-locale
  // overlays) are pruned from build/ after the build and streamed from
  // chipi.github.io at runtime instead. This flag only trims the SW
  // precache manifest so it doesn't reference the pruned locale bundles;
  // the physical prune + the streaming SW rules live in
  // scripts/mobile/prune-streamed-assets.mjs (S2) and the runtimeCaching
  // block (S3). The browser build (MOBILE unset) is byte-unaffected.
  const MOBILE = env.MOBILE === '1';
  // ADR-083: `MOBILE_INTERNAL=1` marks an INTERNAL mobile build (simulator /
  // TestFlight) — it ships the all-tier config + the runtime staging↔prod
  // switcher (src/lib/target-env.ts). Unset (web + App Store release) → the
  // switcher tree-shakes out and the app uses its single baked tier. Never set
  // it on a release build.
  const MOBILE_INTERNAL = env.MOBILE_INTERNAL === '1';
  // Origin the Capacitor build streams pruned buckets (images / audio /
  // non-default-locale bundles) from. NOT hardcoded — set per build so a dev
  // build points at a local server and a release build points at the current
  // host (GitHub Pages today, a VPS IP next, a domain later), changed by one
  // env var, never a code edit. Web builds ignore it entirely: `assetOrigin`
  // stays `base`, so the browser app streams origin-relative from whatever
  // host serves it. Defaults to the current prod origin when unset so release
  // builds and CI are unaffected.
  // Trailing slash stripped so `${STREAM_ORIGIN}${'/images/…'}` never yields a
  // `//` path (GitHub Pages 404s those with no redirect).
  const STREAM_ORIGIN = (env.STREAM_ORIGIN || 'https://chipi.github.io/orrery').replace(/\/+$/, '');
  // Current git branch, injected as a build-time global. Used ONLY by the dev telemetry
  // rung (sentry.ts) to tag dev events by worktree — each parallel worktree has its own
  // branch, so a dev error can be traced to the session it came from. Empty on a detached
  // HEAD (CI/deploy builds), where it isn't read anyway.
  const devWorktree = (() => {
    try {
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      // `--abbrev-ref HEAD` yields the literal 'HEAD' on a detached checkout
      // (CI/deploy builds); normalise that to empty so the tag is truly absent
      // there (it isn't read anyway — dev is false).
      return branch === 'HEAD' ? '' : branch;
    } catch {
      return '';
    }
  })();
  return {
    // Expose package.json version + build timestamp as globals at build
    // time so the footer can render `v0.3.0 · 2026-05-15` without runtime
    // fetches or extra JSON. Replaced literally in the bundle by Vite's
    // `define`. `__BUILD_DATE__` uses ISO 8601 date (UTC, YYYY-MM-DD) —
    // stable across timezones; rebuilt only when the bundle is rebuilt
    // so it doubles as a "this is the deploy on GH Pages today" signal.
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString().slice(0, 10)),
      // Build timestamp ("MM-DD HH:MM") for the visible build tag on the splash +
      // menu (#51 — so builds are distinguishable at a glance). Shared via the
      // BUILD_TAG env so the native storyboard stamp + the web bundle agree; falls
      // back to the local build time when the env isn't set (plain web build).
      __BUILD_TAG__: JSON.stringify(
        process.env.BUILD_TAG || new Date().toISOString().slice(5, 16).replace('T', ' '),
      ),
      // True only in the Capacitor stream-heavy build. App + SW code branch
      // on this to route pruned buckets at chipi.github.io (S3).
      __MOBILE__: JSON.stringify(MOBILE),
      // Per-build stream origin for the Capacitor bundle (see STREAM_ORIGIN
      // above). Injected here so asset-url.ts carries no hardcoded host.
      __STREAM_ORIGIN__: JSON.stringify(STREAM_ORIGIN),
      // Git branch → dev-telemetry worktree tag (see devWorktree above).
      __DEV_WORKTREE__: JSON.stringify(devWorktree),
      // ADR-083: gates the mobile runtime env switcher. false → switcher +
      // all-tier config tree-shake out (web + App Store release).
      __MOBILE_INTERNAL__: JSON.stringify(MOBILE_INTERNAL),
    },
    // Dev / preview port reads VITE_DEV_PORT via loadEnv (covers .env.local,
    // which is gitignored). Falls back to 5273 if unset. Useful when
    // running multiple worktrees of the repo in parallel — drop a line
    // like `VITE_DEV_PORT=5274` into .env.local for the extra worktree
    // and its dev server won't collide with the default 5273.
    server: {
      port: devPort,
      strictPort: true,
      // HMR multiplexes over the same HTTP port via WebSocket upgrade —
      // no separate hmr.port needed for parallel dev servers. Per
      // https://vite.dev/config/server-options#server-hmr — distinct
      // server.port across instances is sufficient.
      // Allow imports from static/ — used by $data/ alias for build-time
      // JSON imports (planets, small-bodies, scenarios). Without this,
      // Vite's default fs.allow excludes static/ and dev-only 404s flood
      // the console. `scripts/` is here so /sitemap.xml can import the shared
      // route list (site-routes.mjs) in dev — it's prerendered in prod builds
      // where fs.allow doesn't apply, but this keeps the dev server serving it.
      fs: { allow: ['static', 'i18n-src', 'scripts'] },
      // Don't watch the Capacitor native build dirs. `cap sync` copies the
      // web build into android/ + ios/, and if the dev server watches those it
      // fires spurious reloads + dep re-optimization mid-session — which breaks
      // live-reload against the emulator/simulator ("Failed to fetch
      // dynamically imported module" as route chunks get invalidated).
      watch: { ignored: ['**/android/**', '**/ios/**'] },
    },
    preview: { port: devPort, strictPort: true },
    plugins: [
      // Paraglide 2.x i18n compiler — replaces the standalone CLI step
      // for dev/build. URL-segment strategy: en-US (baseLocale) lives at
      // bare paths; other locales are prefixed (e.g. /de/missions). The
      // bundler statically emits per-locale chunks per route, so each
      // page ships only its own locale's strings instead of all 14.
      // Compiles on cold start; subsequent changes to messages/*.json
      // trigger an incremental rebuild.
      paraglideVitePlugin({
        project: './project.inlang',
        outdir: './src/lib/paraglide',
        strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale'],
        // GH Pages compat: when VITE_BASE is set, Paraglide's default
        // URL pattern matcher can't extract the locale (`/orrery/de/`
        // looks like `orrery` is the locale candidate). The helper
        // returns `undefined` when base is empty so the VPS build is
        // unaffected. Full rationale in scripts/gh-pages-compat.mjs.
        urlPatterns: ghPagesUrlPatterns((process.env.VITE_BASE ?? '').replace(/\/$/, '')),
        // experimentalMiddlewareLocaleSplitting was tried first — it tree-
        // shakes message functions from the client bundle and injects them
        // via paraglideMiddleware → globalThis.__paraglide.ssr.<key>. Per
        // the docs it "only works in SSR/SSG environments without client-
        // side routing", and that caveat bites SvelteKit hard: after
        // hydration any SPA-navigated route renders messages from JS, but
        // the per-message slots on globalThis.__paraglide.ssr are only
        // populated for the prerender-time route. The result is
        // "globalThis.__paraglide.ssr.<key> is not a function" console
        // errors across every route the e2e suite touches.
        //
        // Default mode (per-message tree-shaking via outputStructure:
        // message-modules) still gives a substantial bundle win over 1.x's
        // 1.5 MB monolithic dispatcher — each route's chunk only carries
        // the message functions it actually calls. The remaining win
        // (per-locale tree-shake of unused locale branches inside each
        // message body) needs a different mechanism — likely a future
        // Paraglide release that makes middleware-splitting SPA-aware,
        // or a custom dynamic-import shim. Documented as a follow-up.
      }),
      sveltekit(),
      // Emit .br and .gz alongside every text-ish asset at build time
      // (GH #273 / W3). nginx serves them with brotli_static / gzip_static
      // when the client's Accept-Encoding allows. Images and fonts are
      // already format-compressed — skip those to avoid wasted CPU and
      // larger-than-original .br files.
      compression({
        algorithms: ['brotliCompress', 'gzip'],
        include: [/\.(js|mjs|cjs|css|html|json|svg|ico|webmanifest|map)$/],
        threshold: 1024,
        deleteOriginalAssets: false,
      }),
      SvelteKitPWA({
        strategies: 'generateSW',
        // SvelteKit adapter fallback (svelte.config.js fallback:'404.html').
        // Telling @vite-pwa about it (a) includes the neutral 404.html shell in
        // the precache with a revision, and (b) makes navigateFallback resolve
        // to it — so full-page navigations (deep links, the locale switch which
        // does window.location.href) client-render the target route from a
        // neutral shell instead of the HOME page. See the workbox.navigateFallback
        // note below for the bug this fixes.
        kit: {
          adapterFallback: '404.html',
        },
        // `autoUpdate` (vs the prior `prompt`) installs new service-worker
        // bundles silently on next navigation. The previous prompt-mode UI
        // surfaced a "new version · refresh" toast which asked users a
        // question they didn't have context to answer; modern PWA default
        // (Twitter, Slack, Discord) is silent rollover. The trade-off — a
        // user with the app open for hours stays on the old version until
        // they navigate — is fine for a docs/explorer app.
        registerType: 'autoUpdate',
        // Existing static manifest is the source of truth.
        manifest: false,
        injectRegister: false,
        workbox: {
          // Precache a SMALL, bounded shell only. The prior "shell-only"
          // glob still shipped ~4,456 entries: @vite-pwa/sveltekit's
          // buildGlobPatterns force-adds prerendered/**/*.{html,json} + all
          // client imagery UNLESS a pattern is client/- or prerendered/-
          // prefixed — so every page, ~1,800 data JSON and imagery were
          // precached anyway. That install did not complete on mobile WebKit
          // and the new SW never activated, stranding clients on the old
          // version. (Measured on-device: NOT a quota issue — 39 GB free,
          // 0.9% used; the install simply never finished. Exact WebKit
          // mechanism unconfirmed; desktop has the headroom to grind through
          // it, hence the desktop-fine / mobile-stuck split.)
          //
          // Fix: prefix with BOTH client/ and prerendered/ to disable the
          // force-add, and precache only the JS/CSS/font/icon shell + the 14
          // per-locale i18n overlay bundles (scripts/build-i18n-bundles.mjs;
          // collapses ~10,360 tiny files) + one prerendered page as the SPA
          // offline shell. Pages render client-side (navigateFallback below);
          // data JSON, imagery and audio load at runtime via the rules below.
          globPatterns: [
            'client/**/*.{js,css,woff2,svg,ico}',
            // MOBILE prunes the 13 non-default locale bundles off-device
            // (streamed via S3), so the precache manifest must reference
            // only en-US — otherwise SW install 404s on the pruned files.
            MOBILE ? 'client/data/i18n/en-US.json' : 'client/data/i18n/*.json',
            // Keep a `prerendered/`-prefixed pattern here: @vite-pwa's
            // buildGlobPatterns force-adds prerendered/**/*.{html,json} (~60 MB
            // of data JSON → blows the precache budget) UNLESS some pattern
            // starts with `prerendered/`. This one page is that suppressor; the
            // neutral SPA shell for navigateFallback comes from kit.spa +
            // kit.adapterFallback below, NOT from a glob.
            'prerendered/pages/index.html',
          ],
          // Don't precache the porkchop grid JSONs — large + per-route.
          globIgnores: ['**/porkchop/*.json'],
          // App-shell assets are small; keep a generous per-file ceiling for
          // the odd large svg/font but nothing approaches it now.
          maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
          // ─── Lifecycle: never strand a user on an old SW ──────────────
          // 2026-06-15 user report: had to manually unregister the SW
          // after a deploy because the old SW kept controlling the open
          // tab while the new SW sat in `waiting` state forever (until
          // every Orrery tab closed). registerType:'autoUpdate' alone
          // isn't enough — the new SW only ACTIVATES when there are no
          // controlled clients. These three flags close that window:
          //   - skipWaiting:  new SW jumps installing → active on install,
          //                   no waiting state, no manual restart needed.
          //   - clientsClaim: on activation, the new SW immediately
          //                   becomes the controller of every open tab,
          //                   so the next fetch hits the fresh precache
          //                   (and the new content-hashed chunks resolve
          //                   instead of 404-ing against the prior deploy).
          //   - cleanupOutdatedCaches: purge the previous precache
          //                   manifest so stale chunks can't linger.
          // The pattern matches what GitHub / Slack / Discord ship. The
          // trade-off — a broken deploy lands on open tabs instantly
          // instead of being shielded by the old SW — is acceptable
          // because the e2e gate already blocks broken bundles.
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          // PRD-035 Part 3 (PWA offline): inject the offline-serve handler into the
          // generated SW. It serves pre-downloaded streamed assets from the dedicated
          // `orrery-offline` cache, and only for pathnames actually downloaded — so
          // workbox's own routing + non-downloaded users are untouched. See
          // static/offline-sw.js.
          importScripts: ['offline-sw.js'],
          runtimeCaching: [
            {
              // Imagery — runtime-cached on demand, NOT precached (precaching
              // all of it = ~1.7 GB → exceeds the iOS CacheStorage quota and
              // breaks SW install on iOS; see globPatterns note). Bounded by
              // maxEntries + purgeOnQuotaError so it can never wedge install/
              // activation again. StaleWhileRevalidate: a re-sourced image
              // (stable URL, new bytes) serves instantly from cache and
              // refreshes in the background for the next view.
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'orrery-images',
                expiration: {
                  maxEntries: 400,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                  purgeOnQuotaError: true,
                },
              },
            },
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
            {
              // Launches manifests (PRD-020) — the 6h cron-refreshed data
              // file + per-decade historic chunks. NetworkFirst so active
              // users always get the freshest schedule when online, with a
              // 3-second fallback to the cached copy when offline.
              urlPattern: ({ url }) =>
                /\/data\/launches\.json$|\/data\/launches-historic\/.+\.json$/.test(url.pathname),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'orrery-launches-manifests',
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 10 },
              },
            },
            {
              // PRD-016 M13 — audio assets (.mp3 / .vtt / .txt) are content-
              // hashed in their filenames (`{episode-id}.{hash8}.{ext}`) so
              // they never need refresh. CacheFirst caches on first play and
              // serves forever offline; cache invalidation is automatic on
              // script edit because the hash changes the URL.
              //
              // Not precached on SW install — 97 MB of audio would dominate
              // the install download. Marko's success-criterion #6 (>90% SW
              // hit-rate for replays) is met by post-first-play persistence.
              urlPattern: ({ url }) => /\/audio\/.+\.(mp3|vtt|txt)$/.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'orrery-audio',
                expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // Audio-provenance manifest — small JSON, refreshed on every
              // audio:generate. StaleWhileRevalidate so the inventory list
              // updates without blocking the player UI.
              urlPattern: ({ url }) => /\/data\/audio\/audio-provenance\.json$/.test(url.pathname),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'orrery-audio-provenance',
                expiration: { maxEntries: 2, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Catch-all for data JSON no longer precached (science,
              // provenance, etc.) — cache-on-first-use so offline + repeat
              // visits resolve. More specific /data rules above win by order.
              urlPattern: ({ url }) => /\/data\/.*\.json$/.test(url.pathname),
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'orrery-data-json',
                expiration: { maxEntries: 2500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
          // SPA fallback for full-page navigations (deep links, and the
          // locale switch which does window.location.href — LocalePicker).
          // MUST be the NEUTRAL 404.html shell that client-renders the
          // requested route, NOT index.html (the home PAGE): the SW serves the
          // precached fallback for any full-page nav, and pointing it at home
          // meant every locale switch / hard-reload rendered HOME (canvas-less
          // home content at e.g. /de/explore) instead of the target route.
          // 404.html is SvelteKit's adapter-static fallback (svelte.config.js
          // fallback:'404.html') — an empty client-render shell. Base-aware so
          // it matches the precache key on GH Pages (/orrery/) and root builds.
          navigateFallback: `${(process.env.VITE_BASE ?? '').replace(/\/$/, '')}/404.html`,
        },
        devOptions: {
          // Don't run the SW in `vite dev` — only in `vite preview` /
          // production. Prevents stale-cache headaches during dev.
          enabled: false,
        },
      }),
    ],
    // ─── Bundle chunking ────────────────────────────────────────────
    // `three.module.js` — ~513 kB; single-import shared library, Vite
    // already auto-chunks it. Can't meaningfully tree-shake further at
    // the SvelteKit layer. Raise the warning ceiling so the build log
    // doesn't carry a known-known every release.
    //
    // Note: a previous attempt at `rollupOptions.output.manualChunks =
    // { three: ['three'] }` failed because Three.js is resolved as an
    // external by the sveltekit plugin's auto-bundler. Vite already
    // splits it into its own chunk without help.
    //
    // i18n bundle: as of #328, Paraglide 2.x's per-message output structure
    // lets the bundler tree-shake unused message functions per route — the
    // 1.5 MB monolithic messages.js from 1.x is gone. Per-locale tree-
    // shake of locale branches inside each message body is a future
    // optimisation; see the paraglideVitePlugin block above.
    build: {
      chunkSizeWarningLimit: 700,
    },
    test: {
      include: ['src/**/*.{test,spec}.{js,ts}', 'scripts/**/*.test.ts', 'server/**/*.test.ts'],
      // S1 (Test-coverage gap-closure plan) wired the v8 coverage reporter;
      // S5/G1-G9 raised the per-file numbers to 94.54 % / 79.71 % / 89.24 %
      // / 96.34 % (stmt / branch / fn / line). Gate locked at observed
      // minus ~2 pp on each axis — catches meaningful regressions without
      // becoming a flake filter on incidental edge-branch drift.
      //
      // Excludes auto-generated paraglide bundle, one-shot migration
      // scripts, the screenshot harness, and Svelte SFCs (route pages
      // exercise their lib code; tracking SFCs separately adds noise
      // without signal).
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        // Fail-closed thresholds — `npm run test:coverage` exits non-zero when
        // any axis drops below the floor. These are set ~1.5–2 pp under the
        // measured actuals (2026-07-20: stmts 92.36 / branches 80.52 /
        // funcs 90.27 / lines 94.36) so routine feature additions don't trip the
        // gate but a meaningful regression does.
        //
        // FROZEN POLICY (architectural-review R8): these numbers are a RATCHET —
        // they may go UP, never DOWN. The coverage-excluded surface here is large
        // (all WebGL builders + the two route god-files), so new feature code
        // exercised only by Playwright silently dilutes the ratio. The historical
        // fix pattern was to shave the threshold down to just-under-actual after
        // each drop; that slowly erodes the guarantee. Instead, when a change
        // drops coverage below the floor, RECOVER IT BY ADDING TESTS — do not
        // lower the threshold. (Deliberate, reviewed test removals are the only
        // exception, and get their own commit + rationale.)
        thresholds: {
          statements: 91,
          branches: 78,
          functions: 88,
          lines: 93,
        },
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
          // Hotspot + launches I/O modules: exercised via integration runs
          // (`npm run images:hotspots`, `npm run fetch:launches`), not
          // unit-tested per the same policy as `scripts/fetch-assets.ts`.
          // Their pure-function parsers + entry mappers are covered
          // separately by *.test.ts files alongside.
          'scripts/_*.ts',
          'scripts/hotspots/',
          'scripts/gcat/',
          'src/lib/launches/sources/',
          'scripts/fetch-launches.ts',
          'scripts/audit-report-launches.ts',
          // AR runtime (RFC-021 / #150 — WebXR/ARKit sessions, XR render loops,
          // device audio/haptic paths) can't run in jsdom/CI (no AR device, no
          // WebGL-XR, no native bridge). Verified on-device; the pure helpers keep
          // their *.test.ts (which still run) — same policy as scripts/hotspots.
          'src/lib/ar.ts',
          'src/lib/ar/',
          // Three.js solar-system scene builder extracted from /explore's
          // +page.svelte (already excluded above). Its build/update/dispose run
          // a WebGL render loop + GPU resource management that can't be
          // meaningfully unit-tested in jsdom; the pure structure is smoke-tested
          // in ar-scene.test.ts. Same policy as the AR runtime + route scenes.
          'src/lib/explore-scene.ts',
          // /explore v2 (PRD-030 / RFC-032) WebGL builders — THREE.Points shader
          // field + the neighborhood boundary scene. Same jsdom-can't-run-WebGL
          // policy as explore-scene.ts; their pure LOD/packing/context math keeps
          // its own *.test.ts (star-selection, context-graph, budget, bv-to-rgb).
          'src/lib/universe/point-field.ts',
          'src/lib/universe/neighborhood-scene.ts',
          // Slice 2 exoplanet BodyScene builder — same WebGL policy; its pure
          // Keplerian math is unit-tested in kepler.test.ts.
          'src/lib/universe/body-scene.ts',
          // Slice 4 deep-sky billboard/glint layer — same WebGL policy; its pure
          // colour/glint-sizing + LOD-bloom math is unit-tested in
          // deep-sky-visual.test.ts + deep-sky-lod.test.ts.
          'src/lib/universe/deep-sky-scene.ts',
          // Slice 5 Milky Way schematic scene — same WebGL policy; its pure spiral
          // + placement math is unit-tested in milky-way-visual.test.ts.
          'src/lib/universe/milky-way-scene.ts',
          // Slice 6 black-hole geodesic lensing scene — same WebGL policy; its pure
          // GR + framing math is unit-tested in black-hole-visual.test.ts.
          'src/lib/universe/black-hole-scene.ts',
          // Slice 8 Local Group schematic scene — same WebGL policy; its pure
          // galaxy-placement + label math lives in local-group.json (data) and
          // the LocalGroupPanel component, neither of which runs WebGL.
          'src/lib/universe/local-group-scene.ts',
          // /fly launch/ascent WebGL builders (RFC-034 · epic #412) — the Scene 0
          // render (ascent-scene), its ACES+film+vignette composer
          // (ascent-renderer), the per-vehicle procedural rocket models
          // (launcher-models), and the launch-site ground patch (launch-ground)
          // all instantiate Three.js + WebGL that jsdom can't run. Same policy as
          // explore-scene.ts. Their pure math stays counted: the headless
          // trajectory (ascent-physics), HUD logic (ascent-hud), clock
          // (ascent-clock), cameras (ascent-cameras), profile registry, and the
          // force-layer map each keep their own *.test.ts. The phase-scene
          // contract (flight-phase-scene.ts) is pure types — no runtime to cover.
          'src/lib/three/ascent-scene.ts',
          'src/lib/three/bold-arrow.ts',
          'src/lib/three/glow-line.ts',
          'src/lib/three/separation-burst.ts',
          'src/lib/three/ascent-renderer.ts',
          'src/lib/three/launcher-models.ts',
          // The hero-PBR launcher detail kit (agency livery, engine clusters,
          // ring frames, swept fins, canvas-drawn flags/wordmarks) is a pure
          // Three.js geometry + CanvasTexture builder jsdom can't run — same
          // policy as launcher-models.ts. The engine inventory it renders is
          // data-covered by launcher-engines.ts (launcher-engines.test.ts).
          'src/lib/three/launcher-detail.ts',
          'src/lib/three/launch-ground.ts',
          // /fly descent/landing WebGL builders (RFC-034 §12) — same policy: the
          // EDL Scene render (descent-scene) + the procedural EDL-stack models
          // (descent-models) instantiate Three.js jsdom can't run. Their pure
          // counterparts (descent-physics, descent-hud, descent-profile-registry,
          // descent-force-layers, the widened ascent-clock) each keep *.test.ts.
          'src/lib/three/descent-scene.ts',
          'src/lib/three/descent-models.ts',
          // Tier-1 Earth-orbit re-entry (RFC-034 §13): the LEO orbit-coast render
          // (fly-leo-coast-scene) + the procedural capsule models (capsule-models)
          // instantiate Three.js jsdom can't run; the pure earth-orbit-registry
          // keeps its *.test.ts.
          'src/lib/three/fly-leo-coast-scene.ts',
          'src/lib/three/capsule-models.ts',
          // Cruise-phase procedural craft — the per-mission interplanetary
          // spacecraft (interplanetary-spacecraft-models) + their lander-cruise
          // stacks (lander-cruise-models) are `buildX(): THREE.Group` WebGL
          // builders jsdom can't run, same policy as launcher/capsule-models.
          // They reach the counted module graph only transitively (via the
          // excluded ascent-scene → launcher-models import chain that
          // ascent-payload.test.ts loads); their pure ID exports carry no logic.
          'src/lib/three/interplanetary-spacecraft-models.ts',
          'src/lib/three/lander-cruise-models.ts',
          // /fly heliocentric mission-overlay builders (RFC-036 WS-B/B2) — the
          // trajectory-tube geometry/shader, spacecraft-glyph CanvasTexture, engine
          // plume, and label sprites extracted from the fly/+page.svelte onMount.
          // Same policy as every sibling WebGL/CanvasTexture builder: excluded from
          // the ratio (jsdom can construct but not render), structure smoke-tested
          // in fly-helio-overlays.test.ts.
          'src/lib/three/fly-helio-overlays.ts',
          // /fly cislunar mission-overlay builders (RFC-036 WS-B/B3) — the star
          // field, per-phase trajectory-line shader, spacecraft-glyph CanvasTexture,
          // and ∆v annotation sprites extracted from the fly/+page.svelte onMount.
          // Same policy; structure smoke-tested in fly-cislunar-overlays.test.ts.
          'src/lib/three/fly-cislunar-overlays.ts',
          // /fly scene-host teardown — imperative subsystems lifted VERBATIM out of
          // the fly/+page.svelte onMount (RFC-036 WS-B). Each drives Three.js scene
          // objects / cameras / EffectComposer that jsdom can construct but not
          // render, so they follow the same WebGL exclusion policy as the builders
          // above. The PURE logic they call (fly-frame-selectors/projections/coast/
          // burn) stays coverage-counted and unit-tested; these orchestration shells
          // are gated by the /fly Playwright e2e suite instead.
          'src/lib/three/fly-helio-reactive.ts',
          'src/lib/three/fly-cislunar-reactive.ts',
          'src/lib/three/fly-helio-mission.ts',
          'src/lib/three/fly-camera-controller.ts',
          'src/lib/three/fly-frame-runner.ts',
          'src/lib/three/fly-input-handlers.ts',
          'src/lib/three/fly-scene-host.ts',
          // /explore scene-host teardown (RFC-036 WS-C) — imperative Three.js scene
          // assembly lifted from the explore/+page.svelte onMount; same WebGL policy.
          'src/lib/three/explore-solar-scene.ts',
          'src/lib/three/explore-scene-host.ts',
          // Shared 3D asset builders used by the model/scene files above — hero
          // PBR materials + IBL (hero-materials) and the low-level geometry
          // helper (model-geom) both instantiate Three.js materials/geometry
          // jsdom can't run. Same policy as the scene/model builders.
          'src/lib/three/hero-materials.ts',
          'src/lib/three/model-geom.ts',
          // Surface/flyby hotspot 3D models — every hotspot-models/*.ts is a
          // procedural `buildXHotspot(): THREE.Group` builder (rovers, landers,
          // spacecraft) that instantiates Three.js geometry jsdom can't run;
          // same policy as the other model builders above. Verified visually on
          // /dev/models + the surface/flyby routes.
          'src/lib/hotspot-models/**',
          'src/lib/three/dispose-object3d.ts',
          '*.config.{js,ts}',
          '.svelte-kit/',
        ],
      },
    },
  };
});

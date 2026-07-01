# PWA stuck-on-old-version — root cause + fix (2026-07-01)

**Status:** implemented, harness-green locally, not yet deployed. No push without approval.

Supersedes the diagnosis half of `pwa-upgrade-path-handover.md`.

## Symptom

Installed PWA clients on mobile (iPhone Safari, and Firefox-iOS which is
also WebKit) were stranded on **v0.6.3** and never rolled forward to v0.7.
Closing/reopening the tab didn't help. A **private tab loaded v0.7 fine**.

## Root cause (evidence-backed, not assumed)

A private tab runs **no service worker** — it just fetches from the network,
so "private works" proved only that the site serves v0.7, *not* that the SW
installs. Every real attempt to install the v0.7 SW happened behind the old
0.6.3 SW, and that install **never completed**.

On-device diagnosis (read-only console snippet on the stuck tab) showed:

- controller = `0.6.3 sw.js [activated]` (old SW still in charge)
- a v0.7 SW stuck in state **`installing`** (never `installed`/`activated`)
- storage usage **357 MB / 39 GB (0.9%)** → **not** a quota problem
- a probe of all **4,456** precache URLs from the deployed sw.js: every one
  returned 200, no redirects/404s/timeouts → **not** a bad resource

By elimination + the `installing`-stuck state: the SW **precache install of
4,456 entries never finishes on mobile WebKit**. Until it does, `skipWaiting`/
`clientsClaim` never fire, so the old 0.6.3 SW keeps controlling the page. It
is a **file-count** problem, not bytes and not a specific file.

Where the 4,456 came from (deployed inventory): ~2,019 per-locale prerendered
pages + ~1,816 tiny i18n JSON files + 282 images + shell. The site ships
**10,360** individual i18n overlay files (`static/data/i18n/{locale}/**`,
740 topics × 14 locales, ~1.3 KB each) — a pathological count. Images (6,029
files / 1.7 GB) and audio were already runtime-cached and were never the issue.

## Fix

Shrink the SW install to a small, bounded shell that always completes, and
serve everything else at runtime — without losing offline coverage.

1. **Bundle the i18n overlays** (`scripts/build-i18n-bundles.mjs`, wired into
   `npm run build` before `vite build`). Reads each locale's ~740 topic files
   and emits one `static/data/i18n/{locale}.json` = `{ "<relpath>": content }`.
   **10,360 files → 14 bundles.** Source per-file tree is left untouched
   (translator scripts, `$data` static imports, and the filesystem drift tests
   keep working). Bundles are git-ignored (generated).

2. **Loader reads bundles** (`src/lib/data.ts` `get()`): intercepts
   `i18n/{locale}/{key}`, fetches the per-locale bundle once (cached promise),
   indexes by key, throws on a genuine miss so the en-US fallback still fires.
   Falls back to the legacy per-file fetch if a bundle is absent (e.g. `vite
   dev` before a build) — so dev without a build still works.

3. **Shell-only precache** (`vite.config.ts` workbox):
   `globPatterns: ['client/**/*.{js,css,woff2,svg,ico}', 'client/data/i18n/*.json',
   'prerendered/pages/index.html']`. Prefixing with both `client/` and
   `prerendered/` disables `@vite-pwa/sveltekit`'s `buildGlobPatterns`
   force-add (which otherwise pulls all pages + JSON + imagery back in).
   `navigateFallback` → the precached home page (base-aware `/` or `/orrery/`);
   pages render client-side from the shell. Data JSON, imagery, audio load at
   runtime via the existing + added `runtimeCaching` rules.

**Result: 355 precache entries (was 4,456)** — 340 shell + 14 all-language
i18n bundles + 1 SPA home shell. ~19 MB, comprehensive offline in every
language. Individual-language pages/data/images stream on demand.

## Verification (local harness — `/tmp/pwa-harness/harness.mjs`)

Serves an old build, installs its SW, "deploys" the new build at the same
origin, reload-loops, reports UPGRADED/STUCK. Also a FRESH mode (from-empty
install must reach `activated`). Run in Chromium **and** WebKit (Safari's
engine):

| Check | Chromium | WebKit |
|---|---|---|
| 0.6.3 → 0.7 upgrade | UPGRADED (1 reload) | UPGRADED |
| Fresh 0.7 install | activated, v0.7 | activated, v0.7 |

**Caveat:** desktop (even desktop WebKit) has far more headroom than an
iPhone and does **not** reproduce the install hang — it powered through 4,456
too. So the harness proves the design is sound and non-regressive; the true
mobile confirmation is **post-deploy on the phone** (open site, run the `Diag`
bookmark, confirm the new SW reaches `activated`). The count drop (4,456 →
355, and the 10,360 → 14 bundle collapse) is the mobile-fix evidence.

## Follow-ups (not required to unstick)

- **Prune** the now-unused individual `build/data/i18n/{locale}/**` files from
  the deploy (dead weight, ~24 MB; nothing fetches them at runtime — the
  `$data` static imports are compile-time). Optional deploy-size win.
- **Tier-3 prefetch:** on language change, background-fetch that locale's
  bundle so first offline use in a new language is instant. Small enhancement.
- Consider promoting the harness into `scripts/` as a CI deploy gate.

## Files changed

- `scripts/build-i18n-bundles.mjs` (new)
- `package.json` (build chain + `build-i18n-bundles` script)
- `src/lib/data.ts` (bundle loader + `__resetCache`)
- `vite.config.ts` (globPatterns + navigateFallback)
- `.gitignore` (`static/data/i18n/*.json`)

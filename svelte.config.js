import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
// GH Pages compat — see scripts/gh-pages-compat.mjs header. Used here
// for the manual locale × route expansion that replaces Paraglide's
// flaky-at-build-time `generateStaticLocalizedUrls`. Same shape with
// or without VITE_BASE; SvelteKit prepends the base internally at
// render time.
import { expandLocalizedRoots } from './scripts/gh-pages-compat.mjs';
// The un-localized route list — shared with src/routes/sitemap.xml so the
// sitemap can't drift from what actually prerenders. See site-routes.mjs.
import { collectCanonicalRoutes } from './scripts/site-routes.mjs';

const base = (process.env.VITE_BASE ?? '').replace(/\/$/, '');

// Seed every prerender pass with one entry per locale × canonical route.
// For en-US (baseLocale) that's `/`, `/missions`, etc.; other locales get
// `/{locale}/`, `/{locale}/missions`, etc. per the URL strategy in
// vite.config.ts. SvelteKit's prerender crawler then follows nav + content
// links from each seed — and Nav.svelte uses `localizeHref(...)` which
// stays within the seed's locale — so the crawl discovers per-locale
// sub-pages. The canonical route list (top-level + explicitly-enumerated
// sub-routes the crawler doesn't reliably follow) lives in site-routes.mjs,
// shared with the sitemap so the two can't drift.
const localizedRoots = expandLocalizedRoots(collectCanonicalRoutes());

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '404.html',
      precompress: false,
      strict: true,
    }),
    paths: {
      base,
      // Default `relative: true` emits `./_app/...` in every prerendered
      // page. At a URL like `/de/`, the browser resolves `./_app/env.js`
      // against the URL (not the file location) → `/de/_app/env.js`,
      // which doesn't exist (the only `_app/` dir is at the build root).
      // The bug surfaces only on the localized landing routes (trailing
      // slash); deeper routes like `/de/missions` happen to land on
      // `/de.html` (one level up) and resolve correctly. Setting
      // `relative: false` emits absolute paths rooted at `base` (`/`
      // locally and Docker, `/orrery` on GH Pages preview), which works
      // for every URL depth. Caught by the i18n-all-routes e2e on the
      // localized `/${locale}/` landings (#326).
      relative: false,
    },
    alias: {
      $types: './src/types',
      '$types/*': './src/types/*',
      $data: './static/data',
      '$data/*': './static/data/*',
      // i18n overlay SOURCE lives outside the served tree (ADR-079 D2 / #377).
      // Build-time overlay imports (e.g. /fly's default scenario overlay) use
      // this alias; the collapsed runtime bundles still ship from static/data.
      $i18nSrc: './i18n-src',
      '$i18nSrc/*': './i18n-src/*',
    },
    prerender: {
      // /sitemap.xml is unreachable by link-crawl (nothing on-page links to
      // it), so it needs an explicit entry or the prerenderer errors on it as
      // an "unseen prerderable route". Single entry — it's locale-agnostic.
      entries: [...localizedRoots, '/sitemap.xml'],
      // /science/[tab] dynamic + /science/reading-list static overlap.
      // The static page wins via SvelteKit's specificity rules but the
      // crawler still flags it. Ignore — same behaviour as before #328
      // when this codepath wasn't exercised by an explicit `entries`.
      handleEntryGeneratorMismatch: 'ignore',
    },
  },
};

export default config;

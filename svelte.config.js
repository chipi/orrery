import { readFileSync, readdirSync, existsSync } from 'node:fs';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
// GH Pages compat — see scripts/gh-pages-compat.mjs header. Used here
// for the manual locale × route expansion that replaces Paraglide's
// flaky-at-build-time `generateStaticLocalizedUrls`. Same shape with
// or without VITE_BASE; SvelteKit prepends the base internally at
// render time.
import { expandLocalizedRoots } from './scripts/gh-pages-compat.mjs';

const base = (process.env.VITE_BASE ?? '').replace(/\/$/, '');

// Seed every prerender pass with one entry per locale × top-level
// route. For en-US (baseLocale) that's `/`, `/missions`, etc.; other
// locales get `/{locale}/`, `/{locale}/missions`, etc. per the URL
// strategy in vite.config.ts. SvelteKit's prerender crawler then
// follows nav + content links from each seed — and Nav.svelte uses
// `localizeHref(...)` which stays within the seed's locale — so the
// crawl discovers per-locale sub-pages.
//
// Sub-routes are enumerated explicitly because the crawler doesn't
// always follow conditionally-rendered content links (e.g. the
// LaunchesBanner's "VIEW ALL LAUNCHES" link inside /missions, which
// fired for en-US but missed the /de/missions instance — the de
// LaunchesBanner crawl didn't generate /de/missions/launches.html).
// Listing them keeps the per-locale prerender complete without
// having to debug per-locale crawl race conditions.
const SEED_ROUTES = [
  '/',
  '/explore',
  '/missions',
  '/missions/launches',
  '/fleet',
  '/plan',
  '/fly',
  '/earth',
  '/moon',
  '/mars',
  '/iss',
  '/tiangong',
  '/science',
  '/credits',
  '/library',
];

// Every /science tab + section route, read from the section indexes. The
// section pages link to each other with base-relative hrefs that the
// per-locale crawl doesn't follow into /<locale>/, so enumerate them here
// — expandLocalizedRoots then prerenders each in all 14 locales, and the
// load() resolves the right overlay via getLocale().
function scienceRoutes() {
  const root = 'static/data/science';
  const routes = [];
  for (const tab of readdirSync(root, { withFileTypes: true })) {
    if (!tab.isDirectory()) continue;
    const idx = `${root}/${tab.name}/_index.json`;
    if (!existsSync(idx)) continue;
    routes.push(`/science/${tab.name}`);
    const { ids } = JSON.parse(readFileSync(idx, 'utf8'));
    for (const id of ids ?? []) routes.push(`/science/${tab.name}/${id}`);
  }
  return routes;
}

const localizedRoots = expandLocalizedRoots([...SEED_ROUTES, ...scienceRoutes()]);

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
    },
    prerender: {
      entries: localizedRoots,
      // /science/[tab] dynamic + /science/reading-list static overlap.
      // The static page wins via SvelteKit's specificity rules but the
      // crawler still flags it. Ignore — same behaviour as before #328
      // when this codepath wasn't exercised by an explicit `entries`.
      handleEntryGeneratorMismatch: 'ignore',
    },
  },
};

export default config;

import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { generateStaticLocalizedUrls } from './src/lib/paraglide/runtime.js';

const base = (process.env.VITE_BASE ?? '').replace(/\/$/, '');

// Seed every prerender pass with one entry per locale's root URL.
// For en-US (baseLocale) that's `/`; other locales get `/{locale}/`
// per the URL strategy in vite.config.ts. SvelteKit's prerender
// crawler then follows nav links from each seed — and Nav.svelte
// uses `localizeHref(...)` which stays within the seed's locale —
// so the crawl discovers all per-locale sub-pages without us having
// to enumerate them by hand.
const localizedRoots = generateStaticLocalizedUrls(['/']).map((url) => url.pathname);

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

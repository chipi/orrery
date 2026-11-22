import { LOCALES } from './lib/locales.mjs';
/**
 * The prerender's per-locale seed list.
 *
 * Every prerender pass is seeded with one entry per locale × canonical route instead of
 * Paraglide's `generateStaticLocalizedUrls`: that helper reads the live compiled `urlPatterns`
 * runtime, and `svelte.config.js` is re-evaluated several times during the SvelteKit build
 * (some passes BEFORE the vite plugin has finished compiling). Those early-pass calls return
 * only en-US entries, and SvelteKit keeps the last-call result, losing every per-locale page.
 * Expanding the list here keeps the entries stable across all passes.
 *
 * (This file was `gh-pages-compat.mjs`; the base-path mirror build it also served is gone,
 * 0.9.11 L17.)
 */

/**
 * Expand a list of un-localized canonical routes into the per-locale
 * URLs SvelteKit's prerender consumes.
 *
 * @param {string[]} routes - e.g. `['/', '/missions']`.
 * @returns {string[]} - e.g. `['/', '/de/', ..., '/missions', '/de/missions', ...]`.
 */
export function expandLocalizedRoots(routes) {
  return routes.flatMap((route) =>
    LOCALES.map((locale) => {
      if (locale === 'en-US') return route;
      if (route === '/') return `/${locale}/`;
      return `/${locale}${route}`;
    }),
  );
}

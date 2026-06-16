/**
 * GH Pages compatibility helpers.
 *
 * Everything in this file exists *only* to make the prerender work
 * when the app is deployed to a subdirectory mount (GitHub Pages
 * at `chipi.github.io/orrery/`, activated via `VITE_BASE=/orrery/`).
 * The VPS deploy mounts at root and does NOT need any of this — the
 * helper functions exported here return `undefined` / inert values
 * when `base` is empty, so the canonical no-base build is unaffected.
 *
 * ── Why this isn't just default config ──
 *
 * Paraglide 2.x's URL strategy (`/<locale>/<route>`) does not know
 * about an app base path. With `VITE_BASE=/orrery/`, every URL the
 * prerender visits looks like `/orrery/de/missions`; Paraglide's
 * default pattern treats `orrery` as the locale candidate, falls
 * back to baseLocale, and the prerender 404s on every non-en-US
 * route. We work around this by:
 *
 *   1. Injecting `urlPatterns` into the paraglide vite plugin so the
 *      pattern matcher knows the locale lives AFTER the base prefix.
 *   2. Generating prerender entries manually instead of via
 *      Paraglide's `generateStaticLocalizedUrls` helper — that
 *      helper reads from the live compiled `urlPatterns` runtime,
 *      and `svelte.config.js` gets re-evaluated multiple times
 *      during the SvelteKit build (some passes BEFORE the vite
 *      plugin has finished compiling). Those early-pass calls
 *      return only en-US entries, and SvelteKit picks up the
 *      last-call result, losing every per-locale page. Inlining the
 *      expansion here keeps entries stable across all passes.
 *
 * ── When this file goes away ──
 *
 * When GH Pages is retired in favour of the VPS as sole deploy
 * target, delete this file and the call sites in `vite.config.ts`
 * + `svelte.config.js`. Single `git grep gh-pages-compat` finds
 * everything. Track via #342 follow-up.
 */

/** Mirror project.inlang/settings.json. */
export const LOCALES = [
  'en-US',
  'es',
  'fr',
  'de',
  'pt-BR',
  'it',
  'nl',
  'sr-Cyrl',
  'zh-CN',
  'ja',
  'ko',
  'hi',
  'ar',
  'ru',
];

/**
 * Build the Paraglide `urlPatterns` config that's needed when running
 * under VITE_BASE. Returns `undefined` when base is empty so the
 * canonical no-base build keeps using Paraglide's defaults.
 *
 * Pattern shape: `${base}/<locale>/:path(.*)?` for non-en-US locales,
 * `${base}/:path(.*)?` for en-US. The `:path(.*)?` shape (named
 * capture + regex group + optional) matches all three of `/de`,
 * `/de/`, and `/de/<sub>` — the simpler `:path*` form misses the
 * trailing-slash case.
 *
 * Order matters: en-US's pattern is the most permissive, so it must
 * come LAST in the `localized` array — Paraglide iterates top-to-
 * bottom and returns the first match.
 *
 * @param {string} base - Stripped VITE_BASE (no trailing slash). Pass
 *   an empty string to disable; the function then returns `undefined`.
 */
export function ghPagesUrlPatterns(base) {
  if (!base) return undefined;
  const nonBase = LOCALES.filter((l) => l !== 'en-US');
  return [
    {
      pattern: `${base}/:path(.*)?`,
      localized: /** @type {[string, string][]} */ ([
        ...nonBase.map((locale) => [locale, `${base}/${locale}/:path(.*)?`]),
        ['en-US', `${base}/:path(.*)?`],
      ]),
    },
  ];
}

/**
 * Expand a list of un-localized canonical routes into the per-locale
 * URLs SvelteKit's prerender consumes. Stable across all
 * svelte.config.js re-evaluations (the paraglide-runtime equivalent
 * is not — see file header).
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

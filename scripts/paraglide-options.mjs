/**
 * Paraglide compiler options — ONE source, imported by both callers.
 *
 * Two things compile the messages: `vite.config.ts`'s `paraglideVitePlugin`
 * (dev server boot and `vite build`) and `scripts/i18n-compile.mjs` (the
 * `i18n:compile` npm script, which `typecheck`, `test` and `build` run before
 * anything else). The Vite plugin recompiles on dev boot, so in practice the
 * plugin's options win wherever Vite runs at all — but `svelte-check` consumes
 * whatever the CLI step left behind, and keeping two hand-edited copies of
 * these values is precisely the drift this indirection removes.
 *
 * `urlPatterns` is deliberately NOT here: it depends on VITE_BASE (GH Pages
 * compat) and only matters for the bundled build, so it stays in vite.config.ts.
 */

/** @type {import('@inlang/paraglide-js').CompilerOptions} */
export const paraglideOptions = {
  project: './project.inlang',
  outdir: './src/lib/paraglide',
  strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale'],
  // ADR-057 names the locale cookie `orrery_locale`, and /credits + /privacy
  // disclose it under that name. Paraglide's default is `PARAGLIDE_LOCALE` and
  // no override was ever set — so the documented cookie did not exist and the
  // real one was undisclosed (found in the 2026-09-10 pre-push review).
  // `src/lib/locale-cookie-migration.ts` carries pre-rename picks across.
  cookieName: 'orrery_locale',
  // ADR-057 specifies 365 days; Paraglide's default is 400 (34560000).
  cookieMaxAge: 31536000,
};

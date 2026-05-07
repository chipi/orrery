/**
 * KaTeX server-rendered math helper (ADR-034).
 *
 * Use during SvelteKit prerender (or in `+page.server.ts` `load`) so the
 * client receives static HTML. The `katex` module is a server-only import
 * — KaTeX never ships to the browser. KaTeX's CSS is imported once at the
 * `/science` layout level so the rendered HTML displays correctly.
 */
import katex from 'katex';

/**
 * Render a LaTeX expression to HTML.
 *
 * `displayMode: true` produces a centred block formula (used for the
 * primary equation card on each section). `false` would produce inline
 * math; we don't currently use that path but keep the API symmetric.
 *
 * Throws on invalid LaTeX so the build fails fast at preflight rather
 * than silently shipping a broken section.
 */
export function renderKatex(latex: string, displayMode = true): string {
  return katex.renderToString(latex, {
    displayMode,
    throwOnError: true,
    output: 'html',
    strict: 'warn',
  });
}

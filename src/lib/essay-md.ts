import { base } from '$app/paths';

// Minimal inline-markdown renderer for essay prose. No markdown dependency
// (Orrery ships none) and the same spirit as /science's parseInline. Supports
// exactly what The Long View essays use: [text](url) links, **strong**, *em*.
//
// The content is author-controlled (i18n-src overlays), never user input, so
// the `{@html}` that consumes this output is safe — same treatment as the
// m.*() @html output already used across the app.

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Render one paragraph of essay markdown to a safe HTML string. Internal
 * links (`/route`) are base-prefixed so they resolve under the GitHub Pages
 * base path and in the native shell; external links (`https://…`) open in a
 * new tab and are marked `rel="external"`.
 */
export function essayInlineHtml(md: string): string {
  let s = esc(md);
  // Links first, so emphasis markers inside link text still resolve after.
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text: string, url: string) => {
    const external = /^https?:\/\//.test(url);
    const href = external ? url : `${base}${url}`;
    const attrs = external ? ' target="_blank" rel="noopener noreferrer external"' : '';
    return `<a href="${href}"${attrs}>${text}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s;
}

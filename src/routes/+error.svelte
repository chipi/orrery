<!--
  Root 404 / error recovery page (#336).

  Replaces SvelteKit's bare framework 404 with a friendly recovery
  surface — primary CTAs back to `/` and, when the bad path looks
  like a `?` typo'd as `&` (e.g. `/fly&debug=1`), a one-click jump
  to the corrected query URL.

  Copy is English-only for now; the page is hit by malformed URLs
  during dev iteration, not by user navigation. Add paraglide keys
  if it ever shows on production traffic.
-->
<script lang="ts">
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { browser } from '$app/environment';

  // Detect the `/route&param=value` typo pattern (literal `&` where
  // `?` was meant). If found, build the corrected URL — preserves the
  // route and turns the rest into a real query string.
  function suggestedCorrection(pathname: string, search: string): string | null {
    const ampIdx = pathname.indexOf('&');
    if (ampIdx <= 0) return null;
    const route = pathname.slice(0, ampIdx);
    const params = pathname.slice(ampIdx + 1);
    const sep = search ? '&' : '?';
    return `${base}${route}${sep === '?' ? '?' : search || '?'}${params}${search ? '' : ''}`.replace(
      /\?{2,}/,
      '?',
    );
  }

  // SvelteKit blocks `$page.url.search` access during prerender: the
  // 404.html fallback is prerendered once at build time without a
  // search context, and throws if any reactive expression touches
  // `.search`. Gate behind `browser` so the prerender pass takes the
  // null branch and the runtime hydration computes the suggestion
  // once the real error URL is known.
  let suggestion = $derived(
    browser ? suggestedCorrection($page.url.pathname, $page.url.search) : null,
  );
  let pathSuffix = $derived(browser ? $page.url.pathname + $page.url.search : $page.url.pathname);
</script>

<svelte:head>
  <title>Page not found · Orrery</title>
</svelte:head>

<main class="error-shell">
  <div class="error-card">
    <p class="error-status">{$page.status}</p>
    <h1 class="error-title">Page not found</h1>
    <p class="error-path">
      <code>{pathSuffix}</code>
    </p>

    {#if suggestion}
      <div class="error-suggestion">
        <p class="error-hint">
          Looks like a typo — query strings start with <code>?</code>, not <code>&amp;</code>.
        </p>
        <a class="error-cta error-cta-primary" href={suggestion}>
          Go to <code>{suggestion.replace(base, '')}</code>
        </a>
      </div>
    {/if}

    <div class="error-actions">
      <a class="error-cta" href="{base}/">Back to home</a>
      <a class="error-cta error-cta-ghost" href="{base}/missions">Missions</a>
      <a class="error-cta error-cta-ghost" href="{base}/explore">Explore</a>
    </div>

    <p class="error-tip">
      Append <code>?debug=1</code> to any route URL to open the debug panel (e.g.
      <code>{base}/fly?debug=1</code>).
    </p>
  </div>
</main>

<style>
  .error-shell {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 32px 20px;
    background: radial-gradient(ellipse at top, rgba(94, 234, 212, 0.06), transparent 60%), #04040c;
    color: rgba(220, 230, 245, 0.95);
  }
  .error-card {
    max-width: 560px;
    width: 100%;
    background: rgba(8, 10, 22, 0.7);
    border: 1px solid rgba(94, 234, 212, 0.3);
    border-radius: 8px;
    padding: 28px;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .error-status {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 14px;
    letter-spacing: 3px;
    color: #4ecdc4;
    margin: 0 0 8px;
  }
  .error-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 32px;
    letter-spacing: 2px;
    margin: 0 0 16px;
  }
  .error-path {
    margin: 0 0 24px;
    color: rgba(220, 230, 245, 0.7);
    font-size: 13px;
  }
  .error-path code {
    font-family: var(--font-mono, 'Space Mono', monospace);
    background: rgba(94, 234, 212, 0.1);
    padding: 2px 6px;
    border-radius: 3px;
    word-break: break-all;
  }
  .error-suggestion {
    margin: 0 0 20px;
    padding: 14px 16px;
    background: rgba(94, 234, 212, 0.08);
    border-left: 3px solid #4ecdc4;
    border-radius: 4px;
  }
  .error-hint {
    margin: 0 0 10px;
    font-size: 13px;
    color: rgba(220, 230, 245, 0.85);
  }
  .error-hint code {
    font-family: var(--font-mono, 'Space Mono', monospace);
    background: rgba(0, 0, 0, 0.25);
    padding: 1px 5px;
    border-radius: 3px;
  }
  .error-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 0 0 20px;
  }
  .error-cta {
    display: inline-block;
    padding: 8px 14px;
    background: #4ecdc4;
    color: #04040c;
    border-radius: 4px;
    text-decoration: none;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 13px;
    letter-spacing: 2px;
    transition: background 100ms ease;
  }
  .error-cta:hover {
    background: #6cd9d2;
  }
  .error-cta-primary {
    width: 100%;
    text-align: center;
  }
  .error-cta-primary code {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: normal;
    background: rgba(4, 4, 12, 0.25);
    padding: 1px 4px;
    border-radius: 2px;
    margin-left: 4px;
  }
  .error-cta-ghost {
    background: transparent;
    color: rgba(220, 230, 245, 0.85);
    border: 1px solid rgba(94, 234, 212, 0.4);
  }
  .error-cta-ghost:hover {
    background: rgba(94, 234, 212, 0.1);
    color: rgba(220, 230, 245, 0.95);
  }
  .error-tip {
    margin: 0;
    padding-top: 16px;
    border-top: 1px solid rgba(94, 234, 212, 0.15);
    font-size: 11px;
    color: rgba(220, 230, 245, 0.6);
  }
  .error-tip code {
    font-family: var(--font-mono, 'Space Mono', monospace);
    background: rgba(94, 234, 212, 0.1);
    padding: 1px 4px;
    border-radius: 2px;
  }
</style>

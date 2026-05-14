<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import '$lib/styles/app.css';
  import Nav from '$lib/components/Nav.svelte';
  import { setLanguageTag } from '$lib/paraglide/runtime';
  import {
    localeFromPage,
    isSupportedLocale,
    syncDocumentLocaleAttributes,
    canonicaliseLocaleInUrl,
    isLocaleUrlCanonical,
  } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';

  let { children } = $props();
  let activeLocale = $derived(localeFromPage($page));

  // Apply the resolved locale to Paraglide BEFORE descendant
  // components render their `m.foo()` calls. $effect.pre runs
  // synchronously before each DOM update — early enough that the
  // first paint of a `?lang=es` URL renders in Spanish, not in
  // en-US fallback that gets corrected on the second tick.
  $effect.pre(() => {
    const code = localeFromPage($page);
    if (isSupportedLocale(code)) {
      setLanguageTag(code);
      syncDocumentLocaleAttributes(code);
    }
  });

  // Issue #73 Gap 1: canonicalise the URL after first paint so a
  // visitor whose locale was resolved from `navigator.language`
  // (no ?lang= in URL) ends up with the canonical `?lang=<resolved>`
  // form. Bookmarks + share-links then carry the locale explicitly,
  // so the recipient sees the same content regardless of their own
  // browser language. Inversely, an explicit `?lang=en-US` is
  // stripped to bare URL since en-US is the default.
  //
  // replaceState (not push) keeps the back button clean. The
  // hasLangParam-after-redirect short-circuit prevents loops.
  $effect(() => {
    if (!browser) return;
    const url = $page.url;
    const resolved = localeFromPage($page);
    if (isLocaleUrlCanonical(url, resolved)) return;
    const canonical = canonicaliseLocaleInUrl(url, resolved);
    void goto(canonical, {
      replaceState: true,
      noScroll: true,
      keepFocus: true,
    });
  });

  // ─── PWA service worker (v0.1.12 / ADR-029) ────────────────────────
  // Register on mount; show an update toast when a new SW is waiting.
  // Runtime-only state per CLAUDE.md (no localStorage). The browser's
  // beforeinstallprompt event is preventDefault'd so neither Chrome's
  // native install banner nor an in-app prompt fires. Users who want
  // to install can still do so via the browser menu (⋮ → "Install
  // Orrery") — the manifest + service worker still qualify the site
  // as installable; we just don't nag.

  let updateAvailable = $state(false);
  let updateSWFn: (() => Promise<void>) | null = $state(null);

  onMount(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    try {
      const { useRegisterSW } = await import('virtual:pwa-register/svelte');
      const { needRefresh, updateServiceWorker } = useRegisterSW({
        onRegisteredSW(_url: string, registration: ServiceWorkerRegistration | undefined) {
          // Hourly check for new builds.
          if (registration) {
            setInterval(() => void registration.update(), 60 * 60 * 1000);
          }
        },
      });
      updateSWFn = () => updateServiceWorker(true);
      needRefresh.subscribe((v: boolean) => {
        updateAvailable = v;
      });
    } catch {
      // SW registration failed; carry on. Manifest-only install still
      // works on Android.
    }
  });

  onMount(() => {
    if (typeof window === 'undefined') return;
    // Suppress both Chrome's native install banner and any in-app
    // prompt. preventDefault stops the browser from auto-showing.
    const onPromptable = (e: Event) => e.preventDefault();
    window.addEventListener('beforeinstallprompt', onPromptable);
    return () => window.removeEventListener('beforeinstallprompt', onPromptable);
  });

  async function refreshApp() {
    if (updateSWFn) await updateSWFn();
    updateAvailable = false;
  }
</script>

<svelte:head>
  <link rel="manifest" href="{base}/manifest.webmanifest" />
  <link rel="icon" href="{base}/logos/nasa.svg" type="image/svg+xml" />
</svelte:head>

{#key activeLocale}
  <Nav />
  <main>
    {@render children?.()}
  </main>
  <footer class="site-footer" aria-label="Site footer">
    <nav class="footer-menu" aria-label="Footer links">
      <a class="footer-link" href="{base}/posters">{m.layout_footer_gallery()}</a>
      <span class="footer-sep" aria-hidden="true">|</span>
      <a class="footer-link" href="{base}/credits">{m.layout_footer_credits()}</a>
      <span class="footer-sep" aria-hidden="true">|</span>
      <a class="footer-link" href="{base}/library">{m.layout_footer_library()}</a>
      <span class="footer-sep footer-sep-extra" aria-hidden="true">|</span>
      <a
        class="footer-link footer-link-extra"
        href="https://github.com/chipi/orrery/blob/main/LICENSE"
        target="_blank"
        rel="noopener noreferrer external"
        hreflang="en">{m.layout_footer_license()}</a
      >
      <span class="footer-sep" aria-hidden="true">|</span>
      <a
        class="footer-link footer-version"
        href="https://github.com/chipi/orrery#readme"
        target="_blank"
        rel="noopener noreferrer external"
        title="Build version (opens project README on GitHub)"
        hreflang="en">v{__APP_VERSION__}</a
      >
    </nav>
  </footer>
{/key}

{#if updateAvailable}
  <div class="pwa-toast" role="status">
    <span>{m.layout_pwa_new_version()}</span>
    <button type="button" onclick={refreshApp}>{m.layout_pwa_refresh()}</button>
  </div>
{/if}

<style>
  main {
    min-height: calc(100vh - var(--nav-height));
  }
  /* Persistent footer link strip — always visible at the
   * bottom-trailing corner so the bill of materials is one click
   * away from every screen, including the full-bleed 3D routes.
   * Designed as a small-footprint text strip (à la most marketing
   * sites) so additional links (Imprint, Privacy, About, …) can
   * grow inline without becoming a heavy chrome element.
   *
   * Sits above the 30-z-index bottom-sheet / drawer panels but
   * below the lightbox overlay (z-index 100). Logical inset
   * (inset-inline-end) mirrors for RTL locales. */
  .site-footer {
    position: fixed;
    bottom: max(6px, env(safe-area-inset-bottom));
    inset-inline-end: 10px;
    z-index: 35;
    pointer-events: none;
  }
  .footer-menu {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px;
    background: rgba(4, 4, 12, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }
  .footer-link {
    pointer-events: auto;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    padding: 2px 0;
    transition: color 0.15s;
  }
  .footer-link:hover,
  .footer-link:focus-visible {
    color: #4ecdc4;
    outline: none;
  }
  .footer-sep {
    pointer-events: none;
    color: rgba(255, 255, 255, 0.22);
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    user-select: none;
  }
  .footer-version {
    pointer-events: auto;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.4);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    cursor: help;
  }
  .footer-link:focus-visible {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* On narrow viewports the footer pill keeps the essentials only —
     Credits, Library, version. The "extra" links (GitHub, README,
     License, TA) hide. They remain reachable via the landing page's
     About-this-project section, the nav, and the GitHub repo. */
  @media (max-width: 767px) {
    .footer-link-extra,
    .footer-sep-extra {
      display: none;
    }
  }
  .pwa-toast {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 10px 16px;
    background: rgba(15, 18, 35, 0.95);
    border: 1px solid rgba(78, 205, 196, 0.5);
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: #dde4ff;
    backdrop-filter: blur(6px);
  }
  .pwa-toast button {
    min-height: 32px;
    padding: 4px 12px;
    background: #4ecdc4;
    border: none;
    border-radius: 3px;
    color: #04040c;
    font-family: inherit;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    cursor: pointer;
  }
</style>

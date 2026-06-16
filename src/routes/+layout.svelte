<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import '$lib/styles/app.css';
  import Nav from '$lib/components/Nav.svelte';
  import AudioOverlay from '$lib/components/AudioOverlay.svelte';
  import DebugPanel from '$lib/components/DebugPanel.svelte';
  import {
    createDebugPanelContext,
    type RenderingDebugRegistration,
  } from '$lib/components/debug-panel-context';
  import type { Snippet } from 'svelte';
  import { audio } from '$lib/audio-state.svelte';
  import { audioRegistry } from '$lib/audio-registry.svelte';
  import { localeFromPage, syncDocumentLocaleAttributes } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import { initAnalytics, track, trackRouteEnter } from '$lib/analytics';
  import { afterNavigate } from '$app/navigation';

  let { children } = $props();

  // Footer version display — show major.minor only, dropping the
  // patch + any `-wip` / `-rc.N` / etc. pre-release suffix. The raw
  // `__APP_VERSION__` (full `0.7.0-wip` shape) stays available for
  // Sentry releases + analytics elsewhere — this is purely the
  // human-facing label in the footer strip.
  const displayVersion = __APP_VERSION__.split('-')[0].split('.').slice(0, 2).join('.');
  let activeLocale = $derived(localeFromPage($page));

  // DebugPanel context — created HERE (layout), not inside DebugPanel,
  // so descendant pages (which are children of `<main>`) can see it via
  // getContext. setContext only flows down to descendants of the
  // calling component, so siblings of DebugPanel (i.e. the page) need
  // the context registered on a shared ancestor.
  const debugPageReg = $state<{ label: string; content: Snippet | null }>({
    label: '',
    content: null,
  });
  // Rendering slot for the DebugPanel "Rendering" tab (#334). 3D routes
  // mount <RenderingDebugRegistrar> to populate `.value`; non-3D routes
  // leave it null and the tab stays hidden.
  const debugRenderingSlot = $state<{ value: RenderingDebugRegistration | null }>({
    value: null,
  });
  createDebugPanelContext(debugPageReg, debugRenderingSlot);

  // Mirror the active locale onto <html lang>/<html dir> after every
  // navigation. Paraglide's transformPageChunk sets the initial value
  // on the prerendered HTML; this effect re-syncs after SPA navigations
  // between locale-prefixed URLs (e.g. /de/iss → /fr/iss) where the
  // <html> tag is reused across the document swap.
  $effect(() => {
    if (!browser) return;
    syncDocumentLocaleAttributes(activeLocale);
  });

  // PRD-016 M15 / RFC-019 §7.7 (S11) — ?audio={episode-id} deep-link.
  // Per-id one-shot: opens + loads + auto-plays the first time we see a
  // given id in this session, so closing it doesn't bounce open on next
  // navigation. Waits for the registry to load if it's still in flight.
  // If the episode anchors to a route other than the current pathname,
  // we goto() there first so cues + stage hooks have their DOM targets
  // (per PRD-016 M15 / RFC-019 §7.7 "navigates to the episode's home
  // route if not already there"). The `?audio=` param is preserved on
  // the destination URL so the effect re-fires after navigation and
  // the play action lands on the right page.
  const handledAudioIds = new Set<string>();
  $effect(() => {
    if (!browser) return;
    const id = $page.url.searchParams.get('audio');
    if (!id) return;
    if (handledAudioIds.has(id)) return;
    handledAudioIds.add(id);
    audio.openOverlay();
    void (async () => {
      await audioRegistry.load();
      const ep = audioRegistry.byId(id);
      if (!ep) return;
      const here = $page.url.pathname.replace(/\/+$/, '') || '/';
      const target = ep.route ? (base + ep.route).replace(/\/+$/, '') || '/' : null;
      if (target && target !== here) {
        // Re-arm so the post-nav effect actually plays. Carry the
        // ?audio= param onto the target URL so the layout re-evaluates.
        handledAudioIds.delete(id);
        const destUrl = new URL($page.url);
        destUrl.pathname = target;
        await goto(destUrl.pathname + destUrl.search, { noScroll: true, keepFocus: true });
        return;
      }
      audio.loadEpisode(ep);
      audio.play();
    })();
  });

  // ─── PWA service worker (v0.1.12 / ADR-029) ────────────────────────
  // Register on mount in autoUpdate mode — the SW activates new bundles
  // silently on next navigation, no toast / no user-facing prompt
  // (vite.config.ts → SvelteKitPWA `registerType: 'autoUpdate'`). Runtime-
  // only state per CLAUDE.md (no localStorage). The browser's
  // beforeinstallprompt event is preventDefault'd elsewhere so neither
  // Chrome's native install banner nor an in-app prompt fires. Users
  // who want to install can still do so via the browser menu (⋮ →
  // "Install Orrery") — the manifest + SW still qualify the site as
  // installable; we just don't nag.

  // Image-save lock (2026-05-21 site policy). Suppress the
  // right-click context menu on <img> and <canvas> so "Save image
  // as…" / "Copy image" is one less obvious affordance. Doesn't
  // touch context menus on any other element (links, text, etc.) —
  // copying a URL is still trivial. This is friction, not protection.
  onMount(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target instanceof HTMLImageElement || target instanceof HTMLCanvasElement) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  });

  onMount(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    // Skip in `vite dev` — `devOptions.enabled: false` in vite.config.ts
    // means /sw.js isn't served, so the registration fetch 404s and
    // pollutes the dev server log. Preview + prod still register.
    if (import.meta.env.DEV) return;
    // Register the SW from the absolute root path. Previously delegated
    // to `virtual:pwa-register/svelte`'s `useRegisterSW`, which on
    // sub-routes (`/missions`, `/science`, …) issued the registration
    // request as a *relative* path → `GET /missions/sw.js` 404s pollute
    // CI logs and slow mobile init under cumulative network noise.
    // The SvelteKit + vite-pwa pipeline always emits the SW at `/sw.js`
    // regardless of the current page, so register absolute + scope root.
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      // Hourly check for new builds. autoUpdate strategy installs any
      // new bundle the check finds, no user prompt required.
      setInterval(() => void registration.update(), 60 * 60 * 1000);
    } catch {
      // SW registration failed; carry on. Manifest-only install still
      // works on Android.
    }
  });

  // Phase 14 (#342) — route-enter / route-exit + nav-flow telemetry.
  // SvelteKit fires afterNavigate on every successful nav (initial mount
  // + every client-side transition). trackRouteEnter captures the new
  // pathname, computes dwell against the prior enter, and emits both
  // `route-exit` (for the prior route) and `route-enter` (for the new
  // one). Initial mount has no prior route → no exit event.
  afterNavigate((nav) => {
    const path = nav.to?.url?.pathname;
    if (path) trackRouteEnter(path);
  });

  onMount(() => {
    if (typeof window === 'undefined') return;
    // Privacy-respecting analytics. Loads only on the production host
    // (chipi.github.io); localhost / vite preview / CI runs are
    // silent. See src/lib/analytics.ts for the host gate + event API.
    initAnalytics();
    // Suppress both Chrome's native install banner and any in-app
    // prompt. preventDefault stops the browser from auto-showing.
    const onPromptable = (e: Event) => e.preventDefault();
    window.addEventListener('beforeinstallprompt', onPromptable);

    // Global click delegation — two events from one listener:
    //  - `external-link-click` on any anchor whose href points off-host
    //  - `panel-tab-open` on any [role="tab"][id] button whose id
    //    follows the `{panelPrefix}-tab-{name}` convention
    //    (mp-tab-overview, pp-tab-gallery, sp-tab-technical, etc.).
    // Wired here rather than per-component so adding a new panel type
    // doesn't require touching this file.
    const onAnyClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;

      // panel-tab-open
      const tabBtn = el.closest('[role="tab"][id]') as HTMLElement | null;
      if (tabBtn) {
        const tabMatch = tabBtn.id.match(/^([a-z0-9]+)-tab-([a-z0-9-]+)$/i);
        if (tabMatch) {
          track('panel-tab-open', {
            panel: tabMatch[1],
            tab: tabMatch[2],
            route: window.location.pathname,
          });
        }
      }

      // external-link-click
      const link = el.closest('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.href;
      if (!href || !/^https?:/i.test(href)) return;
      try {
        const u = new URL(href);
        if (u.hostname === window.location.hostname) return; // same-origin
        track('external-link-click', {
          host: u.hostname,
          href,
          from: window.location.pathname,
        });
      } catch {
        // Malformed href — ignore.
      }
    };
    document.addEventListener('click', onAnyClick, true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPromptable);
      document.removeEventListener('click', onAnyClick, true);
    };
  });
</script>

<svelte:head>
  <link rel="manifest" href="{base}/manifest.webmanifest" />
  <link rel="icon" href="{base}/logos/nasa.svg" type="image/svg+xml" />
</svelte:head>

{#key activeLocale}
  <Nav />
  <AudioOverlay />
  <DebugPanel />
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
      <span class="footer-sep" aria-hidden="true">|</span>
      <!-- ABOUT is a hover-only group: not itself a link, just a label.
           The submenu (LICENSE + README) sits in a popover ABOVE the
           label; reveals on hover/focus-within (2026-06-15 user
           direction: "let's add about section in footer and move
           license and readme links under it somehow… hover on about
           should present 2 nested menu options above it in same
           style, click not possible, and then click on each of those
           does the same what those options do now"). Designed to
           grow as more about-style items land (imprint, privacy, …)
           without re-flowing the inline footer strip. -->
      <span class="footer-about-group">
        <span class="footer-about-label" aria-haspopup="menu">{m.layout_footer_about()}</span>
        <ul class="footer-about-menu" role="menu" aria-label="About">
          <li role="none">
            <a
              class="footer-link footer-link-extra"
              href="https://github.com/chipi/orrery/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer external"
              hreflang="en"
              role="menuitem">{m.layout_footer_license()}</a
            >
          </li>
          <li role="none">
            <a
              class="footer-link footer-link-extra"
              href="https://github.com/chipi/orrery#readme"
              target="_blank"
              rel="noopener noreferrer external"
              hreflang="en"
              role="menuitem">{m.layout_footer_readme()}</a
            >
          </li>
        </ul>
      </span>
      <span class="footer-sep" aria-hidden="true">|</span>
      <a
        class="footer-link footer-version"
        href="https://github.com/chipi/orrery/blob/main/CHANGELOG.md"
        target="_blank"
        rel="noopener noreferrer external"
        title="Build version + deploy date (opens CHANGELOG on GitHub)"
        hreflang="en">v{displayVersion} · {__BUILD_DATE__}</a
      >
    </nav>
  </footer>
{/key}

<style>
  main {
    min-height: calc(100vh - var(--nav-height));
  }
  /* Image-save lock (2026-05-21 site policy): block the most common
   * "save image" affordances (right-click context menu, drag-to-
   * desktop) on every <img> and <canvas>. Public-domain NASA + CC-BY
   * imagery is still discoverable via image-provenance.json source
   * URLs; this is a friction layer, not a true content protection.
   * pointer-events stays unchanged so click handlers, hover, and
   * touch still work — only browser-level affordances are denied. */
  :global(img),
  :global(canvas) {
    -webkit-user-drag: none;
    -webkit-touch-callout: none;
    user-select: none;
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
    /* Was 0.4 — bumped to 0.6 (F3) to clear AA at 10 px against the
       page background. */
    color: rgba(255, 255, 255, 0.6);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    cursor: help;
  }
  .footer-link:focus-visible {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  /* ABOUT hover-group — non-clickable label with a popover menu
     that appears above on hover/focus-within. Designed to grow as
     more about-style items land (Imprint, Privacy, Press, …) without
     reflowing the inline footer strip. */
  .footer-about-group {
    pointer-events: auto;
    position: relative;
    display: inline-flex;
    align-items: center;
  }
  .footer-about-label {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.6);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    padding: 2px 0;
    cursor: default;
    user-select: none;
  }
  .footer-about-menu {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    padding: 4px 10px;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: rgba(4, 4, 12, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.12s ease;
  }
  .footer-about-group:hover .footer-about-menu,
  .footer-about-group:focus-within .footer-about-menu {
    opacity: 1;
    pointer-events: auto;
  }
  .footer-about-menu li {
    margin: 0;
    padding: 0;
    text-align: center;
  }
  /* On narrow viewports the footer pill stays compact. LICENSE +
     README used to render inline (with .footer-link-extra hiding on
     mobile) but now live inside the ABOUT popover, so they're only
     visible when the user explicitly opens it. The .footer-sep-extra
     class is no longer used (the popover replaces the inline
     separators) — drops out naturally. */
</style>

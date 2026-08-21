<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { localizeHref } from '$lib/paraglide/runtime';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { initViewport } from '$lib/viewport.svelte';
  import { Capacitor } from '@capacitor/core';
  import { openExternal } from '$lib/external-link';
  import { formatDisplayVersion } from '$lib/version';
  import { initWebglRecovery } from '$lib/native/webgl-recovery';
  import { initDeepLinks } from '$lib/native/deep-links';
  import { initBackButton } from '$lib/native/back-gesture';
  import { sensory } from '$lib/sensory/state.svelte';
  import { gyro } from '$lib/sensory/device-orientation';
  import '$lib/styles/app.css';
  import Nav from '$lib/components/Nav.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import { immersiveMode } from '$lib/immersive-mode.svelte';
  import AudioOverlay from '$lib/components/AudioOverlay.svelte';
  import ExhibitOverlay from '$lib/components/ExhibitOverlay.svelte';
  import { exhibit } from '$lib/exhibit.svelte';
  import DebugPanel from '$lib/components/DebugPanel.svelte';
  import { reconcilePrerenderedAssetOrigins } from '$lib/target-env';
  import {
    createDebugPanelContext,
    type RenderingDebugRegistration,
  } from '$lib/components/debug-panel-context';
  import type { Snippet } from 'svelte';
  import { audio } from '$lib/audio-state.svelte';
  import { audioRegistry } from '$lib/audio-registry.svelte';
  import { localeFromPage, syncDocumentLocaleAttributes } from '$lib/locale';
  import { loadLocaleAltText } from '$lib/image-alt';
  import * as m from '$lib/paraglide/messages';
  import { initAnalytics, track, trackRouteEnter } from '$lib/analytics';
  import { afterNavigate, replaceState } from '$app/navigation';

  let { children } = $props();

  // Global command palette (RFC-031 S5) — Cmd/Ctrl-K jump-to-anything. Route
  // destinations; labels reuse the nav strings so they stay localised. The
  // TV/keyboard escape hatch that beats D-pad-ing across long lists.
  let commandOpen = $state(false);
  let commandItems = $derived([
    { id: 'home', label: m.nav_home(), href: '/', keywords: 'landing start' },
    {
      id: 'explore',
      label: m.nav_explore(),
      href: '/explore',
      keywords: 'solar system planets sun bodies',
    },
    {
      id: 'missions',
      label: m.nav_missions(),
      href: '/missions',
      keywords: 'spacecraft catalog launches',
    },
    { id: 'fleet', label: m.nav_fleet(), href: '/fleet', keywords: 'rockets vehicles capsules' },
    { id: 'plan', label: m.nav_plan(), href: '/plan', keywords: 'porkchop transfer window' },
    { id: 'fly', label: m.nav_fly(), href: '/fly', keywords: 'mission arc trajectory' },
    { id: 'earth', label: m.nav_earth(), href: '/earth', keywords: 'surface' },
    { id: 'moon', label: m.nav_moon(), href: '/moon', keywords: 'surface lunar sites' },
    { id: 'mars', label: m.nav_mars(), href: '/mars', keywords: 'surface rover sites' },
    { id: 'iss', label: m.nav_iss(), href: '/iss', keywords: 'space station modules' },
    {
      id: 'tiangong',
      label: m.nav_tiangong(),
      href: '/tiangong',
      keywords: 'space station modules china',
    },
    { id: 'science', label: m.nav_science(), href: '/science', keywords: 'encyclopedia physics' },
  ]);

  // Footer version label — keeps the pre-release suffix and collapses a `.0`
  // patch (`0.8.0-wip` → `0.8-wip`). Shared helper so the Nav mirror can't
  // drift. Raw `__APP_VERSION__` stays for Sentry releases + analytics.
  const displayVersion = formatDisplayVersion(__APP_VERSION__);
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
    // Load the locale's image alt-text overlay so panels opened afterwards
    // render localized alt-text (falls back to en-US; #257).
    void loadLocaleAltText(activeLocale, base);
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
      // Silent rollover: when a freshly-installed SW (skipWaiting +
      // clientsClaim, see vite.config) takes control, reload once so the
      // open page swaps to the new build with no manual refresh. Guard on
      // an existing controller so a first-ever install doesn't reload.
      let reloading = false;
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloading) return;
          reloading = true;
          window.location.reload();
        });
      }
      // Register under the deploy's BASE path: `/sw.js` on the root-served
      // prod VPS (base ''), `/orrery/sw.js` on GitHub Pages (base
      // '/orrery'). The prior hardcoded '/sw.js' 404'd on GH Pages — the
      // SW actually lives at `${base}/sw.js` — so updates never propagated
      // and visitors got stranded on a stale precache. (2026-06-29)
      const registration = await navigator.serviceWorker.register(`${base}/sw.js`, {
        scope: `${base}/`,
      });
      // Check for new builds hourly AND whenever the tab regains focus —
      // mobile users return to a backgrounded PWA far more often than they
      // hard-reload, so this is what actually applies a deploy for them.
      setInterval(() => void registration.update(), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void registration.update();
      });
      // Freshness telemetry: follow each newly-found SW through install so a
      // failed install (iOS CacheStorage quota, fetch error) is VISIBLE in
      // analytics — that's the silent signal a device is about to freeze on
      // the old build. `redundant` before ever reaching `activated` = failure.
      registration.addEventListener('updatefound', () => {
        const next = registration.installing;
        if (!next) return;
        let activated = false;
        next.addEventListener('statechange', () => {
          if (next.state === 'activated') {
            activated = true;
            track('sw-activated', { version: __APP_VERSION__ });
          } else if (next.state === 'redundant' && !activated) {
            track('sw-install-failed', { version: __APP_VERSION__ });
          }
        });
      });
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
    // Exhibit Mode (#215): `?mode=exhibit` → chrome-less kiosk. Sticky once
    // entered — the Full Tour navigates route→route (dropping the param), so we
    // never deactivate here (only Esc / corner long-press exits). While active,
    // re-stamp the param so the URL stays kiosk-sticky + reload-resilient.
    const url = nav.to?.url;
    if (url) {
      if (exhibit.urlWantsExhibit(url)) {
        exhibit.activate();
      } else if (exhibit.active) {
        const u = new URL(window.location.href);
        u.searchParams.set('mode', 'exhibit');
        replaceState(u.pathname + u.search + u.hash, {});
        exhibit.refreshQrTarget(); // QR follows the current scene
      }
    }
  });

  // Start/stop the gyro listener as the user enables/disables the tilt channel
  // (RFC-020 §6). Scenes read `gyro.consume()` per frame; this just controls the
  // DeviceOrientation subscription. No-op off-device.
  $effect(() => {
    if (!browser) return;
    if (sensory.active('gyro')) gyro.start();
    else gyro.stop();
  });

  onMount(() => {
    if (typeof window === 'undefined') return;
    // Watch device capability / orientation / viewport height and reflect it
    // onto <html> as data-* attributes for the responsive CSS. The inline
    // app.html script seeds these pre-paint; this keeps them live on change.
    const stopViewport = initViewport();
    // S8 / #195: recover 3D scenes after the iOS WebView drops the WebGL
    // context on background. No-op off-device.
    const stopWebglRecovery = initWebglRecovery();
    // S6 / #221: orrery:// deep links → route navigation. No-op off-device.
    const stopDeepLinks = initDeepLinks();
    // S7 / #194: Android back gesture pops WebView history, exits when empty.
    // Android-only event; no-op off-device. See RFC-018 §10.3.
    const stopBackButton = initBackButton();
    // Privacy-respecting analytics (self-hosted Umami). Loads only when the
    // PUBLIC_UMAMI_* build vars are baked (production build); localhost / vite
    // preview / CI runs are silent. See src/lib/analytics.ts for the env gate
    // + event API.
    initAnalytics();
    // Internal builds (ADR-083): the first prerendered page's images carry the
    // build-default origin; rewrite them to the active target so assets follow
    // the switch too. No-op in web/release.
    reconcilePrerenderedAssetOrigins();
    // Stamp the session with the running build so the live version
    // distribution is visible in the dashboard — a cohort stuck on an old
    // build (e.g. the iOS-precache freeze) is then obvious, not a surprise.
    track('app-load', { version: __APP_VERSION__ });
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
        // External links open away from the app, always: the system browser
        // under Capacitor (S5 / RFC-018 §7 — the WebView is app-bound, so an
        // in-WebView navigation would be a dead end), a new browser tab on web
        // (even when the anchor forgot target="_blank", so a click never
        // navigates the SPA away from the current view).
        if (Capacitor.isNativePlatform()) {
          e.preventDefault();
          void openExternal(href);
        } else if (link.target !== '_blank') {
          e.preventDefault();
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      } catch {
        // Malformed href — ignore.
      }
    };
    document.addEventListener('click', onAnyClick, true);

    // Cmd/Ctrl-K opens the command palette (RFC-031 S5). Ignore when the user
    // is mid-typing in a field, so it never hijacks a real keystroke.
    const onCmdK = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const el = document.activeElement as HTMLElement | null;
        const typing =
          el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
        if (typing) return;
        e.preventDefault();
        commandOpen = true;
      }
    };
    document.addEventListener('keydown', onCmdK);

    return () => {
      stopViewport();
      stopWebglRecovery();
      stopDeepLinks();
      stopBackButton();
      window.removeEventListener('beforeinstallprompt', onPromptable);
      document.removeEventListener('click', onAnyClick, true);
      document.removeEventListener('keydown', onCmdK);
    };
  });
</script>

<svelte:head>
  <link rel="manifest" href="{base}/manifest.webmanifest" />
  <link rel="icon" href="{base}/favicon.svg" type="image/svg+xml" />
</svelte:head>

{#key activeLocale}
  <Nav />
  <CommandPalette items={commandItems} open={commandOpen} onClose={() => (commandOpen = false)} />
  <AudioOverlay />
  <ExhibitOverlay />
  <DebugPanel />
  <main>
    {@render children?.()}
  </main>
  <footer
    class="site-footer"
    class:immersive-hidden={immersiveMode.active}
    aria-label={m.footer_aria()}
  >
    <nav class="footer-menu" aria-label={m.footer_links_aria()}>
      <a class="footer-link" href="{base}{localizeHref('/gallery')}">{m.layout_footer_gallery()}</a>
      <span class="footer-sep" aria-hidden="true">|</span>
      <a class="footer-link" href="{base}/credits">{m.layout_footer_credits()}</a>
      <span class="footer-sep" aria-hidden="true">|</span>
      <a class="footer-link" href="{base}/colophon">{m.layout_footer_colophon()}</a>
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
        <ul class="footer-about-menu" role="menu" aria-label={m.footer_about_aria()}>
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
        title="{m.version_info_title()}: v{displayVersion} · {__BUILD_DATE__}"
        hreflang="en">v{displayVersion}</a
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
  /* Touch: the floating footer is hidden entirely — its links move into the
     nav hamburger drawer as a bottom section (see Nav.svelte). This frees the
     whole bottom edge for each route's drawer buttons instead of the strip
     competing for the bottom-right corner (2026-07 user direction). Desktop
     keeps the floating strip. (Supersedes the older immersive-only hide.) */
  :global(html[data-touch]) .site-footer {
    display: none;
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
  /* Keep the footer strip to ONE line on phones. With the build date now
     in the version tooltip (not rendered), the strip is short enough that a
     slightly tighter gap/padding fits narrow viewports without wrapping to
     multiple lines (was 74px tall at 375px) or clipping the leading link. */
  @media (max-width: 420px) {
    .footer-menu {
      gap: 5px;
      padding: 4px 6px;
    }
  }
  .footer-link {
    pointer-events: auto;
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10px;
    user-select: none;
  }
  .footer-version {
    pointer-events: auto;
    font-family: var(--font-mono, 'Space Mono', monospace);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
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
  /* The extra links are `.footer-link`, which sets `pointer-events: auto`
     unconditionally (so the main footer links stay clickable over the
     pointer-events:none footer). That child value overrides the CLOSED
     popover's `pointer-events: none`, so the invisible (opacity:0) License /
     README links kept intercepting clicks on whatever sits above the footer —
     e.g. /explore's scale-picker bottom rung (SOLAR SYSTEM), which shares the
     bottom-right corner. Gate the children to the open state too. Uses
     pointer-events (not visibility) so the links stay keyboard-focusable and
     `:focus-within` can still open the popover. */
  .footer-about-menu .footer-link-extra {
    pointer-events: none;
  }
  .footer-about-group:hover .footer-about-menu .footer-link-extra,
  .footer-about-group:focus-within .footer-about-menu .footer-link-extra {
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

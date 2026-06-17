<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { onHighContrastChange, toggleHighContrast } from '$lib/high-contrast';
  import {
    onScienceLensAvailableChange,
    onScienceLensChange,
    toggleScienceLens,
  } from '$lib/science-lens';
  import { settingsState, toggleSettingsOpen } from '$lib/quality/quality-settings-store.svelte';
  import { track } from '$lib/analytics';
  import { localizeHref } from '$lib/paraglide/runtime';
  import LocalePicker from '$lib/components/LocalePicker.svelte';
  import { audio } from '$lib/audio-state.svelte';
  import type { Snippet } from 'svelte';

  type Props = { right?: Snippet };
  let { right }: Props = $props();

  const linkDefs = [
    { path: '/', label: m.nav_home },
    { path: '/explore', label: m.nav_explore },
    { path: '/missions', label: m.nav_missions },
    { path: '/fleet', label: m.nav_fleet },
    { path: '/plan', label: m.nav_plan },
    { path: '/fly', label: m.nav_fly },
    { path: '/earth', label: m.nav_earth },
    { path: '/moon', label: m.nav_moon },
    { path: '/mars', label: m.nav_mars },
    { path: '/iss', label: m.nav_iss },
    { path: '/tiangong', label: m.nav_tiangong },
    { path: '/science', label: m.nav_science },
  ] as const;

  function isActive(href: string, pathname: string): boolean {
    return pathname === href || pathname.startsWith(href + '/');
  }

  // ─── High-contrast toggle (Theme C.C2 / v0.1.12 / ADR-029) ─────────
  // The CSS hooks live in tokens.css (data-high-contrast attribute on
  // <html> + @media (prefers-contrast: more)). The button just flips
  // the attribute; tokens.css handles the rest.
  let hiContrast = $state(false);
  let stopWatch: (() => void) | undefined;
  onMount(() => {
    stopWatch = onHighContrastChange((v) => {
      hiContrast = v;
    });
  });
  onDestroy(() => stopWatch?.());

  function onToggleHiContrast() {
    toggleHighContrast();
    // hiContrast updates via the MutationObserver in onHighContrastChange.
  }

  // ─── Science Lens toggle ─────────────────────────────────────────
  // Same attribute-on-<html> pattern as the high-contrast toggle.
  // When ON, routes opt into a denser physics-overlay rendering via
  // CSS selectors like [data-science-lens="on"] in tokens.css /
  // per-route style blocks.
  let scienceLens = $state(false);
  let stopLensWatch: (() => void) | undefined;
  // Availability: true when a ScienceLayersPanel is mounted on the
  // current route (it sets <html data-science-lens-available> via
  // markScienceLensAvailable). Gates the lens-toggle's `disabled`
  // attribute so the button reads as inert on routes without lens
  // content — same affordance as the new settings-toggle on routes
  // that don't surface graphics settings (2026-06-17).
  let scienceLensAvailable = $state(false);
  let stopLensAvailWatch: (() => void) | undefined;
  onMount(() => {
    stopLensWatch = onScienceLensChange((v) => {
      scienceLens = v;
    });
    stopLensAvailWatch = onScienceLensAvailableChange((v) => {
      scienceLensAvailable = v;
    });
  });
  onDestroy(() => {
    stopLensWatch?.();
    stopLensAvailWatch?.();
  });

  function onToggleLens() {
    toggleScienceLens();
    // Umami custom event: did the user discover the Science Lens?
    // `scienceLens` here is the BEFORE state (the subscription
    // hasn't fired yet), so we invert to report the new state.
    track('lens-toggle', { on: !scienceLens, route: $page.url.pathname });
  }

  // ─── Mobile nav drawer ─────────────────────────────────────────
  // On viewports ≤640px the horizontal .center scroller can't fit
  // all 12 nav links and the locale-picker + 2 toggles next to it,
  // so a hamburger toggle exposes the full list as a vertical drawer.
  let mobileMenuOpen = $state(false);
  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
  function closeMobileMenu() {
    mobileMenuOpen = false;
  }

  // ─── Mobile Cmd-K affordance (issue #137) ──────────────────────────
  // On /science routes only — the rail's Search button is `display:none`
  // below 640 px (the rail collapses to a wrapped chip strip there), so
  // mobile users had no on-screen way to reach the encyclopedia search.
  // We surface it as a Drawer row instead: closes the drawer, dispatches
  // a custom event the /science/+layout.svelte listens for and uses to
  // call `searchEl?.open_()`. Outside /science routes the row is hidden
  // (there's no Cmd-K dialog mounted; the rail isn't on those pages).
  const onScience = $derived($page.url.pathname.includes('/science'));
  function openCmdKFromDrawer() {
    closeMobileMenu();
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('orrery-cmd-k-open'));
    }
  }
</script>

<nav aria-label={m.nav_aria_label()}>
  <div class="left">
    <a
      href={`${base}${localizeHref('/')}`}
      class="brand"
      aria-label={m.nav_brand_home_aria()}
      class:active={isActive(`${base}/`, $page.url.pathname)}
    >
      <span class="wordmark">ORRERY</span>
    </a>
  </div>

  <div class="center">
    {#each linkDefs as { path, label } (path)}
      <a
        href={`${base}${localizeHref(path)}`}
        class="link"
        class:active={isActive(`${base}${path}`, $page.url.pathname)}>{label()}</a
      >
    {/each}
  </div>

  <div class="right">
    <button
      type="button"
      class="menu-toggle"
      aria-label={m.nav_mobile_menu_open_aria()}
      aria-expanded={mobileMenuOpen}
      aria-controls={mobileMenuOpen ? 'mobile-nav-drawer' : undefined}
      onclick={toggleMobileMenu}
    >
      <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
        {#if mobileMenuOpen}
          <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" stroke-width="1.6" />
          <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" stroke-width="1.6" />
        {:else}
          <line x1="3" y1="4.5" x2="13" y2="4.5" stroke="currentColor" stroke-width="1.6" />
          <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.6" />
          <line x1="3" y1="11.5" x2="13" y2="11.5" stroke="currentColor" stroke-width="1.6" />
        {/if}
      </svg>
    </button>
    <button
      type="button"
      class="audio-toggle"
      class:active={audio.open}
      class:playing={audio.playing}
      aria-label={m.nav_audio_tour_aria()}
      aria-pressed={audio.open}
      aria-controls={audio.open ? 'audio-overlay' : undefined}
      title={m.nav_audio_tour_tooltip()}
      onclick={() => audio.toggle()}
    >
      <!-- Waveform glyph (PRD-016 / RFC-019 §7.2 — "〜 glyph"). Inline SVG
           so it renders consistently across fonts. The discreet pulse
           while audio.playing comes from the .playing class — bounded
           opacity oscillation, no transform churn (keeps the icon
           readable + respects prefers-reduced-motion via CSS). -->
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          d="M1 8 Q 3 4, 5 8 T 9 8 T 13 8 T 15 8"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
    </button>
    <LocalePicker />
    <button
      type="button"
      class="lens-toggle"
      data-audio-stage="science-lens-toggle"
      class:active={scienceLens}
      disabled={!scienceLensAvailable}
      aria-disabled={!scienceLensAvailable}
      aria-label={scienceLensAvailable
        ? m.nav_science_lens_aria()
        : `${m.nav_science_lens_aria()} (unavailable on this page)`}
      aria-pressed={scienceLens}
      title={scienceLensAvailable
        ? m.nav_science_lens_title()
        : `${m.nav_science_lens_title()} (unavailable on this page)`}
      onclick={onToggleLens}
    >
      <!-- Inline SVG, not a Unicode glyph: the ⊙/⊕ characters render
           blank in some font stacks that don't carry them. SVG always
           draws. Outer ring + crosshair when on, just outer ring off. -->
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4" />
        {#if scienceLens}
          <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="1.4" />
          <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.4" />
        {:else}
          <circle cx="8" cy="8" r="1.4" fill="currentColor" />
        {/if}
      </svg>
    </button>
    <button
      type="button"
      class="contrast-toggle"
      class:active={hiContrast}
      aria-label={m.nav_high_contrast_aria()}
      aria-pressed={hiContrast}
      title={m.nav_high_contrast_aria()}
      onclick={onToggleHiContrast}
    >
      Aa
    </button>
    <!-- Graphics-settings ⚙. Lives in the Nav permanently (2026-06-17
         consolidation — previously fixed-positioned over the canvas of
         each 3D-heavy route). Disabled when no settings-capable route
         is mounted; hover + active glow when available, matching the
         lens / contrast toggles. State + handlers in
         $lib/quality/quality-settings-store.svelte. -->
    <button
      type="button"
      class="settings-toggle"
      class:active={settingsState.open}
      disabled={!settingsState.available}
      aria-disabled={!settingsState.available}
      aria-label={settingsState.available
        ? 'Graphics settings'
        : 'Graphics settings (unavailable on this page)'}
      aria-pressed={settingsState.open}
      title={settingsState.available
        ? 'Graphics settings'
        : 'Graphics settings (unavailable on this page)'}
      onclick={toggleSettingsOpen}
    >
      <!-- 8-spoke gear glyph as inline SVG (matches the lens-toggle
           pattern). Sized to fit the 16 × 16 toggle box. -->
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          d="M8 5.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm6.5 2.8c0-.3 0-.6-.1-.9l1.6-1.2-1.5-2.6-1.9.7a6.4 6.4 0 0 0-1.6-.9l-.3-2H7.3l-.3 2c-.6.2-1.1.5-1.6.9l-1.9-.7-1.5 2.6L3.6 7.1a6.4 6.4 0 0 0 0 1.8L2 10.1l1.5 2.6 1.9-.7c.5.4 1 .7 1.6.9l.3 2h3.4l.3-2c.6-.2 1.1-.5 1.6-.9l1.9.7 1.5-2.6-1.6-1.2c.1-.3.1-.6.1-.9Z"
          fill="none"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    {@render right?.()}
  </div>
</nav>

{#if mobileMenuOpen}
  <div
    id="mobile-nav-drawer"
    class="mobile-drawer"
    role="dialog"
    aria-modal="false"
    aria-label={m.nav_site_drawer_aria()}
  >
    {#each linkDefs as { path, label } (path)}
      <a
        href={`${base}${localizeHref(path)}`}
        class="drawer-link"
        class:active={isActive(`${base}${path}`, $page.url.pathname)}
        onclick={closeMobileMenu}>{label()}</a
      >
    {/each}
    {#if onScience}
      <!-- Mobile-only Cmd-K affordance (issue #137). Mirrors the
           desktop rail's Search button. Same aria-label so the e2e
           getByRole locator matches in both viewports. -->
      <button
        type="button"
        class="drawer-link drawer-search"
        aria-label={m.nav_search_aria()}
        onclick={openCmdKFromDrawer}
      >
        ⌕ {m.nav_search()}
      </button>
    {/if}
  </div>
  <button
    type="button"
    class="drawer-backdrop"
    aria-label={m.nav_mobile_menu_close_aria()}
    onclick={closeMobileMenu}
  ></button>
{/if}

<style>
  nav {
    position: sticky;
    top: 0;
    z-index: 40;
    height: var(--nav-height);
    background: var(--color-nav-bg);
    border-bottom: 1px solid var(--color-border);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
  }

  .left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    height: 100%;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    text-decoration: none;
    color: inherit;
    /* 44 px touch target per ADR-018 — wordmark sits vertically
       centred within the nav bar height. */
    min-height: 44px;
    padding: 0 4px;
    border-radius: 4px;
    transition: opacity 0.12s ease;
    /* Match the optical baseline of the link row to the right —
       Bebas Neue runs slightly tall, so a tiny negative offset
       lines its cap-height up with the link text x-height. */
    line-height: 1;
  }
  .brand:hover,
  .brand:focus-visible {
    opacity: 0.85;
  }
  .brand:focus-visible {
    outline: 2px solid var(--color-accent, #4466ff);
    outline-offset: 2px;
  }
  .brand.active {
    /* Reset hover when already on home. */
    opacity: 1;
  }

  .wordmark {
    font-family: var(--font-display);
    /* Slightly larger than the token default to give the wordmark
       a bit more presence in the nav. Token stays at 30 px so other
       call-sites are unaffected. */
    font-size: 36px;
    letter-spacing: 4px;
    color: var(--color-text);
    line-height: 1;
    display: inline-block;
  }

  .center {
    display: flex;
    gap: 1px;
    align-items: center;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .center::-webkit-scrollbar {
    display: none;
  }

  .link {
    padding: 5px 10px;
    font-size: var(--size-link);
    letter-spacing: 1.5px;
    font-weight: 700;
    /* Inactive nav-link tone. Was 0.28 — bumped to 0.55 (F3) so the
       text meets WCAG AA contrast against the #04040c page background
       while still reading as visibly de-emphasised vs the active link
       at full opacity. */
    color: rgba(255, 255, 255, 0.55);
    text-decoration: none;
    border-radius: 3px;
    border: 1px solid transparent;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .link:hover {
    color: rgba(255, 255, 255, 0.85);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .link.active {
    color: var(--color-text);
    background: rgba(68, 102, 255, 0.28);
    border-color: rgba(68, 102, 255, 0.55);
  }

  .right {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
  }

  .contrast-toggle {
    width: 32px;
    height: 32px;
    min-width: 44px;
    min-height: 44px;
    flex-shrink: 0;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.6);
    font-family: var(--font-display);
    font-size: 13px;
    letter-spacing: 1px;
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  .contrast-toggle:hover,
  .contrast-toggle:focus-visible {
    border-color: rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 0.95);
    outline: none;
  }
  .contrast-toggle.active {
    background: rgba(78, 205, 196, 0.18);
    border-color: rgba(78, 205, 196, 0.6);
    color: #4ecdc4;
  }

  /* Science Lens toggle — same shape as the contrast toggle for visual
     consistency. Symbol is ⊙ off / ⊕ on (closed circle vs marked circle). */
  .lens-toggle {
    width: 32px;
    height: 32px;
    min-width: 44px;
    min-height: 44px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  .lens-toggle svg {
    display: block;
  }
  /* Hover-affordance only on routes that actually surface lens content
     (ScienceLayersPanel sets <html data-science-lens-available> on
     mount). On routes without it (e.g. /missions, /fleet, /library,
     /credits, /), clicking the toggle still works but doesn't change
     anything visible — so the hover color shift would be misleading
     (2026-06-15 user note: "physics layer button should not change
     color on hover when on pages that do not have science lens").
     focus-visible still applies everywhere — it's a keyboard-nav
     affordance, not a "this will do something" hint. */
  :global([data-science-lens-available]) .lens-toggle:hover,
  .lens-toggle:focus-visible {
    border-color: rgba(255, 200, 80, 0.5);
    color: rgba(255, 200, 80, 0.95);
    outline: none;
  }
  /* Active-state yellow gated to the same scope as hover. The lens
     state is a single global toggle, so after the user enables it on
     /science and then navigates to /missions or /fleet the button
     would otherwise keep glowing yellow as if it were doing something
     on a route where the lens has no effect (2026-06-17 user note:
     "science button in nav still changes color to yellow and looks
     as an option when we're on pages that do not have science lens —
     we don't want that. it should call for action by giving yellow
     change of state only on pages where it makes sense since science
     lens is there"). Toggle still works everywhere — the underlying
     `scienceLens` state is preserved — just doesn't display yellow on
     routes where it has no effect. */
  :global([data-science-lens-available]) .lens-toggle.active {
    background: rgba(255, 200, 80, 0.18);
    border-color: rgba(255, 200, 80, 0.65);
    color: #ffc850;
  }
  /* Disabled state — matches the settings-toggle disabled chrome
     (2026-06-17 user direction: "can we also disable science button
     in the same way when not being able to be used"). The button
     still exists in the DOM and gets focused for screen-reader users,
     but :disabled blocks the click + dims the chrome so it reads as
     "not actionable here" instead of "actionable but does nothing"
     — same UX as the gear toggle on non-3D routes. */
  .lens-toggle:disabled {
    cursor: not-allowed;
    color: rgba(255, 255, 255, 0.28);
    border-color: rgba(255, 255, 255, 0.1);
  }

  /* Graphics-settings ⚙ toggle. Same chrome family as the lens +
     contrast buttons for visual consistency, with a third state
     (disabled) for routes that don't surface settings. The disabled
     visual mirrors the "no-action affordance" the lens-toggle already
     uses on lens-unavailable routes (no hover-yellow), so the row
     reads coherently regardless of which buttons are active.
     (2026-06-17 user direction: "have it disabled when page does not
     need it, and when it needs it add hover and glow as for other
     buttons".) */
  .settings-toggle {
    width: 32px;
    height: 32px;
    min-width: 44px;
    min-height: 44px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  .settings-toggle svg {
    display: block;
  }
  /* Hover + focus glow only when the route surfaces settings (i.e. the
     button isn't [disabled]). Teal accent — matches the popup panel's
     border so opening it reads as a continuation of the same control. */
  .settings-toggle:not(:disabled):hover,
  .settings-toggle:not(:disabled):focus-visible {
    border-color: rgba(78, 205, 196, 0.55);
    color: rgba(78, 205, 196, 0.95);
    outline: none;
  }
  .settings-toggle.active {
    background: rgba(78, 205, 196, 0.18);
    border-color: rgba(78, 205, 196, 0.7);
    color: #4ecdc4;
  }
  .settings-toggle:disabled {
    cursor: not-allowed;
    color: rgba(255, 255, 255, 0.28);
    border-color: rgba(255, 255, 255, 0.1);
  }

  /* Audio overlay toggle — same shape as the other right-rail toggles
     for visual consistency. Active state when the overlay is open. */
  .audio-toggle {
    width: 32px;
    height: 32px;
    min-width: 44px;
    min-height: 44px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  .audio-toggle svg {
    display: block;
  }
  .audio-toggle:hover,
  .audio-toggle:focus-visible {
    border-color: rgba(68, 102, 255, 0.5);
    color: rgba(150, 175, 255, 0.95);
    outline: none;
  }
  .audio-toggle.active {
    background: rgba(68, 102, 255, 0.18);
    border-color: rgba(68, 102, 255, 0.65);
    color: #96afff;
  }
  /* Discreet pulse while audio.playing — bounded opacity wave on the
     icon stroke (PRD-016 S3 / RFC-019 §7.2). Animation suspended under
     prefers-reduced-motion so motion-sensitive users see only the
     border-color treatment. */
  .audio-toggle.playing {
    border-color: rgba(150, 175, 255, 0.6);
  }
  .audio-toggle.playing svg {
    animation: audio-toggle-pulse 1.6s ease-in-out infinite;
  }
  @keyframes audio-toggle-pulse {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .audio-toggle.playing svg {
      animation: none;
      opacity: 1;
    }
  }

  /* Hamburger menu toggle — hidden on desktop, shown on mobile. */
  .menu-toggle {
    width: 32px;
    height: 32px;
    min-width: 44px;
    min-height: 44px;
    flex-shrink: 0;
    display: none;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  .menu-toggle:hover,
  .menu-toggle:focus-visible {
    border-color: rgba(255, 255, 255, 0.4);
    color: rgba(255, 255, 255, 0.95);
    outline: none;
  }

  /* Mobile drawer — slides down under the nav with all link items
     stacked vertically. Closed by clicking a link, the backdrop, or
     the toggle (which becomes an × when open). */
  .mobile-drawer {
    position: fixed;
    top: var(--nav-height);
    right: 0;
    width: min(280px, 80vw);
    max-height: calc(100vh - var(--nav-height));
    overflow-y: auto;
    z-index: 45;
    background: var(--color-nav-bg);
    border-left: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
    padding: 8px 0;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: -4px 4px 16px rgba(0, 0, 0, 0.35);
  }
  .drawer-link {
    display: block;
    padding: 12px 18px;
    font-size: var(--size-link);
    letter-spacing: 1.5px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.65);
    text-decoration: none;
    border-left: 3px solid transparent;
    transition: all 0.12s;
  }
  .drawer-link:hover,
  .drawer-link:focus-visible {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.95);
    outline: none;
  }
  .drawer-link.active {
    color: var(--color-text);
    background: rgba(68, 102, 255, 0.18);
    border-left-color: rgba(68, 102, 255, 0.85);
  }
  .drawer-backdrop {
    position: fixed;
    top: var(--nav-height);
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 44;
    background: rgba(0, 0, 0, 0.35);
    border: none;
    cursor: pointer;
  }

  /* Mobile: 44px touch targets per ADR-018, hide subtitle on narrow screens */
  @media (max-width: 768px) {
    .link {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
  }

  /* On narrow viewports the inline link strip can't fit 12 items.
     Hide it and surface the full menu via the hamburger drawer. */
  @media (max-width: 640px) {
    .center {
      display: none;
    }
    .menu-toggle {
      display: inline-flex;
    }
  }

  @media (max-width: 500px) {
    nav {
      padding: 0 6px;
    }
    /* Cluster of 5 right-side buttons (menu / audio / locale / lens /
       contrast) overflowed the 375 px viewport at the default 14 px gap
       — landing.spec.ts:95 + fleet.spec.ts:173 both flagged ~48 px of
       horizontal scroll. Tighten the gap so the cluster fits without
       hiding any controls (each one is reachable here only — the
       hamburger drawer doesn't surface lens / contrast). */
    .right {
      gap: 2px;
    }
    /* Graphics-settings ⚙ — added 2026-06-17 as a 6th right-rail
       button, which overflowed the 375 px viewport again. Hidden on
       phones: it controls graphics-quality tier, a desktop-3D
       affordance (the auto-detection picks an appropriate tier on
       mobile and most phone users don't tweak it). Visible on tablet
       + desktop. */
    .settings-toggle {
      display: none;
    }
  }
</style>

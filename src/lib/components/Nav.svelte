<script lang="ts">
  import { onDestroy, onMount, untrack } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { onHighContrastChange, toggleHighContrast } from '$lib/high-contrast';
  import {
    onScienceLensAvailableChange,
    onScienceLensChange,
    toggleScienceLens,
  } from '$lib/science-lens';
  import { roving } from '$lib/a11y/roving';
  import { trackScienceLensToggle } from '$lib/analytics';
  import { localizeHref } from '$lib/paraglide/runtime';
  import LocalePicker from '$lib/components/LocalePicker.svelte';
  import { audio } from '$lib/audio-state.svelte';
  import { sensory } from '$lib/sensory/state.svelte';
  import SensorySheet from '$lib/components/SensorySheet.svelte';
  import {
    MenuIcon,
    AudioWaveIcon,
    ScienceLensIcon,
    SettingsGearIcon,
    ShareIcon,
  } from '$lib/components/icons';
  import { shareCurrent } from '$lib/share';
  import { formatDisplayVersion } from '$lib/version';
  import type { Snippet } from 'svelte';

  type Props = { right?: Snippet };
  let { right }: Props = $props();

  // Footer version chip (mirrors +layout.svelte via the shared helper). The
  // floating .site-footer is hidden on touch, so the version is restored at the
  // bottom of the mobile drawer. Keeps the -wip suffix, collapses a .0 patch.
  const displayVersion = formatDisplayVersion(__APP_VERSION__);

  // ─── Grouped nav (2026-07 IA restructure) ───────────────────────────
  // The 14 flat items regroup into standalone links + three dropdown
  // groups. Groups open a disclosure menu on pointer devices and expand
  // inline in the mobile drawer.
  //
  // TV ONLY (10-foot / D-pad): a dropdown is unusable with a D-pad, so on
  // the TV layout the three groups render as plain links to a big-box hub
  // page (`hub`) — focus the label, press OK, land on the hub, arrow through
  // the tiles. Desktop + mobile are UNCHANGED (isTv is false for them, so
  // they take the exact same dropdown / inline-drawer branches as before).
  type NavLink = { kind: 'link'; path: string; label: () => string };
  type NavGroup = {
    kind: 'group';
    key: string;
    label: () => string;
    hub: string;
    children: { path: string; label: () => string }[];
  };
  type NavItem = NavLink | NavGroup;

  const navItems: NavItem[] = [
    { kind: 'link', path: '/', label: m.nav_home },
    {
      kind: 'group',
      key: 'explore',
      label: m.nav_group_explore,
      hub: '/explore/hub',
      children: [
        { path: '/explore', label: m.nav_explore }, // "OUR SOLAR SYSTEM"
        { path: '/earth', label: m.nav_earth },
        { path: '/moon', label: m.nav_moon },
        { path: '/mars', label: m.nav_mars },
        { path: '/iss', label: m.nav_iss },
        { path: '/tiangong', label: m.nav_tiangong },
      ],
    },
    { kind: 'link', path: '/fly', label: m.nav_fly },
    { kind: 'link', path: '/plan', label: m.nav_plan },
    {
      kind: 'group',
      key: 'catalog',
      label: m.nav_catalog,
      hub: '/catalog',
      children: [
        { path: '/programs', label: m.nav_programs },
        { path: '/missions', label: m.nav_missions },
        { path: '/fleet', label: m.nav_fleet },
      ],
    },
    {
      kind: 'group',
      key: 'learn',
      label: m.nav_learn,
      hub: '/learn',
      children: [
        { path: '/essays', label: m.nav_essays },
        { path: '/science', label: m.nav_science },
      ],
    },
  ];

  // TV (10-foot) detector — same query as the overscan layer in app.css and
  // the landing's TV route-grid: coarse pointer + no hover + large + low-DPR.
  // Hits TV, excludes desktop and high-DPR tablets. Drives the group→hub-link
  // rendering below; false everywhere except TV, so desktop/mobile are
  // untouched.
  const TV_QUERY =
    '(hover: none) and (pointer: coarse) and (min-width: 1100px) and (max-resolution: 1.5dppx)';
  let isTv = $state(false);
  let tvMql: MediaQueryList | undefined;
  const onTvChange = (e: MediaQueryListEvent) => (isTv = e.matches);
  onMount(() => {
    tvMql = window.matchMedia(TV_QUERY);
    isTv = tvMql.matches;
    tvMql.addEventListener('change', onTvChange);
  });
  onDestroy(() => tvMql?.removeEventListener('change', onTvChange));

  function isActive(href: string, pathname: string): boolean {
    return pathname === href || pathname.startsWith(href + '/');
  }
  function groupActive(group: NavGroup, pathname: string): boolean {
    return group.children.some((c) => isActive(`${base}${c.path}`, pathname));
  }

  // Dropdown open-state — one group at a time. Closed by: Escape, an
  // outside click (backdrop), selecting a child, or opening another group.
  let openGroup = $state<string | null>(null);
  function toggleGroup(key: string) {
    openGroup = openGroup === key ? null : key;
  }
  function closeGroups() {
    openGroup = null;
  }
  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && openGroup) closeGroups();
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
    // `scienceLens` here is the BEFORE state (the subscription hasn't
    // fired yet), so we invert to report the new state. Unified with the
    // /science page toggle under one `science-lens-toggle` event (source
    // distinguishes nav vs page).
    trackScienceLensToggle(!scienceLens, 'nav');
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

  // ─── Sensory layer (PRD-017 / RFC-020) ──────────────────────────────
  // One nav button opens the settings sheet (master + Sound/Vibration/Tilt
  // sub-toggles). The first time the master is switched on this session, a
  // non-modal hint toast surfaces (S2 / #174), auto-dismissing after 4s.
  let sensoryHintVisible = $state(false);
  let sensoryHintTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    if (sensory.on && !sensory.hintShown) {
      // Writes must not re-trigger this effect — mark shown + arm the toast
      // outside the reactive read (feedback_svelte5_effect_untrack).
      untrack(() => {
        sensory.markHintShown();
        sensoryHintVisible = true;
        clearTimeout(sensoryHintTimer);
        sensoryHintTimer = setTimeout(() => (sensoryHintVisible = false), 4000);
      });
    }
  });
  onDestroy(() => clearTimeout(sensoryHintTimer));
</script>

<svelte:window onkeydown={onWindowKeydown} />

<!-- Roving toolbar (RFC-031 S1): the whole top bar is one Tab stop; ← → (and a
     TV D-pad) sweep across brand · links · toggles, wrapping. Tab then jumps
     past the nav straight to page content. -->
<nav aria-label={m.nav_aria_label()} use:roving={{ orientation: 'horizontal', wrap: true }}>
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
    {#each navItems as item (item.kind === 'group' ? item.key : item.path)}
      {#if item.kind === 'link'}
        <a
          href={`${base}${localizeHref(item.path)}`}
          class="link"
          class:active={isActive(`${base}${item.path}`, $page.url.pathname)}>{item.label()}</a
        >
      {:else if isTv}
        <!-- TV: the group is a plain link to its big-box hub (no dropdown). -->
        <a
          href={`${base}${localizeHref(item.hub)}`}
          class="link"
          class:active={groupActive(item, $page.url.pathname)}>{item.label()}</a
        >
      {:else}
        <div class="nav-group">
          <button
            type="button"
            class="link group-trigger"
            class:active={groupActive(item, $page.url.pathname)}
            aria-haspopup="true"
            aria-expanded={openGroup === item.key}
            onclick={() => toggleGroup(item.key)}
          >
            {item.label()}<span class="caret" aria-hidden="true">▾</span>
          </button>
          {#if openGroup === item.key}
            <div class="group-menu" role="menu" aria-label={item.label()}>
              {#each item.children as child (child.path)}
                <a
                  href={`${base}${localizeHref(child.path)}`}
                  role="menuitem"
                  class="group-menu-link"
                  class:active={isActive(`${base}${child.path}`, $page.url.pathname)}
                  onclick={closeGroups}>{child.label()}</a
                >
              {/each}
            </div>
          {/if}
        </div>
      {/if}
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
      <MenuIcon open={mobileMenuOpen} />
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
      <AudioWaveIcon />
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
      <ScienceLensIcon active={scienceLens} />
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
    <!-- Unified settings ⚙ (2026-07-13). One always-available button opens the
         settings panel — Sound / Haptics / Tilt on every route, plus a Graphics
         quality section on 3D routes (gated by settingsState.available inside
         the panel). Merges the former sensory button + graphics gear. -->
    <button
      type="button"
      class="settings-toggle"
      class:active={sensory.settingsOpen || sensory.anyActive}
      aria-label={m.settings_title()}
      aria-haspopup="dialog"
      aria-expanded={sensory.settingsOpen}
      aria-controls={sensory.settingsOpen ? 'sensory-sheet' : undefined}
      title={m.settings_title()}
      onclick={() => (sensory.settingsOpen ? sensory.closeSettings() : sensory.openSettings())}
    >
      <!-- 8-spoke gear glyph as inline SVG. -->
      <SettingsGearIcon />
    </button>
    <button
      type="button"
      class="share-toggle"
      aria-label={m.nav_share()}
      title={m.nav_share()}
      onclick={() => void shareCurrent()}
    >
      <ShareIcon />
    </button>
    {@render right?.()}
  </div>
</nav>

{#if openGroup}
  <!-- Click-catcher: an outside click closes the open dropdown. Sits below
       the menu (which is inside .nav at z-index 40) but above page content. -->
  <button
    type="button"
    class="group-backdrop"
    aria-label={m.nav_mobile_menu_close_aria()}
    onclick={closeGroups}
  ></button>
{/if}

<SensorySheet />

{#if sensoryHintVisible}
  <div class="sensory-hint" role="status" aria-live="polite">
    {sensory.capabilities.gyro || sensory.capabilities.haptic
      ? m.sensory_hint_toast()
      : m.sensory_hint_toast_audio()}
  </div>
{/if}

{#if mobileMenuOpen}
  <div
    id="mobile-nav-drawer"
    class="mobile-drawer"
    role="dialog"
    aria-modal="false"
    aria-label={m.nav_site_drawer_aria()}
  >
    {#each navItems as item (item.kind === 'group' ? item.key : item.path)}
      {#if item.kind === 'link'}
        <a
          href={`${base}${localizeHref(item.path)}`}
          class="drawer-link"
          class:active={isActive(`${base}${item.path}`, $page.url.pathname)}
          onclick={closeMobileMenu}>{item.label()}</a
        >
      {:else if isTv}
        <!-- TV: the group is a single link to its big-box hub — no inline
             children to D-pad past. -->
        <a
          href={`${base}${localizeHref(item.hub)}`}
          class="drawer-link"
          class:active={groupActive(item, $page.url.pathname)}
          onclick={closeMobileMenu}>{item.label()}</a
        >
      {:else}
        <!-- Groups expand inline in the drawer: a non-interactive heading
             with its children indented beneath — every destination stays one
             tap away, no nested disclosure to fight on touch. -->
        <div class="drawer-group" role="group" aria-label={item.label()}>
          <span class="drawer-group-label">{item.label()}</span>
          {#each item.children as child (child.path)}
            <a
              href={`${base}${localizeHref(child.path)}`}
              class="drawer-link drawer-group-item"
              class:active={isActive(`${base}${child.path}`, $page.url.pathname)}
              onclick={closeMobileMenu}>{child.label()}</a
            >
          {/each}
        </div>
      {/if}
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
    <!-- Locale + high-contrast live in the drawer on phones (they don't fit
         the 375px top bar beside the 44px touch targets). The lens toggle
         stays in the bar as a primary feature. -->
    <div class="drawer-controls">
      <LocalePicker />
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
    </div>
    <!-- Footer links live here on touch — the floating .site-footer is hidden
         on touch (see +layout.svelte), so its bill-of-materials links move into
         the nav drawer as a bottom section. Desktop keeps the bottom-right
         strip unchanged (2026-07 user direction: "in mobile view move footer
         to main nav as section at bottom; desktop stays as is"). -->
    <div class="drawer-footer" aria-label={m.footer_links_aria()}>
      <a
        class="drawer-link drawer-link-sm"
        href="{base}{localizeHref('/gallery')}"
        onclick={closeMobileMenu}>{m.layout_footer_gallery()}</a
      >
      <a class="drawer-link drawer-link-sm" href="{base}/credits" onclick={closeMobileMenu}
        >{m.layout_footer_credits()}</a
      >
      <a class="drawer-link drawer-link-sm" href="{base}/colophon" onclick={closeMobileMenu}
        >{m.layout_footer_colophon()}</a
      >
      <a class="drawer-link drawer-link-sm" href="{base}/library" onclick={closeMobileMenu}
        >{m.layout_footer_library()}</a
      >
      <!-- License + README fold under an "About" sub-heading, mirroring the
           desktop footer's ABOUT hover-group (+layout.svelte). Designed to
           grow (imprint, privacy, …) alongside the desktop menu. -->
      <div class="drawer-about" role="group" aria-label={m.footer_about_aria()}>
        <span class="drawer-about-label">{m.layout_footer_about()}</span>
        <a
          class="drawer-link drawer-link-sm drawer-about-item"
          href="https://github.com/chipi/orrery/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer external"
          hreflang="en">{m.layout_footer_license()}</a
        >
        <a
          class="drawer-link drawer-link-sm drawer-about-item"
          href="https://github.com/chipi/orrery#readme"
          target="_blank"
          rel="noopener noreferrer external"
          hreflang="en">{m.layout_footer_readme()}</a
        >
      </div>
    </div>
    <!-- Version chip — restored at the drawer bottom on touch (the floating
         .site-footer version link is hidden on touch). External CHANGELOG
         link, so no closeMobileMenu (matches the License/README links). -->
    <a
      class="drawer-version"
      href="https://github.com/chipi/orrery/blob/main/CHANGELOG.md"
      target="_blank"
      rel="noopener noreferrer external"
      title="{m.version_info_title()}: v{displayVersion} · {__BUILD_DATE__}"
      hreflang="en">v{displayVersion}</a
    >
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
    /* --nav-height already includes the iOS safe area (tokens.css); the
       padding-top pushes the bar's own content below the status bar /
       Dynamic Island. No-op off-device (env() = 0). */
    height: var(--nav-height);
    padding-top: var(--safe-area-inset-top, env(safe-area-inset-top));
    background: var(--color-nav-bg);
    border-bottom: 1px solid var(--color-border);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-left: 24px;
    padding-right: 24px;
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
    /* overflow must stay visible so the dropdown panels can hang below the
       bar. With the 2026-07 grouping there are only 6 top-level items (was
       14), so the horizontal scroller is no longer needed on desktop — the
       row fits, and ≤640 / touch collapses to the hamburger drawer anyway. */
    overflow: visible;
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

  /* ── Grouped-nav dropdowns (2026-07 IA restructure) ───────────────── */
  .nav-group {
    position: relative;
    display: inline-flex;
  }
  /* The group trigger is a <button> styled to sit flush with the sibling
     <a> links (it already carries the .link class). Reset the button chrome
     and inherit the bar typography. */
  .group-trigger {
    appearance: none;
    background: transparent;
    font-family: inherit;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .caret {
    font-size: 0.7em;
    opacity: 0.65;
    transition: transform 0.15s;
  }
  .group-trigger[aria-expanded='true'] .caret {
    transform: rotate(180deg);
  }
  /* Dropdown panel — anchored under the trigger, same chrome as the mobile
     drawer for consistency. */
  .group-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    min-width: 190px;
    z-index: 50;
    display: flex;
    flex-direction: column;
    padding: 6px;
    background: var(--color-nav-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }
  .group-menu-link {
    display: block;
    padding: 9px 12px;
    font-size: var(--size-link);
    letter-spacing: 1.5px;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    border-radius: 4px;
    border: 1px solid transparent;
    white-space: nowrap;
    transition: all 0.12s;
  }
  .group-menu-link:hover,
  .group-menu-link:focus-visible {
    color: rgba(255, 255, 255, 0.95);
    border-color: rgba(255, 255, 255, 0.12);
    outline: none;
  }
  .group-menu-link.active {
    color: var(--color-text);
    background: rgba(68, 102, 255, 0.28);
    border-color: rgba(68, 102, 255, 0.55);
  }
  /* Transparent full-page click-catcher behind an open dropdown. */
  .group-backdrop {
    position: fixed;
    inset: var(--nav-height) 0 0 0;
    z-index: 39;
    background: transparent;
    border: none;
    cursor: default;
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
  .lens-toggle :global(svg) {
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
  .settings-toggle,
  .share-toggle {
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
  .settings-toggle :global(svg),
  .share-toggle :global(svg) {
    display: block;
  }
  .share-toggle:hover,
  .share-toggle:focus-visible {
    border-color: rgba(78, 205, 196, 0.55);
    color: rgba(78, 205, 196, 0.95);
    outline: none;
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
  .audio-toggle :global(svg) {
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
  .audio-toggle.playing :global(svg) {
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
    .audio-toggle.playing :global(svg) {
      animation: none;
      opacity: 1;
    }
  }

  /* First-time sensory hint — non-modal toast, bottom-centre, 4s auto-dismiss. */
  .sensory-hint {
    position: fixed;
    left: 50%;
    bottom: calc(20px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom)));
    transform: translateX(-50%);
    z-index: 95;
    max-width: min(360px, calc(100vw - 24px));
    padding: 10px 16px;
    background: rgba(20, 22, 34, 0.95);
    border: 1px solid rgba(78, 205, 196, 0.5);
    border-radius: 999px;
    color: var(--color-text);
    font-size: 13px;
    text-align: center;
    box-shadow: 0 6px 22px rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
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
    /* Top-level site chrome: must clear the route HUD band (surface chips,
       altitude, panorama overlays all reach z-index ~45-70) so the open
       menu isn't painted over. Stays below full-screen panels/lightboxes
       (100+). */
    z-index: 89;
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
  /* Locale + high-contrast, moved out of the top bar on phones — the same
     buttons, just relocated. Only the row that positions them. */
  .drawer-controls {
    /* Hidden by default — only narrow phones (≤500px) move the locale +
       contrast controls in here; wider touch screens keep them in the bar. */
    display: none;
    align-items: center;
    gap: 10px;
    padding: 12px 18px;
    border-top: 1px solid var(--color-border);
    margin-top: 4px;
  }
  /* The locale chip (its own component) uses a different font + left-aligns
     its label; align it to the contrast toggle beside it so the two read as
     one matched pair. Scoped to the drawer — the desktop bar chip is
     unchanged. */
  .drawer-controls :global(.chip) {
    justify-content: center;
    font-family: var(--font-display);
    font-size: 13px;
    letter-spacing: 1px;
    border-radius: 4px;
    border-color: rgba(255, 255, 255, 0.18);
    color: rgba(255, 255, 255, 0.6);
  }
  /* The picker's dropdown opens downward by default; from this bottom-of-drawer
     position that gets clipped by the drawer's own scroll (overflow-y:auto).
     Open it upward instead, and cap its height with its own scroll so every
     locale stays reachable within the drawer. */
  /* In the drawer the dropdown opens upward as a narrow vertical slice the
     width of the chip (short tags only — no room for native names), scrolls
     rather than clipping, and sits above the drawer backdrop (z-index 88) so
     the options are actually tappable, not just visible. */
  .drawer-controls :global(.locale-picker .menu) {
    top: auto;
    bottom: calc(100% + 6px);
    left: 0;
    right: auto;
    min-width: 0;
    width: 100%;
    max-height: 50vh;
    overflow-y: auto;
    z-index: 90;
  }
  .drawer-controls :global(.locale-picker .option) {
    justify-content: center;
    gap: 0;
    padding: 8px 4px;
  }
  .drawer-controls :global(.locale-picker .option .native) {
    display: none;
  }
  /* Grouped sections in the mobile drawer — a muted heading with its
     children indented beneath (mirrors the desktop dropdown grouping). */
  .drawer-group-label {
    display: block;
    padding: 12px 18px 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.4);
  }
  .drawer-group-item {
    padding-left: 32px;
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
    /* Sit directly under the drawer (89) but above the route HUD so the
       backdrop actually dims the surface chips instead of them showing
       through. */
    z-index: 88;
    background: rgba(0, 0, 0, 0.35);
    border: none;
    cursor: pointer;
  }

  /* Touch: 44px touch targets per ADR-018 — keyed on input capability, not
     width, so a wide landscape phone still gets big targets. */
  @media (pointer: coarse) {
    .link {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
    }
  }

  /* Surface the full menu via the hamburger drawer instead of the inline
     strip when it can't fit / doesn't belong: narrow desktop windows (< 640)
     OR any touch device (a landscape phone is wide but still wants the touch
     menu, and its inline strip was a cramped horizontal scroller). Keyed on
     capability, not width, so the footer-in-drawer section reaches every
     touch size (0.7.2 model). */
  @media (max-width: 640px), (pointer: coarse) {
    .center {
      display: none;
    }
    .menu-toggle {
      display: inline-flex;
    }
  }

  /* TV / 10-foot (RFC-031): the previous rule collapses every coarse-pointer
     device to the hamburger — right for phones, WRONG for a TV, where a D-pad
     wants the links on screen, not behind a menu. On TV keep the inline bar
     (its groups render as big-box hub links via isTv) and drop the hamburger.
     Declared after the rule above so it wins for the TV query. */
  @media (hover: none) and (pointer: coarse) and (min-width: 1100px) and (max-resolution: 1.5dppx) {
    .center {
      display: flex;
    }
    .menu-toggle {
      display: none;
    }
  }

  /* Footer links relocated into the drawer bottom on touch (the floating
     .site-footer is display:none on touch). Set off from the route links
     with a divider + a lighter, mono treatment matching the desktop strip. */
  .drawer-footer {
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid var(--color-border);
  }
  .drawer-link-sm {
    padding: 9px 18px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    border-left-color: transparent;
  }
  /* "About" sub-group in the drawer footer — a muted first-cap sub-heading
     with License / README nested (indented) beneath it. */
  .drawer-about {
    margin-top: 2px;
  }
  .drawer-about-label {
    display: block;
    padding: 9px 18px 2px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.38);
  }
  .drawer-about-item {
    padding-left: 32px;
  }
  /* Version chip pinned at the drawer bottom, dimmer than the about links. */
  .drawer-version {
    display: block;
    padding: 10px 18px 12px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.35);
    text-decoration: none;
  }
  .drawer-version:hover,
  .drawer-version:focus-visible {
    color: rgba(255, 255, 255, 0.7);
  }

  @media (max-width: 500px) {
    nav {
      /* Keep the top safe-area inset (this shorthand previously zeroed it,
         hiding the nav under the iOS status bar). */
      padding: var(--safe-area-inset-top, env(safe-area-inset-top)) 6px 0;
    }
    /* Keep every target at 44 px on a 375 px bar by moving the locale picker +
       high-contrast into the hamburger drawer on phones (see .drawer-controls).
       The lens toggle stays as a primary feature; the unified settings ⚙ stays
       in the bar too — it's the ONLY way to reach sound/haptics/tilt on mobile
       (it replaced the former sensory button, so the button count is unchanged). */
    .right {
      gap: 2px;
    }
    .right :global(.locale-picker),
    .right .contrast-toggle {
      display: none;
    }
    /* ...and surface them in the drawer instead. On wider touch screens
       (landscape) the bar has room, so the cluster stays inline there and the
       drawer row is hidden (base rule) — no duplication. */
    .drawer-controls {
      display: flex;
    }
  }
</style>

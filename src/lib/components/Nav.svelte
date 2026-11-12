<script lang="ts">
  import { onDestroy, onMount, tick, untrack } from 'svelte';
  import { localHref } from '$lib/locale';
  import { page } from '$app/state';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { onHighContrastChange, toggleHighContrast } from '$lib/high-contrast';
  import { debugMode, toggleDebugMode } from '$lib/debug-mode.svelte';
  import {
    onScienceLensAvailableChange,
    onScienceLensChange,
    toggleScienceLens,
  } from '$lib/science-lens';
  import { roving } from '$lib/a11y/roving';
  import { trackScienceLensToggle } from '$lib/analytics';
  import { localizeHref } from '$lib/paraglide/runtime';
  import { exploreContext, type ExploreContextId } from '$lib/explore-context';
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
    children: { path: string; label: () => string; query?: string }[];
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
        // Explicit ?context=solar-system so this jumps back to the solar system from
        // any scale (a bare /explore is a no-op when you're already on /explore — the
        // URL doesn't change, so nothing fires; the param gives the effect a trigger).
        { path: '/explore', query: '?context=solar-system', label: m.nav_explore },
        // /explore v2 scale-shells — jump straight to a context (RFC-032).
        {
          path: '/explore',
          query: '?context=neighborhood',
          label: m.explore_ctx_stellar_neighborhood,
        },
        { path: '/explore', query: '?context=milky-way', label: m.explore_ctx_milky_way },
        { path: '/explore', query: '?context=local-group', label: m.explore_ctx_local_group },
        // The outward cosmology tiers (RFC-039 shells; surfaced 2026-08).
        { path: '/explore', query: '?context=local-sheet', label: m.explore_ctx_local_sheet },
        { path: '/explore', query: '?context=virgo', label: m.explore_ctx_virgo },
        { path: '/explore', query: '?context=laniakea', label: m.explore_ctx_laniakea },
        { path: '/explore', query: '?context=cosmic-web', label: m.explore_ctx_cosmic_web },
      ],
    },
    // WORLDS (2026-08 IA split, RFC-038) — the worlds you can stand on. Split out
    // of the EXPLORE group so EXPLORE reads as the pure zoom-out scale ladder and
    // WORLDS as the close-up body views. Only bodies with a real page of their own
    // (a SurfaceScene) — Earth/Moon/Mars/Venus today; grows as surface scenes ship.
    // TV: the group collapses to its big-box hub (/worlds), like the other groups.
    {
      kind: 'group',
      key: 'worlds',
      label: m.nav_group_worlds,
      hub: '/worlds',
      children: [
        { path: '/earth', label: m.nav_earth },
        { path: '/moon', label: m.nav_moon },
        { path: '/mars', label: m.nav_mars },
        { path: '/venus', label: m.nav_venus },
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
        // Human hardware — the crewed stations live with missions + fleet.
        { path: '/iss', label: m.nav_iss },
        { path: '/tiangong', label: m.nav_tiangong },
        { path: '/live', label: m.nav_live },
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
        { path: '/lab', label: m.nav_lab },
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
  // The /explore scale-shell children map to a live context: the no-query child
  // = "solar-system", each `?context=X` child = X. The URL can't drive this (the
  // page clears ?context after the jump), so highlight against the live
  // `exploreContext` store instead. Non-/explore children keep the plain
  // path-match (the no-query variant). Passing `ctx` in makes the template
  // re-evaluate when the store changes.
  function childActive(
    child: { path: string; query?: string },
    url: URL,
    ctx: ExploreContextId | null,
  ): boolean {
    if (!isActive(`${base}${child.path}`, url.pathname)) return false;
    if (child.path === '/explore') {
      const target = child.query ? new URLSearchParams(child.query).get('context') : 'solar-system';
      return ctx === target;
    }
    return !child.query;
  }

  // Dropdown open-state — one group at a time. Closed by: Escape, an
  // outside click (backdrop), selecting a child, or opening another group.
  let openGroup = $state<string | null>(null);
  function toggleGroup(key: string) {
    moreOpen = false;
    openGroup = openGroup === key ? null : key;
  }
  function closeGroups() {
    openGroup = null;
  }
  function onWindowKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && openGroup) closeGroups();
    if (e.key === 'Escape' && moreOpen) closeMore(true);
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

  // ─── More menu (UXD-016, WAI-ARIA menu button) ─────────────────────
  // High contrast, Share and Debug sit behind one bar button. The bar menu and the phone
  // drawer render from this one list, so the two can never disagree. The switch rows
  // (`checked`) keep the menu open so the flip is visible; Share closes it.
  type MoreItem = {
    id: 'contrast' | 'share' | 'debug';
    label: () => string;
    checked?: () => boolean;
    run: () => void;
  };
  const moreItems: MoreItem[] = [
    {
      id: 'contrast',
      label: m.nav_high_contrast_aria,
      checked: () => hiContrast,
      run: onToggleHiContrast,
    },
    { id: 'share', label: m.nav_share, run: () => void shareCurrent() },
    {
      id: 'debug',
      label: m.nav_debug_group_aria,
      checked: () => debugMode.enabled,
      run: toggleDebugMode,
    },
  ];
  let moreOpen = $state(false);
  let moreTrigger = $state<HTMLButtonElement>();
  let moreMenu = $state<HTMLElement>();
  const moreRows = () =>
    Array.from(moreMenu?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);
  async function openMore(at: 'first' | 'last' = 'first') {
    openGroup = null;
    mobileMenuOpen = false;
    moreOpen = true;
    await tick();
    const rows = moreRows();
    (at === 'last' ? rows.at(-1) : rows[0])?.focus();
  }
  function closeMore(returnFocus = false) {
    moreOpen = false;
    if (returnFocus) moreTrigger?.focus();
  }
  // At <= 600 px the trigger and menu are display:none (the drawer rows take over), so a menu
  // left open across the breakpoint (window resize, tablet rotation) would hold focus in a
  // hidden element and reopen when widened again.
  $effect(() => {
    const phone = matchMedia('(max-width: 600px)');
    const onChange = () => {
      if (phone.matches) moreOpen = false;
    };
    phone.addEventListener('change', onChange);
    return () => phone.removeEventListener('change', onChange);
  });
  function activateMore(item: MoreItem) {
    item.run();
    if (!item.checked) closeMore(true);
  }
  function activateInDrawer(item: MoreItem) {
    item.run();
    if (!item.checked) closeMobileMenu();
  }
  function onMoreTriggerKeydown(e: KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    void openMore(e.key === 'ArrowUp' ? 'last' : 'first');
  }
  // Tab is not handled: the rows are tabindex -1, so Tab leaves the menu in one step and
  // the focusout below closes it.
  function onMoreKeydown(e: KeyboardEvent) {
    const rows = moreRows();
    const at = rows.indexOf(document.activeElement as HTMLElement);
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowDown') next = rows[(at + 1) % rows.length];
    else if (e.key === 'ArrowUp') next = rows[(at - 1 + rows.length) % rows.length];
    else if (e.key === 'Home') next = rows[0];
    else if (e.key === 'End') next = rows.at(-1);
    else return;
    e.preventDefault();
    next?.focus();
  }
  function onMoreFocusout(e: FocusEvent) {
    const to = e.relatedTarget as Node | null;
    if (to && !moreMenu?.contains(to) && to !== moreTrigger) closeMore();
  }

  // ─── Mobile nav drawer ─────────────────────────────────────────
  // On viewports ≤1219px (see the media rule) the inline .center row can't fit
  // all 12 nav links and the locale-picker + 2 toggles next to it,
  // so a hamburger toggle exposes the full list as a vertical drawer.
  let mobileMenuOpen = $state(false);
  function toggleMobileMenu() {
    moreOpen = false;
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
  const onScience = $derived(page.url.pathname.includes('/science'));
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
      class:active={isActive(`${base}/`, page.url.pathname)}
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
          class:active={isActive(`${base}${item.path}`, page.url.pathname)}>{item.label()}</a
        >
      {:else if isTv}
        <!-- TV: the group is a plain link to its big-box hub (no dropdown). -->
        <a
          href={`${base}${localizeHref(item.hub)}`}
          class="link"
          class:active={groupActive(item, page.url.pathname)}>{item.label()}</a
        >
      {:else}
        <div class="nav-group">
          <button
            type="button"
            class="link group-trigger"
            class:active={groupActive(item, page.url.pathname)}
            aria-haspopup="true"
            aria-expanded={openGroup === item.key}
            onclick={() => toggleGroup(item.key)}
          >
            {item.label()}<span class="caret" aria-hidden="true">▾</span>
          </button>
          {#if openGroup === item.key}
            <div class="group-menu" role="menu" aria-label={item.label()}>
              {#each item.children as child (child.path + (child.query ?? ''))}
                <a
                  href={`${base}${localizeHref(child.path)}${child.query ?? ''}`}
                  role="menuitem"
                  class="group-menu-link"
                  class:active={childActive(child, page.url, $exploreContext)}
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
      class="nav-btn menu-toggle"
      aria-label={m.nav_mobile_menu_open_aria()}
      aria-expanded={mobileMenuOpen}
      aria-controls={mobileMenuOpen ? 'mobile-nav-drawer' : undefined}
      onclick={toggleMobileMenu}
    >
      <MenuIcon open={mobileMenuOpen} />
    </button>
    <button
      type="button"
      class="nav-btn audio-toggle"
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
      class="nav-btn lens-toggle"
      data-audio-stage="science-lens-toggle"
      class:active={scienceLens && scienceLensAvailable}
      disabled={!scienceLensAvailable}
      aria-disabled={!scienceLensAvailable}
      aria-label={scienceLensAvailable
        ? m.nav_science_lens_aria()
        : m.nav_unavailable_here({ label: m.nav_science_lens_aria() })}
      aria-pressed={scienceLens}
      title={scienceLensAvailable
        ? m.nav_science_lens_title()
        : m.nav_unavailable_here({ label: m.nav_science_lens_title() })}
      onclick={onToggleLens}
    >
      <!-- Inline SVG, not a Unicode glyph: the ⊙/⊕ characters render
           blank in some font stacks that don't carry them. SVG always
           draws. Outer ring + crosshair when on, just outer ring off. -->
      <ScienceLensIcon active={scienceLens} />
    </button>
    <!-- Unified settings ⚙ (2026-07-13). One always-available button opens the
         settings panel — Sound / Haptics / Tilt on every route, plus a Graphics
         quality section on 3D routes (gated by settingsState.available inside
         the panel). Merges the former sensory button + graphics gear. -->
    <button
      type="button"
      class="nav-btn settings-toggle"
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
    <!-- The rarely used actions (High contrast, Share, Debug) live behind this one
         menu button; the panel itself renders just after the nav, so the nav's
         roving arrows never reach its rows. On phones (≤600px) the same actions
         are drawer rows instead. -->
    <button
      type="button"
      class="nav-btn nav-more-trigger"
      class:active={moreOpen}
      aria-label={m.layout_footer_more()}
      aria-haspopup="menu"
      aria-expanded={moreOpen}
      aria-controls={moreOpen ? 'nav-more-menu' : undefined}
      title={m.layout_footer_more()}
      bind:this={moreTrigger}
      onclick={() => (moreOpen ? closeMore() : void openMore())}
      onkeydown={onMoreTriggerKeydown}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
        <circle cx="3" cy="8" r="1.4" />
        <circle cx="8" cy="8" r="1.4" />
        <circle cx="13" cy="8" r="1.4" />
      </svg>
    </button>
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

{#snippet moreRow(item: MoreItem, drawer: boolean)}
  <button
    type="button"
    class={drawer ? 'drawer-link drawer-more-row' : 'nav-more-item'}
    class:is-checked={item.checked?.()}
    data-more={item.id}
    role={drawer ? undefined : item.checked ? 'menuitemcheckbox' : 'menuitem'}
    aria-checked={!drawer && item.checked ? item.checked() : undefined}
    aria-pressed={drawer && item.checked ? item.checked() : undefined}
    tabindex={drawer ? undefined : -1}
    onclick={() => (drawer ? activateInDrawer(item) : activateMore(item))}
  >
    <span class="more-icon" aria-hidden="true">
      {#if item.id === 'contrast'}
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
        >
          <circle cx="8" cy="8" r="6" />
          <path d="M8 2a6 6 0 0 1 0 12Z" fill="currentColor" />
        </svg>
      {:else if item.id === 'share'}
        <ShareIcon />
      {:else}
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="8" y="6" width="8" height="12" rx="4" />
          <path
            d="M12 3v3M5 9h3M5 14h3M16 9h3M16 14h3M6.5 5.5 8 7M17.5 5.5 16 7M7 18l-1.5 2M17 18l1.5 2"
          />
        </svg>
      {/if}
    </span>
    <span class="more-label">{item.label()}</span>
    {#if item.checked}
      <span class="more-check" aria-hidden="true">
        {#if item.checked()}
          <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M3 8.5 6.5 12 13 4.5" />
          </svg>
        {/if}
      </span>
    {/if}
  </button>
{/snippet}

{#if moreOpen}
  <!-- Outside click closes the menu; the bar stays clickable above it, so the trigger can
       toggle it. Not a Tab stop: Tab leaves the menu through its focusout. -->
  <button
    type="button"
    class="nav-more-backdrop"
    data-exhibit-hide
    tabindex="-1"
    aria-hidden="true"
    onclick={() => closeMore()}
  ></button>
  <div
    id="nav-more-menu"
    class="nav-more-menu"
    data-exhibit-hide
    role="menu"
    tabindex="-1"
    aria-label={m.layout_footer_more()}
    bind:this={moreMenu}
    onkeydown={onMoreKeydown}
    onfocusout={onMoreFocusout}
  >
    {#each moreItems as item (item.id)}
      {@render moreRow(item, false)}
    {/each}
  </div>
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
          class:active={isActive(`${base}${item.path}`, page.url.pathname)}
          onclick={closeMobileMenu}>{item.label()}</a
        >
      {:else if isTv}
        <!-- TV: the group is a single link to its big-box hub — no inline
             children to D-pad past. -->
        <a
          href={`${base}${localizeHref(item.hub)}`}
          class="drawer-link"
          class:active={groupActive(item, page.url.pathname)}
          onclick={closeMobileMenu}>{item.label()}</a
        >
      {:else}
        <!-- Groups expand inline in the drawer: a non-interactive heading
             with its children indented beneath — every destination stays one
             tap away, no nested disclosure to fight on touch. -->
        <div class="drawer-group" role="group" aria-label={item.label()}>
          <span class="drawer-group-label">{item.label()}</span>
          {#each item.children as child (child.path + (child.query ?? ''))}
            <a
              href={`${base}${localizeHref(child.path)}${child.query ?? ''}`}
              class="drawer-link drawer-group-item"
              class:active={childActive(child, page.url, $exploreContext)}
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
    <!-- Locale + the More menu's actions (high contrast, share, debug) live in the
         drawer on phones (they don't fit the 375px top bar beside the 44px touch
         targets). The lens toggle stays in the bar as a primary feature. -->
    <div class="drawer-controls">
      <LocalePicker />
    </div>
    <div class="drawer-more" role="group" aria-label={m.layout_footer_more()}>
      {#each moreItems as item (item.id)}
        {@render moreRow(item, true)}
      {/each}
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
      <a class="drawer-link drawer-link-sm" href={localHref(`/credits`)} onclick={closeMobileMenu}
        >{m.layout_footer_credits()}</a
      >
      <a class="drawer-link drawer-link-sm" href={localHref(`/colophon`)} onclick={closeMobileMenu}
        >{m.layout_footer_colophon()}</a
      >
      <a class="drawer-link drawer-link-sm" href={localHref(`/library`)} onclick={closeMobileMenu}
        >{m.layout_footer_library()}</a
      >
      <a
        class="drawer-link drawer-link-sm"
        href={localHref(`/science/glossary`)}
        onclick={closeMobileMenu}>{m.layout_footer_glossary()}</a
      >
      <!-- License + README fold under an "About" sub-heading, mirroring the
           desktop footer's ABOUT hover-group (+layout.svelte). Designed to
           grow (imprint, privacy, …) alongside the desktop menu. -->
      <div class="drawer-about" role="group" aria-label={m.footer_about_aria()}>
        <span class="drawer-about-label">{m.layout_footer_about()}</span>
        <!-- Privacy carries the analytics opt-out toggle (ADR-092), so it has
             to be reachable on touch too — the desktop .site-footer is hidden
             on mobile, which would otherwise leave the opt-out URL-only. -->
        <a
          class="drawer-link drawer-link-sm drawer-about-item"
          href={localHref(`/privacy`)}
          onclick={closeMobileMenu}>{m.layout_footer_privacy()}</a
        >
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
      hreflang="en">v{displayVersion} · {__BUILD_TAG__}</a
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
  @media (hover: hover) and (pointer: fine) {
    .brand {
      min-height: 32px;
    }
  }
  .brand:hover,
  .brand:focus-visible {
    opacity: 0.85;
  }
  .brand:focus-visible {
    outline: 2px solid var(--color-accent, var(--color-focus));
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

  /* Long-locale crunch fix (measured 2026-08): at ~1100–1300px the seven
     top-level items in the wide locales (fr/es/pt-BR/ru) run right up to the
     control cluster — French essentially overflows at 1150px. Tighten the item
     padding in that band so the row always clears the controls; wide screens
     (≥1320px) keep the roomier 10px. Fine-pointer desktop only (≤640 / touch is
     the hamburger drawer, which is unaffected). */
  @media (min-width: 641px) and (max-width: 1319px) {
    .link {
      padding-left: 6px;
      padding-right: 6px;
    }
  }

  .link:hover {
    color: rgba(255, 255, 255, 0.85);
    border-color: rgba(255, 255, 255, 0.12);
  }

  .link.active {
    color: var(--color-text);
    background: color-mix(in srgb, var(--color-accent) 28%, transparent);
    border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
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
    font-size: max(var(--size-label), 0.7em);
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
    text-transform: uppercase;
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
    background: color-mix(in srgb, var(--color-accent) 28%, transparent);
    border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
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
    gap: 4px;
    flex-shrink: 0;
  }
  @media (hover: hover) and (pointer: fine) {
    .right {
      gap: 6px;
    }
  }

  /* One box for every right-hand control (UXD-016): the touch size by default, the compact
     one on a fine primary pointer. The look is the A4 chip's (chip.css): outline at rest,
     soft accent fill + accent edge + white glyph when on, hover lifts a control at rest only.
     Each toggle's own rule below carries state colours only. */
  .nav-btn {
    --nav-btn: var(--nav-btn-touch);
    box-sizing: border-box;
    inline-size: var(--nav-btn);
    block-size: var(--nav-btn);
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: var(--color-chip-glass);
    border: 1px solid var(--color-chip-edge);
    border-radius: 4px;
    color: var(--color-chip-text);
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  @media (hover: hover) and (pointer: fine) {
    .nav-btn {
      --nav-btn: var(--nav-btn-fine);
    }
  }
  .nav-btn :global(svg) {
    display: block;
  }
  .nav-btn:hover:not(:disabled, .active) {
    border-color: var(--color-state);
    color: var(--color-text);
  }
  .nav-btn:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: 2px;
  }
  .nav-btn.active {
    background: color-mix(in srgb, var(--color-accent) 22%, var(--color-chip-glass));
    border-color: var(--color-accent);
    color: var(--color-text);
  }
  .nav-btn:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  /* Science Lens toggle. a6-keep: gold is the lens's own "this route has lens content" state,
     not the accent. The button is disabled (no hover, no gold) on routes without lens
     content, and .active is only set where the lens is available (script). */
  .lens-toggle:hover:not(:disabled, .active) {
    border-color: rgba(255, 200, 80, 0.5);
    color: rgba(255, 200, 80, 0.95);
  }
  .lens-toggle.active {
    background: rgba(255, 200, 80, 0.18);
    border-color: rgba(255, 200, 80, 0.65);
    color: #ffc850;
  }

  /* Audio overlay toggle: a discreet pulse while audio.playing — bounded opacity wave on the
     icon stroke (PRD-016 S3 / RFC-019 §7.2). Animation suspended under
     prefers-reduced-motion so motion-sensitive users see only the border treatment. */
  .audio-toggle.playing {
    border-color: var(--color-accent-strong);
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
    border: 1px solid color-mix(in srgb, var(--color-accent) 50%, transparent);
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
    display: none;
  }

  /* The More menu (UXD-016): High contrast, Share and Debug behind one menu button. Rendered
     outside <nav> (like the drawer) so the nav's roving arrows never reach its rows; same
     chrome as .group-menu so the bar has one dropdown look. Above the DebugPanel and the
     settings sheet (z 90), which open from the same top-right corner. */
  .nav-more-backdrop {
    position: fixed;
    inset: var(--nav-height) 0 0 0;
    z-index: 91;
    background: transparent;
    border: none;
    cursor: default;
  }
  .nav-more-menu {
    position: fixed;
    top: calc(var(--nav-height) + 6px);
    inset-inline-end: 24px;
    z-index: 92;
    box-sizing: border-box;
    min-inline-size: 220px;
    max-inline-size: min(320px, calc(100vw - 16px));
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px;
    background: var(--color-nav-bg);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  }
  .nav-more-item {
    display: flex;
    align-items: center;
    gap: 10px;
    box-sizing: border-box;
    inline-size: 100%;
    min-block-size: var(--nav-btn-touch);
    padding: 6px 10px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    color: var(--color-chip-text);
    font-family: var(--font-mono);
    font-size: var(--size-meta);
    font-weight: 700;
    letter-spacing: 1px;
    line-height: 1.3;
    text-align: start;
    cursor: pointer;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  @media (hover: hover) and (pointer: fine) {
    .nav-more-item {
      min-block-size: var(--nav-btn-fine);
    }
  }
  .nav-more-item:hover,
  .nav-more-item:focus-visible {
    background: var(--color-accent-soft);
    border-color: var(--color-chip-edge);
    color: var(--color-text);
  }
  .nav-more-item:focus-visible {
    outline: 2px solid var(--color-focus);
    outline-offset: -2px;
  }
  .more-icon {
    flex: none;
    display: inline-flex;
  }
  .more-label {
    flex: 1;
    min-inline-size: 0;
    overflow-wrap: anywhere;
  }
  .more-check {
    flex: none;
    inline-size: 16px;
    block-size: 16px;
    color: var(--color-state);
  }
  .is-checked {
    color: var(--color-text);
  }
  /* a6-keep: debug orange is the debug overlays' own "on" colour, not the accent. */
  .is-checked[data-more='debug'] .more-icon,
  .is-checked[data-more='debug'] .more-check {
    color: #f6ad55;
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
  /* The locale picker, moved out of the top bar on phones — the same component, just
     relocated. Only the row that positions it. */
  .drawer-controls {
    /* Hidden by default — only phones (≤600px) move the locale picker and the More
       menu's actions in here; wider touch screens keep them in the bar. */
    display: none;
    align-items: center;
    gap: 10px;
    padding: 12px 18px;
    border-top: 1px solid var(--color-border);
    margin-top: 4px;
  }
  /* The More menu's three actions on phones: the same list as the bar menu, as drawer rows. */
  .drawer-more {
    display: none;
  }
  .drawer-more-row {
    display: flex;
    align-items: center;
    gap: 10px;
    box-sizing: border-box;
    inline-size: 100%;
    min-block-size: var(--nav-btn-touch);
    background: transparent;
    border: none;
    border-left: 3px solid transparent;
    font-family: inherit;
    text-align: start;
    cursor: pointer;
  }
  .drawer-more-row.is-checked {
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    border-left-color: color-mix(in srgb, var(--color-accent) 85%, transparent);
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
    color: var(--color-text-label);
  }
  .drawer-group-item {
    padding-left: 32px;
    text-transform: uppercase;
  }
  .drawer-link:hover,
  .drawer-link:focus-visible {
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.95);
    outline: none;
  }
  .drawer-link.active {
    color: var(--color-text);
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    border-left-color: color-mix(in srgb, var(--color-accent) 85%, transparent);
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
     strip when it can't fit / doesn't belong: desktop windows too narrow for
     the whole bar OR any touch device (a landscape phone is wide but still
     wants the touch menu, and its inline strip was a cramped horizontal
     scroller). Keyed on capability, not width, so the footer-in-drawer section
     reaches every touch size (0.7.2 model).
     Width: the inline bar needed 1210 px in the widest locale (ru; fr / es 1165,
     en 1038 — measured 2026-11-04 with the old 392 px, seven-control cluster). The
     compact cluster is ~200 px narrower; the break stays at 1219 until the 14-locale
     measurement (tests/e2e/nav-controls.spec.ts) says where it can move (UXD-016). */
  @media (max-width: 1219px), (pointer: coarse) {
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 1px;
    color: var(--color-text-label);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    color: var(--color-text-label);
  }
  .drawer-about-item {
    padding-left: 32px;
  }
  /* Version chip pinned at the drawer bottom, dimmer than the about links. */
  .drawer-version {
    display: block;
    padding: 10px 18px 12px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    color: var(--color-text-label);
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
  }

  /* Up to 600 px the cluster + the hamburger does not fit beside the brand at 44 px, so the
     locale picker and the More menu's three actions move into the drawer. */
  @media (max-width: 600px) {
    /* Keep every target at 44 px on a 375 px bar: audio, lens, settings and the hamburger
       stay. The lens toggle is a primary feature; the unified settings ⚙ is the ONLY way to
       reach sound/haptics/tilt on mobile. */
    .right {
      gap: 2px;
    }
    .right :global(.locale-picker),
    .right .nav-more-trigger,
    .nav-more-menu,
    .nav-more-backdrop {
      display: none;
    }
    /* ...and surface them in the drawer instead. On wider touch screens
       (landscape) the bar has room, so the cluster stays inline there and the
       drawer rows are hidden (base rule) — no duplication. */
    .drawer-controls {
      display: flex;
    }
    .drawer-more {
      display: block;
    }
  }
</style>

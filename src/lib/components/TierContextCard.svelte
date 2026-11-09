<!--
  Tier-context attribution card for surface-map routes (#42).

  Lives in the bottom-left of /moon + /mars whenever the LOD dispatcher
  hands the camera a tier with published imagery. One stacked block per
  active layer; the bottom block also carries the published positional
  uncertainty (±N m) when known.

  scaleNote is an optional trailing block — Mars uses it for the
  "CTX disc 10 km, HiRISE disc 500 m, not to scale" caveat; Moon
  doesn't need it (single regional source per site).
-->
<script lang="ts">
  import type { TierContext } from '$lib/surface-map/tier-context';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    tierContext: TierContext;
    scaleNote?: string;
    /** /science page that explains the imagery layers (Moon / Mars only). */
    howItWorksHref?: string;
  }
  let { tierContext, scaleNote, howItWorksHref }: Props = $props();

  // Phone starts collapsed, desktop open; only a choice the viewer made is remembered.
  const STORE_KEY = 'orrery.surface.tierCardExpanded';
  function initialExpanded(): boolean {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved === '1') return true;
      if (saved === '0') return false;
    } catch {
      /* storage blocked: fall through to the default */
    }
    const phone =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(hover: none), (pointer: coarse)').matches;
    return !phone;
  }
  let expanded = $state(initialExpanded());
  function toggle() {
    expanded = !expanded;
    try {
      localStorage.setItem(STORE_KEY, expanded ? '1' : '0');
    } catch {
      /* storage blocked: state lives for this view only */
    }
  }
</script>

<div class="tier-context-card" class:tcc-collapsed={!expanded} aria-live="polite">
  <div class="tcc-head">
    <span class="tcc-site">{tierContext.siteName}</span>
    <span class="tcc-chip" style="color: {tierContext.nationColor};">{tierContext.nation}</span>
    <button
      type="button"
      class="tcc-toggle"
      aria-expanded={expanded}
      aria-controls="tcc-body"
      aria-label={expanded ? m.surface_card_collapse_aria() : m.surface_card_expand_aria()}
      onclick={toggle}
    >
      <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
    </button>
  </div>
  <div id="tcc-body" hidden={!expanded}>
    {#if tierContext.missionContext}
      <div class="tcc-mission">{tierContext.missionContext}</div>
    {/if}
    {#each tierContext.layers as layer, i (layer.layerLabel)}
      <div class="tcc-layer-block" class:tcc-layer-block-next={i > 0}>
        <div class="tcc-layer">{layer.layerLabel} · {layer.resolutionText}</div>
        <div class="tcc-source">{layer.sourceTitle}</div>
        <div class="tcc-author">{layer.sourceAuthor}</div>
        <div class="tcc-footer">
          <span class="tcc-license">{layer.licenseShort}</span>
          {#if layer.uncertaintyM != null}
            <span class="tcc-uncertainty">±{m.unit_m_value({ value: layer.uncertaintyM })}</span>
          {:else if i === tierContext.layers.length - 1 && tierContext.uncertaintyM != null}
            <span class="tcc-uncertainty">±{tierContext.uncertaintyM} m</span>
          {/if}
          {#if layer.sourceUrl}
            <a
              class="tcc-link"
              href={layer.sourceUrl}
              target="_blank"
              rel="noopener noreferrer external"
              title={m.source_open_new_tab_title()}>{m.link_source()}</a
            >
          {/if}
        </div>
      </div>
    {/each}
    {#if tierContext.locationUnconfirmed}
      <div class="tcc-scale-note" data-testid="tcc-location-unconfirmed">
        {m.surface_location_unconfirmed()}
      </div>
    {/if}
    {#if scaleNote}
      <div class="tcc-scale-note">{scaleNote}</div>
    {/if}
    {#if howItWorksHref}
      <a class="tcc-how" href={howItWorksHref}>{m.surface_how_this_works()}</a>
    {/if}
  </div>
</div>

<style>
  .tier-context-card {
    position: absolute;
    left: 12px;
    /* Above the nation legend (and the route's locate button) when the
       scene sets --card-bottom. */
    bottom: var(--card-bottom, 56px);
    /* Over the layer chips (.hud-controls, z 35 on desktop) — while a site is in
       detail the imagery card is what the user is reading. */
    z-index: 36;
    max-width: 360px;
    padding: 10px 14px;
    background: rgba(8, 10, 22, 0.86);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 6px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(6px);
    animation: tcc-fade-in 600ms ease-out;
  }
  .tcc-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 4px;
  }
  .tcc-collapsed .tcc-head {
    margin-bottom: 0;
  }
  .tcc-toggle {
    flex: none;
    min-width: 44px;
    min-height: 44px;
    margin: -14px -10px -14px 0;
    padding: 0;
    background: none;
    border: 0;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.7);
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  .tcc-toggle:hover,
  .tcc-toggle:focus-visible {
    color: #889fe7;
    background: rgba(136, 159, 231, 0.1);
    outline: none;
  }
  .tcc-head > .tcc-chip {
    margin-left: auto;
  }
  .tcc-site {
    font-size: 13px;
    color: #fff;
    letter-spacing: 0.5px;
  }
  .tcc-chip {
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .tcc-mission {
    color: rgba(255, 255, 255, 0.6);
    font-size: 10px;
    margin-bottom: 6px;
  }
  .tcc-layer-block-next {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .tcc-layer {
    color: #4ecdc4;
    letter-spacing: 1px;
    text-transform: uppercase;
    font-size: 10px;
    margin-bottom: 4px;
  }
  .tcc-source {
    color: rgba(255, 255, 255, 0.9);
    font-size: 11px;
  }
  .tcc-author {
    color: rgba(255, 255, 255, 0.55);
    font-size: 10px;
    margin-bottom: 6px;
  }
  .tcc-footer {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
  }
  .tcc-license {
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 3px;
    padding: 1px 6px;
    letter-spacing: 0.5px;
  }
  .tcc-uncertainty {
    color: rgba(255, 200, 100, 0.7);
  }
  .tcc-link {
    margin-left: auto;
    color: rgba(78, 205, 196, 0.85);
    text-decoration: none;
  }
  .tcc-link:hover {
    text-decoration: underline;
  }
  .tcc-how {
    display: inline-block;
    margin-top: 8px;
    font-size: 10px;
    color: rgba(78, 205, 196, 0.85);
    text-decoration: none;
  }
  .tcc-how:hover {
    text-decoration: underline;
  }
  .tcc-scale-note {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 9.5px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.45);
    font-style: italic;
  }
  @keyframes tcc-fade-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  /* Phone: the bottom bar (above the tab row) sits under the card; in the flat
     ground view the bar is lower and has no tab row. */
  @media (hover: none), (pointer: coarse) {
    .tier-context-card {
      bottom: var(--card-bottom, calc(104px + env(safe-area-inset-bottom, 0px)));
    }
    :global(html[data-surface-flat]) .tier-context-card {
      bottom: calc(54px + env(safe-area-inset-bottom, 0px));
    }
  }
  /* Narrow window with a mouse: the detail panel (z 30) spans the window,
     so the card goes under it with the rest of the scene HUD. */
  @media (hover: hover) and (pointer: fine) and (max-width: 600px) {
    .tier-context-card {
      z-index: 25;
    }
  }
</style>

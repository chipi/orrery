<!--
  StarPanel — detail panel for a curated named star in /explore v2 (Slice 1).
  Uses the shared Panel wrapper + the detail-panel family conventions (.head /
  .kind / .name, .tabs, .grid cells, .learn-list — same look as Planet / Small-
  Body / Satellite panels), adjusted for a star. Facts come from the HYG base
  record; description / cultural note / library come from the per-locale overlay.
  Field labels are English for now (i18n in Slice 1 Part 5, like the scale HUD).
-->
<script lang="ts">
  import Panel from './Panel.svelte';
  import LearnLink from './LearnLink.svelte';
  import StarPortrait from './StarPortrait.svelte';
  import { constellationName } from '$lib/universe/iau-constellations';
  import { bvToRgb } from '$lib/universe/bv-to-rgb';
  import type { LocalizedNamedStar } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Tab = 'overview' | 'technical';
  type Props = {
    star: LocalizedNamedStar | null;
    open: boolean;
    onClose: () => void;
  };
  let { star, open, onClose }: Props = $props();

  const PC_TO_LY = 3.2615638;
  let tab = $state<Tab>('overview');

  let title = $derived(star ? (star.name ?? star.proper) : '');
  let swatch = $derived.by(() => {
    if (!star || star.bv === null) return 'rgb(255,255,255)';
    const [r, g, b] = bvToRgb(star.bv);
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  });
  let distLy = $derived(star ? star.dist_pc * PC_TO_LY : 0);
  const fmt = (n: number, dp = 2): string =>
    n.toLocaleString(undefined, { maximumFractionDigits: dp });

  type LibItem = NonNullable<LocalizedNamedStar['library']>[number];
  let library = $derived.by(() => {
    const order = { intro: 0, core: 1, deep: 2 } as const;
    return [...(star?.library ?? [])].sort((a, b) => order[a.tier] - order[b.tier]) as LibItem[];
  });

  // Reset to overview when a different star is selected.
  let lastId = $state<string | null>(null);
  $effect(() => {
    if (star && star.id !== lastId) {
      lastId = star.id;
      tab = 'overview';
    }
  });
</script>

<Panel {open} {onClose} {title}>
  {#if star}
    <div class="head" style:--accent={swatch}>
      <div class="kind-row">
        <span class="swatch" style:background={swatch} aria-hidden="true"></span>
        <span class="kind">
          {star.spect ?? ''}{star.spect && star.con ? ' · ' : ''}{constellationName(star.con)}
        </span>
      </div>
      <div class="name">{star.name ?? star.proper}</div>
    </div>

    <div class="panel-hero star-hero">
      <StarPortrait bv={star.bv} spect={star.spect} absmag={star.absmag} />
      <p class="hero-caption">Representation · colour from catalogued B−V</p>
    </div>

    <div class="tabs" role="tablist">
      <button
        type="button"
        id="star-tab-overview"
        class:active={tab === 'overview'}
        onclick={() => (tab = 'overview')}
        role="tab"
        aria-selected={tab === 'overview'}
        aria-controls="star-tabpanel">{m.panel_tab_overview()}</button
      >
      <button
        type="button"
        id="star-tab-technical"
        class:active={tab === 'technical'}
        onclick={() => (tab = 'technical')}
        role="tab"
        aria-selected={tab === 'technical'}
        aria-controls="star-tabpanel">{m.panel_tab_technical()}</button
      >
    </div>

    <div class="tab-content" role="tabpanel" id="star-tabpanel" aria-labelledby="star-tab-{tab}">
      {#if tab === 'overview'}
        {#if star.fact}<p class="editorial">{star.fact}</p>{/if}
        {#if star.bio}<p class="prose">{star.bio}</p>{/if}
        {#if star.cultural}
          <h3 class="library-heading">ACROSS CULTURES</h3>
          <p class="prose">{star.cultural}</p>
        {/if}
        {#if !star.fact && !star.bio && !star.cultural}
          <p class="editorial empty">A real star in the solar neighbourhood.</p>
        {/if}
      {:else}
        <div class="grid">
          <div class="cell">
            <div class="cell-label">DISTANCE</div>
            <div class="cell-value teal">{fmt(distLy, 2)} ly</div>
          </div>
          <div class="cell">
            <div class="cell-label">DISTANCE (PC)</div>
            <div class="cell-value">{fmt(star.dist_pc, 2)} pc</div>
          </div>
          <div class="cell">
            <div class="cell-label">APPARENT MAGNITUDE</div>
            <div class="cell-value">{fmt(star.mag, 2)}</div>
          </div>
          <div class="cell">
            <div class="cell-label">ABSOLUTE MAGNITUDE</div>
            <div class="cell-value">{fmt(star.absmag, 2)}</div>
          </div>
          {#if star.spect}
            <div class="cell">
              <div class="cell-label">SPECTRAL CLASS</div>
              <div class="cell-value">{star.spect}</div>
            </div>
          {/if}
          {#if star.con}
            <div class="cell">
              <div class="cell-label">CONSTELLATION</div>
              <div class="cell-value">{constellationName(star.con)}</div>
            </div>
          {/if}
          {#if star.hip}
            <div class="cell">
              <div class="cell-label">CATALOGUE</div>
              <div class="cell-value">HIP {star.hip}</div>
            </div>
          {/if}
        </div>

        {#if library.length > 0}
          <div class="science-library">
            <h3 class="library-heading">LEARN MORE</h3>
            <ul class="learn-list">
              {#each library as l (l.id)}
                <li><LearnLink entityId={star.id} url={l.url} label={l.label} /></li>
              {/each}
            </ul>
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</Panel>

<style>
  .head {
    padding: 0 0 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .star-hero {
    margin-bottom: 12px;
  }
  .hero-caption {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    margin: 4px 0 0;
  }
  .kind-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    box-shadow: 0 0 8px 1px currentColor;
    flex: 0 0 auto;
  }
  .kind {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: var(--accent, rgba(255, 255, 255, 0.6));
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 6px 0 12px;
  }
  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
    margin: 0 0 12px;
  }
  .editorial.empty {
    color: rgba(255, 255, 255, 0.4);
  }
  .prose {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.82);
    margin: 0 0 12px;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 16px;
  }
  .cell-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 2px;
  }
  .cell-value {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.92);
  }
  .cell-value.teal {
    color: #4ecdc4;
  }
  .science-library {
    margin-top: 16px;
  }
  .learn-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .learn-list :global(a) {
    color: #4ecdc4;
    text-decoration: none;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    padding: 8px 10px;
    background: rgba(78, 205, 196, 0.06);
    border: 1px solid rgba(78, 205, 196, 0.25);
    border-radius: 3px;
    display: block;
  }
  .learn-list :global(a:hover),
  .learn-list :global(a:focus-visible) {
    background: rgba(78, 205, 196, 0.14);
    border-color: rgba(78, 205, 196, 0.5);
    outline: none;
  }
</style>

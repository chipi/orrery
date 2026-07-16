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
  import CultureDoorCard from './CultureDoorCard.svelte';
  import type { LocalizedCultureDoor } from '$lib/data';
  import StarPortrait from './StarPortrait.svelte';
  import ConstellationFinder from './ConstellationFinder.svelte';
  import ImageCredit from './ImageCredit.svelte';
  import WhyPopover from './WhyPopover.svelte';
  import { base } from '$app/paths';
  import { constellationName } from '$lib/universe/iau-constellations';
  import { bvToRgb, bvToKelvin } from '$lib/universe/bv-to-rgb';
  import { colorNameForKelvin } from '$lib/universe/anonymous-star';
  import { getConstellationLines, type LocalizedNamedStar } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Tab = 'overview' | 'technical';
  type Props = {
    star: LocalizedNamedStar | null;
    cultureDoors?: LocalizedCultureDoor[];
    open: boolean;
    hasSystem?: boolean;
    onEnterSystem?: () => void;
    onClose: () => void;
  };
  let {
    star,
    open,
    hasSystem = false,
    onEnterSystem,
    cultureDoors = [],
    onClose,
  }: Props = $props();

  const PC_TO_LY = 3.2615638;
  let tab = $state<Tab>('overview');

  let title = $derived(star ? (star.name ?? star.proper) : '');
  let swatch = $derived.by(() => {
    if (!star || star.bv === null) return 'rgb(255,255,255)';
    const [r, g, b] = bvToRgb(star.bv);
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  });
  let distLy = $derived(star ? star.dist_pc * PC_TO_LY : 0);
  let kelvin = $derived(star && star.bv !== null ? Math.round(bvToKelvin(star.bv)) : null);
  let colorName = $derived(kelvin !== null ? colorNameForKelvin(kelvin) : null);
  let colorLabel = $derived.by(() => {
    switch (colorName) {
      case 'blue-white':
        return m.star_color_blue_white();
      case 'white':
        return m.star_color_white();
      case 'yellow-white':
        return m.star_color_yellow_white();
      case 'yellow':
        return m.star_color_yellow();
      case 'orange':
        return m.star_color_orange();
      case 'red':
        return m.star_color_red();
      default:
        return colorName ?? '';
    }
  });
  const fmt = (n: number, dp = 2): string =>
    n.toLocaleString(undefined, { maximumFractionDigits: dp });

  type LinkItem = NonNullable<LocalizedNamedStar['links']>[number];
  let library = $derived.by(() => {
    const order = { intro: 0, core: 1, deep: 2 } as const;
    return [...(star?.links ?? [])].sort((a, b) => order[a.t] - order[b.t]) as LinkItem[];
  });

  // Reset to overview + load the constellation figure when a different star is selected.
  let lastId = $state<string | null>(null);
  let conVertices = $state<number[] | null>(null);
  $effect(() => {
    if (star && star.id !== lastId) {
      lastId = star.id;
      tab = 'overview';
      conVertices = null;
      const con = star.con;
      const forId = star.id;
      if (con) {
        void getConstellationLines().then((all) => {
          if (star && star.id === forId)
            conVertices = all.find((c) => c.con === con)?.vertices ?? null;
        });
      }
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

    {#if hasSystem}
      <button type="button" class="enter-system" onclick={() => onEnterSystem?.()}>
        {m.star_enter_system()}
      </button>
    {/if}

    {#if star.photo}
      <div class="panel-hero star-hero">
        <img
          class="real-photo"
          src="{base}{star.photo.src}"
          alt={star.name ?? star.proper}
          decoding="async"
        />
        <p class="hero-caption">
          {star.photo.kind === 'artist' ? m.star_photo_artist() : m.star_photo_real()} ·
        </p>
        <ImageCredit src={star.photo.src} />
      </div>
    {/if}

    <div class="panel-hero star-hero">
      <StarPortrait bv={star.bv} spect={star.spect} absmag={star.absmag} />
      <p class="hero-caption">{m.star_portrait_caption()}</p>
    </div>

    {#if conVertices && star.con}
      <div class="star-finder">
        <ConstellationFinder
          vertices={conVertices}
          starXYZ={[star.x, star.y, star.z]}
          label={constellationName(star.con)}
        />
        <p class="hero-caption">{m.star_finder_caption({ con: constellationName(star.con) })}</p>
      </div>
    {/if}

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
          <h3 class="library-heading">{m.star_across_cultures()}</h3>
          <p class="prose">{star.cultural}</p>
        {/if}
        {#if !star.fact && !star.bio && !star.cultural}
          <p class="editorial empty">{m.star_empty()}</p>
        {/if}
        {#if cultureDoors.length > 0}
          <h3 class="library-heading">{m.culture_heading()}</h3>
          {#each cultureDoors as door (door.id)}
            <CultureDoorCard {door} />
          {/each}
        {/if}
      {:else}
        <div class="grid">
          {#if colorName && kelvin !== null}
            <div class="cell">
              <div class="cell-label">
                {m.star_label_colour()}<WhyPopover
                  title={m.star_why_colour_title()}
                  body={m.star_why_colour_body()}
                />
              </div>
              <div class="cell-value">
                <span class="c-swatch" style:background={swatch} aria-hidden="true"></span>
                {colorLabel} · ~{kelvin.toLocaleString()} K
              </div>
            </div>
          {/if}
          <div class="cell">
            <div class="cell-label">{m.star_label_distance()}</div>
            <div class="cell-value teal">{fmt(distLy, 2)} ly</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.star_label_distance_pc()}</div>
            <div class="cell-value">{fmt(star.dist_pc, 2)} pc</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.star_label_apparent_mag()}</div>
            <div class="cell-value">{fmt(star.mag, 2)}</div>
          </div>
          <div class="cell">
            <div class="cell-label">{m.star_label_absolute_mag()}</div>
            <div class="cell-value">{fmt(star.absmag, 2)}</div>
          </div>
          {#if star.spect}
            <div class="cell">
              <div class="cell-label">{m.sun_label_spectral_class()}</div>
              <div class="cell-value">{star.spect}</div>
            </div>
          {/if}
          {#if star.con}
            <div class="cell">
              <div class="cell-label">{m.star_label_constellation()}</div>
              <div class="cell-value">{constellationName(star.con)}</div>
            </div>
          {/if}
          {#if star.hip}
            <div class="cell">
              <div class="cell-label">{m.star_label_catalogue()}</div>
              <div class="cell-value">HIP {star.hip}</div>
            </div>
          {/if}
        </div>

        <!-- Every star panel links into the stellar-science article (S7 H–R lens). -->
        <a class="hr-article-link" href="{base}/science/observation/hertzsprung-russell">
          {m.star_hr_article_link()} →
        </a>

        {#if library.length > 0}
          <div class="science-library">
            <h3 class="library-heading">{m.science_learn_more()}</h3>
            <ul class="learn-list">
              {#each library as l (l.u)}
                <li><LearnLink entityId={star.id} url={l.u} label={l.l} /></li>
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
  .enter-system {
    display: block;
    width: 100%;
    margin: 0 0 12px;
    padding: 10px 12px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #4ecdc4;
    background: rgba(78, 205, 196, 0.1);
    border: 1px solid rgba(78, 205, 196, 0.4);
    border-radius: 4px;
    cursor: pointer;
    transition:
      background 0.15s,
      border-color 0.15s;
  }
  .enter-system:hover,
  .enter-system:focus-visible {
    background: rgba(78, 205, 196, 0.2);
    border-color: rgba(78, 205, 196, 0.7);
    outline: none;
  }
  .star-hero {
    margin-bottom: 12px;
  }
  .real-photo {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 4px;
    background: #04060d;
  }
  .star-finder {
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
  .c-swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    box-shadow: 0 0 6px 1px currentColor;
    vertical-align: baseline;
    margin-right: 4px;
  }
  .hr-article-link {
    display: inline-block;
    margin-top: 14px;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.5px;
    color: #4ecdc4;
    text-decoration: none;
    border-bottom: 1px dotted rgba(78, 205, 196, 0.4);
  }
  .hr-article-link:hover,
  .hr-article-link:focus-visible {
    border-bottom-color: #4ecdc4;
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

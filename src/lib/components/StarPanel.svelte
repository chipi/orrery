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
  import { getConstellationLines, type LocalizedNamedStar, type ExoplanetSystem } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Tab = 'overview' | 'technical' | 'system';
  type Props = {
    star: LocalizedNamedStar | null;
    cultureDoors?: LocalizedCultureDoor[];
    open: boolean;
    hasSystem?: boolean;
    system?: ExoplanetSystem | null;
    onEnterSystem?: () => void;
    onClose: () => void;
  };
  let {
    star,
    open,
    hasSystem = false,
    system = null,
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

  // Mini top-down schematic of the host's planetary system for the System tab:
  // orbit rings spread by rank (so tight real systems stay legible) + a dot per
  // planet sized by radius, angles fanned so dots don't stack on one another.
  let systemView = $derived.by(() => {
    if (!system) return [];
    const n = system.planets.length;
    const cx = 120;
    const cy = 60;
    const inner = 26;
    const outer = 104;
    return system.planets.map((p, i) => {
      const rx = n <= 1 ? 62 : inner + (i / (n - 1)) * (outer - inner);
      const ry = rx * 0.4;
      const ang = -0.7 + i * 1.9;
      const r = p.radius_earth ?? 1;
      // Warm rocky → teal sub-Neptune → blue giant, for a little visual variety.
      const color = r < 1.6 ? '#ffc39a' : r < 4 ? '#8fe6d8' : '#a9c8ff';
      return {
        rx,
        ry,
        px: cx + rx * Math.cos(ang),
        py: cy + ry * Math.sin(ang),
        rad: Math.max(2.2, Math.min(5.5, r * 2.2)),
        color,
        letter: p.letter,
        id: p.id,
      };
    });
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
      {#if hasSystem && system}
        <button
          type="button"
          id="star-tab-system"
          class:active={tab === 'system'}
          onclick={() => (tab = 'system')}
          role="tab"
          aria-selected={tab === 'system'}
          aria-controls="star-tabpanel">{m.star_tab_system()}</button
        >
      {/if}
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
      {:else if tab === 'system' && system}
        <div class="system-schematic">
          <svg viewBox="0 0 240 124" role="img" aria-label={m.star_tab_system()}>
            <defs>
              <radialGradient id="host-glow">
                <stop offset="0%" stop-color={swatch} stop-opacity="1" />
                <stop offset="35%" stop-color={swatch} stop-opacity="0.55" />
                <stop offset="100%" stop-color={swatch} stop-opacity="0" />
              </radialGradient>
              <radialGradient id="plane-wash" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#1a2c55" stop-opacity="0.55" />
                <stop offset="100%" stop-color="#0a1024" stop-opacity="0" />
              </radialGradient>
              <filter id="pl-glow" x="-160%" y="-160%" width="420%" height="420%">
                <feGaussianBlur stdDeviation="1.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <ellipse cx="120" cy="62" rx="116" ry="52" fill="url(#plane-wash)" />
            {#each systemView as o (o.id)}
              <ellipse cx="120" cy="60" rx={o.rx} ry={o.ry} class="orbit" />
            {/each}
            <circle cx="120" cy="60" r="30" fill="url(#host-glow)" />
            <circle cx="120" cy="60" r="5" fill={swatch} class="host-core" filter="url(#pl-glow)" />
            {#each systemView as o (o.id)}
              <circle cx={o.px} cy={o.py} r={o.rad + 1.4} fill={o.color} opacity="0.28" />
              <circle
                cx={o.px}
                cy={o.py}
                r={o.rad}
                fill={o.color}
                filter="url(#pl-glow)"
                class="planet-dot"
              />
              <text x={o.px} y={o.py - o.rad - 3} class="dot-label">{o.letter}</text>
            {/each}
          </svg>
        </div>
        <p class="editorial">{m.star_system_planet_count({ count: system.planets.length })}</p>
        <ul class="planet-list">
          {#each system.planets as p (p.id)}
            <li class="planet-row">
              <span class="pl-letter" aria-hidden="true">{p.letter}</span>
              <span class="pl-body">
                <span class="pl-name">{p.name}</span>
                <span class="pl-facts">
                  {#if p.radius_earth}{fmt(p.radius_earth, 2)} R⊕ ·
                  {/if}{p.period_days < 10 ? fmt(p.period_days, 2) : fmt(p.period_days, 0)} d{#if p.disc_year}
                    · {p.disc_year}{/if}
                </span>
              </span>
            </li>
          {/each}
        </ul>
        <button type="button" class="enter-system mt" onclick={() => onEnterSystem?.()}>
          {m.star_enter_system()}
        </button>
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
  .enter-system.mt {
    margin-top: 14px;
  }
  .system-schematic {
    position: relative;
    background:
      radial-gradient(ellipse at 50% 42%, rgba(26, 40, 78, 0.55), rgba(4, 7, 16, 0.85) 70%), #04060d;
    border: 1px solid rgba(120, 160, 255, 0.16);
    border-radius: 10px;
    padding: 4px;
    margin-bottom: 12px;
    overflow: hidden;
    box-shadow:
      inset 0 0 32px rgba(0, 0, 0, 0.6),
      0 4px 16px rgba(0, 0, 0, 0.4);
  }
  .system-schematic svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .system-schematic .orbit {
    fill: none;
    stroke: rgba(150, 200, 255, 0.22);
    stroke-width: 0.5;
  }
  .system-schematic .dot-label {
    fill: rgba(210, 232, 255, 0.75);
    font-family: 'Space Mono', monospace;
    font-size: 6.5px;
    letter-spacing: 0.5px;
    text-anchor: middle;
  }
  .planet-list {
    list-style: none;
    padding: 0;
    margin: 4px 0 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .planet-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(78, 205, 196, 0.05);
    border: 1px solid rgba(78, 205, 196, 0.16);
    border-radius: 4px;
  }
  .pl-letter {
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    font-weight: 700;
    color: #4ecdc4;
    min-width: 14px;
  }
  .pl-body {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .pl-name {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.92);
  }
  .pl-facts {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.5px;
    color: rgba(159, 232, 226, 0.85);
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

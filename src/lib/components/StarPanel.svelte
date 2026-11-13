<!--
  StarPanel — detail panel for a curated named star in /explore v2 (Slice 1).
  On the shared UniversePanelBody (B3, UXD-008 and UXD-023): ONE hero (the photo, else the drawn
  portrait), tabs OVERVIEW · GALLERY (two or more images) · IN THE SKY (the constellation finder,
  the constellation named, the zodiac note, the lines action) · SYSTEM · TECHNICAL. Facts come
  from the HYG base record; description / cultural note / library come from the per-locale overlay.
-->
<script lang="ts">
  import UniversePanelBody from './UniversePanelBody.svelte';
  import UniverseFacts, { type Fact } from './UniverseFacts.svelte';
  import Chip from './Chip.svelte';
  import { localHref } from '$lib/locale';
  import LearnLink from './LearnLink.svelte';
  import CultureDoorCard from './CultureDoorCard.svelte';
  import type { LocalizedCultureDoor } from '$lib/data';
  import StarPortrait from './StarPortrait.svelte';
  import ConstellationFinder from './ConstellationFinder.svelte';
  import { constellationName, isZodiacConstellation } from '$lib/universe/iau-constellations';
  import { isScienceLensOn, toggleScienceLens } from '$lib/science-lens';
  import { setLayer } from '$lib/science-layers';
  import { bvToRgb, bvToKelvin } from '$lib/universe/bv-to-rgb';
  import { colorNameForKelvin } from '$lib/universe/anonymous-star';
  import {
    getConstellationLines,
    getNamedStarGallery,
    type LocalizedNamedStar,
    type ExoplanetSystem,
  } from '$lib/data';
  import * as m from '$lib/paraglide/messages';
  import { getLocale } from '$lib/paraglide/runtime';
  import { planetCountLabel } from '$lib/plural';
  import { dataLoadFailed } from '$lib/data/core';

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
    n.toLocaleString(getLocale(), { maximumFractionDigits: dp });

  type LinkItem = NonNullable<LocalizedNamedStar['links']>[number];
  let library = $derived.by(() => {
    const order = { intro: 0, core: 1, deep: 2 } as const;
    return [...(star?.links ?? [])].sort((a, b) => order[a.t] - order[b.t]) as LinkItem[];
  });

  // Load the constellation figure and the star's further images when a different star is selected.
  let lastId = $state<string | null>(null);
  let conVertices = $state<number[] | null>(null);
  let extraImages = $state<string[]>([]);
  $effect(() => {
    if (star && star.id !== lastId) {
      lastId = star.id;
      conVertices = null;
      extraImages = [];
      const con = star.con;
      const forId = star.id;
      void getNamedStarGallery(forId)
        .then((imgs) => {
          if (star && star.id === forId) extraImages = imgs.map((i) => i.src);
        })
        .catch(dataLoadFailed);
      if (con) {
        void getConstellationLines()
          .then((all) => {
            if (star && star.id === forId)
              conVertices = all.find((c) => c.con === con)?.vertices ?? null;
          })
          .catch(dataLoadFailed);
      }
    }
  });

  let gallery = $derived(star?.photo ? [star.photo.src, ...extraImages] : extraImages);
  let hero = $derived(star?.photo ? { src: star.photo.src, full: star.photo.src } : null);
  let zodiac = $derived(isZodiacConstellation(star?.con));

  // The Constellations layer draws only with the science lens on, so the action turns both on.
  function showConstellationLines() {
    if (!isScienceLensOn()) toggleScienceLens();
    setLayer('constellations', true);
  }

  let facts = $derived.by((): Fact[] => {
    if (!star) return [];
    return [
      ...(colorName && kelvin !== null
        ? [
            {
              label: m.star_label_colour(),
              value: `${colorLabel} · ~${kelvin.toLocaleString()} K`,
              swatch,
              why: { title: m.star_why_colour_title(), body: m.star_why_colour_body() },
            },
          ]
        : []),
      { label: m.star_label_distance(), value: `${fmt(distLy, 2)} ly`, accent: true },
      { label: m.star_label_distance_pc(), value: `${fmt(star.dist_pc, 2)} pc` },
      { label: m.star_label_apparent_mag(), value: fmt(star.mag, 2) },
      { label: m.star_label_absolute_mag(), value: fmt(star.absmag, 2) },
      ...(star.spect ? [{ label: m.sun_label_spectral_class(), value: star.spect }] : []),
      ...(star.con
        ? [{ label: m.star_label_constellation(), value: constellationName(star.con) }]
        : []),
      ...(star.hip ? [{ label: m.star_label_catalogue(), value: `HIP ${star.hip}` }] : []),
    ];
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
      // Warm rocky → accent blue sub-Neptune → blue giant, for a little visual variety.
      const color = r < 1.6 ? '#ffc39a' : r < 4 ? '#8fe6d8' : '#a9c8ff'; // a3-keep: star class colour, palette review at the end
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

<UniversePanelBody
  {open}
  {onClose}
  {title}
  mobileSheet="full"
  entityId={star?.id ?? ''}
  name={star ? (star.name ?? star.proper) : undefined}
  {hero}
  heroCaption={star?.photo
    ? star.photo.kind === 'artist'
      ? m.star_photo_artist()
      : m.star_photo_real()
    : m.star_portrait_caption()}
  {gallery}
  idPrefix="star"
  lead={star ? [star.fact, star.bio].filter((t): t is string => !!t) : []}
  tabs={[
    { id: 'sky', label: m.panel_tab_sky(), visible: !!conVertices && !!star?.con },
    { id: 'system', label: m.star_tab_system(), visible: hasSystem && !!system },
    { id: 'technical', label: m.panel_tab_technical() },
  ]}
>
  {#snippet eyebrow()}
    {#if star}
      <div class="kind-row" style:--accent={swatch}>
        <span class="swatch" style:background={swatch} aria-hidden="true"></span>
        <span class="kind">
          {star.spect ?? ''}{star.spect && star.con ? ' · ' : ''}{constellationName(star.con)}
        </span>
      </div>
    {/if}
  {/snippet}

  {#snippet actions()}
    {#if hasSystem}
      <Chip kind="action" onclick={() => onEnterSystem?.()} data-testid="enter-system"
        >{m.star_enter_system()}</Chip
      >
    {/if}
  {/snippet}

  {#snippet heroArt()}
    {#if star}<StarPortrait bv={star.bv} spect={star.spect} absmag={star.absmag} />{/if}
  {/snippet}

  {#snippet overview()}
    {#if star}
      {#if star.cultural}
        <h3 class="library-heading">{m.star_across_cultures()}</h3>
        <p class="editorial">{star.cultural}</p>
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
    {/if}
  {/snippet}

  {#snippet tabContent(active)}
    {#if star && active === 'sky' && conVertices && star.con}
      <div class="star-finder">
        <ConstellationFinder
          vertices={conVertices}
          starXYZ={[star.x, star.y, star.z]}
          label={constellationName(star.con)}
        />
        <p class="hero-caption">{m.star_finder_caption({ con: constellationName(star.con) })}</p>
      </div>
      <UniverseFacts
        facts={[
          {
            label: m.star_label_constellation(),
            value: constellationName(star.con),
            accent: true,
          },
        ]}
      />
      {#if zodiac}
        <p class="editorial">{m.star_zodiac_note({ con: constellationName(star.con) })}</p>
      {/if}
      <div class="ui-chip-group">
        <Chip kind="action" onclick={showConstellationLines}>{m.star_show_constellations()}</Chip>
      </div>
    {:else if star && active === 'system' && system}
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
      <p class="editorial">{planetCountLabel(system.planets.length)}</p>
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
    {:else if star}
      <UniverseFacts {facts} />

      <!-- Every star panel links into the stellar-science article (S7 H–R lens). -->
      <a class="hr-article-link" href={localHref(`/science/observation/hertzsprung-russell`)}>
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
  {/snippet}
</UniversePanelBody>

<style>
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
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
    background: color-mix(in srgb, var(--color-accent) 5%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 16%, transparent);
    border-radius: 4px;
  }
  .pl-letter {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 13px;
    font-weight: 700;
    color: var(--color-state);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 0.5px;
    color: var(--color-state);
  }
  .star-finder {
    margin-bottom: 12px;
  }
  .hero-caption {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--color-text-label);
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
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--accent, rgba(255, 255, 255, 0.6));
  }
  .editorial.empty {
    color: var(--color-text-label);
  }
  .hr-article-link {
    display: inline-block;
    margin-top: 14px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 0.5px;
    color: var(--color-state);
    text-decoration: none;
    border-bottom: 1px dotted var(--color-accent-edge);
  }
  .hr-article-link:hover,
  .hr-article-link:focus-visible {
    border-bottom-color: var(--color-accent);
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
    color: var(--color-state);
    text-decoration: none;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    padding: 8px 10px;
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
    border-radius: 3px;
    display: block;
  }
  .learn-list :global(a:hover),
  .learn-list :global(a:focus-visible) {
    background: var(--color-accent-soft);
    border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
    outline: none;
  }
</style>

<script lang="ts">
  // DEEP-SKY — the universe's greatest hits, from the great observatories.
  // A single filterable stream of publicly-licensed telescope imagery. Each
  // tile opens a lightbox with the full-resolution view, caption, and credit.
  import { base } from '$app/paths';
  import { localizeHref } from '$lib/paraglide/runtime';
  import { assetOrigin } from '$lib/asset-url';
  import { agencyToLogoEntries } from '$lib/agency-logo';
  import type { DeepSkyImage } from '$lib/deep-sky';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Designations placed in the /explore sky (Slice 4) — gates the "Show in the
  // sky" CTA so only immersible objects link across.
  let skyDesignations = $derived(new Set(data.skyDesignations ?? []));

  // Group each image for the filter bar. Space telescopes get their own chip;
  // the interplanetary observatories (Voyager/Cassini/New Horizons/Juno/SDO)
  // collapse under one "Spacecraft" chip.
  const GROUP: Record<string, string> = {
    JWST: 'JWST',
    Hubble: 'Hubble',
    Chandra: 'Chandra',
    Spitzer: 'Spitzer',
    ESA: 'ESA',
    Voyager: 'Spacecraft',
    Cassini: 'Spacecraft',
    'New Horizons': 'Spacecraft',
    Juno: 'Spacecraft',
    SDO: 'Spacecraft',
  };
  const groupOf = (t: string) => GROUP[t] ?? 'Other';

  const CHIP_ORDER = ['All', 'JWST', 'Hubble', 'Chandra', 'Spitzer', 'ESA', 'Spacecraft'];
  const counts = $derived.by(() => {
    const c: Record<string, number> = { All: data.images.length };
    for (const img of data.images) c[groupOf(img.telescope)] = (c[groupOf(img.telescope)] ?? 0) + 1;
    return c;
  });

  let filter = $state('All');

  // Spread similar images out: distribute each telescope's frames evenly across
  // the stream (by fractional position within its group) so we don't get a
  // block of Hubble then a block of JWST.
  function interleave(list: DeepSkyImage[]): DeepSkyImage[] {
    const groups = new Map<string, DeepSkyImage[]>();
    for (const x of list) {
      const g = groups.get(x.telescope) ?? groups.set(x.telescope, []).get(x.telescope)!;
      g.push(x);
    }
    const withPos: Array<[number, DeepSkyImage]> = [];
    for (const arr of groups.values())
      arr.forEach((x, i) => withPos.push([(i + 0.5) / arr.length, x]));
    return withPos.sort((a, b) => a[0] - b[0]).map(([, x]) => x);
  }

  // Feature tiles (2×2) — square-ish showpieces that earn the extra real estate.
  const FEATURE = new Set([
    'jwst-cartwheel',
    'hst-whirlpool',
    'jwst-rho-ophiuchi',
    'hst-cosmic-reef',
    'jwst-stephans',
    'hst-westerlund2',
    'jwst-casa',
    'hst-antennae',
  ]);
  // Stable per-key hash (FNV-1a) → an irregular but deterministic 0–99. Drives
  // the size sprinkle so it survives SSR/hydration and never shifts on reload,
  // yet reads as random (no periodic rhythm).
  function keyHash(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0) % 100;
  }
  // Brick span. Curated showpieces are always 2×2 (keeps the top of the wall
  // fixed). Everything else gets a size by aspect + hash so feature/wide/tall
  // tiles are scattered through the *whole* stream — no long runs of uniform
  // 1×1s, no repeating pattern. Spans stay aspect-appropriate to limit cropping.
  function span(img: DeepSkyImage): string {
    if (FEATURE.has(img.key)) return 'feature';
    const r = img.w / img.h;
    const h = keyHash(img.key);
    if (r >= 2.1) return 'wide'; // panoramas must run wide
    if (r <= 0.6) return 'tall'; // very tall must run tall
    if (r >= 1.35) {
      // landscape
      if (r <= 1.7 && h < 22) return 'feature';
      if (h < 62) return 'wide';
      return '';
    }
    if (r <= 0.85) {
      // portrait
      if (h < 46) return 'tall';
      return '';
    }
    // square-ish — the richest pool for variety
    if (h < 18) return 'feature';
    if (h < 34) return 'tall';
    if (h < 50) return 'wide';
    return '';
  }

  const shown = $derived(
    interleave(
      filter === 'All' ? data.images : data.images.filter((i) => groupOf(i.telescope) === filter),
    ),
  );

  // Lightbox state — index into the *currently shown* list.
  let openIndex = $state<number | null>(null);
  const current = $derived(openIndex === null ? null : (shown[openIndex] ?? null));

  function open(i: number) {
    openIndex = i;
  }
  function close() {
    openIndex = null;
  }
  function step(delta: number) {
    if (openIndex === null) return;
    openIndex = (openIndex + delta + shown.length) % shown.length;
  }
  function onKey(e: KeyboardEvent) {
    if (openIndex === null) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  }
</script>

<svelte:window onkeydown={onKey} />

<svelte:head>
  <title>Deep-Sky · Gallery · Orrery</title>
  <meta
    name="description"
    content="A curated wall of the finest publicly-licensed observatory imagery — JWST, Hubble, Chandra, Spitzer and the great space observatories."
  />
</svelte:head>

<article class="gallery" data-route-ready="true">
  <header>
    <nav class="crumb">
      <a href="{base}{localizeHref('/gallery')}">Gallery</a><span class="sep">›</span><span
        >Deep-Sky</span
      >
    </nav>
    <h1>DEEP-SKY</h1>
    <p class="lede">
      The universe's greatest hits, as seen by the great observatories. {data.images.length} images, all
      publicly licensed — from the Pillars of Creation to the Whirlpool Galaxy. Click any frame to see
      it full-size, with its story and credit.
    </p>
  </header>

  <div class="filters" role="tablist" aria-label="Filter by observatory">
    {#each CHIP_ORDER as chip (chip)}
      {#if counts[chip]}
        <button
          class="chip"
          class:active={filter === chip}
          role="tab"
          aria-selected={filter === chip}
          onclick={() => (filter = chip)}
        >
          {chip}<span class="n">{counts[chip]}</span>
        </button>
      {/if}
    {/each}
  </div>

  <div class="masonry">
    {#each shown as img, i (img.key)}
      <figure class="tile {span(img)}">
        <button type="button" onclick={() => open(i)} aria-label="View {img.title} — {img.caption}">
          <img
            src="{assetOrigin}/images/deep-sky/{img.key}.thumb.jpg"
            alt="{img.title} — {img.subject}"
            width={img.w}
            height={img.h}
            loading="lazy"
          />
          <span class="t-cap">
            <span class="t-title">{img.title}</span>
            <span class="t-scope">
              {img.telescope}
              {#each agencyToLogoEntries(img.agency) as lg (lg.path)}
                <img class="t-logo" src={lg.path} alt={lg.short} title={lg.full} />
              {/each}
            </span>
            {#if img.designation}<span class="t-desig">{img.designation}</span>{/if}
          </span>
        </button>
      </figure>
    {/each}
  </div>

  <footer class="gallery-footer">
    <p>
      <strong>The great observatories.</strong> Space telescopes — JWST, Hubble, Chandra and Spitzer —
      plus ESA's Euclid and the interplanetary vantage of Voyager, New Horizons and the Solar Dynamics
      Observatory.
    </p>
    <p>
      <strong>All publicly licensed.</strong> Public domain or Creative Commons, sourced from Wikimedia
      Commons. Every frame carries its credit and licence in the viewer.
    </p>
  </footer>
</article>

{#if current}
  <div class="lightbox" role="dialog" aria-modal="true" aria-label={current.title} tabindex="-1">
    <!-- Full-area backdrop; a real <button> so click-to-close is keyboard-accessible. -->
    <button class="lb-backdrop" onclick={close} aria-label="Close"></button>
    <button class="lb-close" onclick={close} aria-label="Close">×</button>
    <button class="lb-nav lb-prev" onclick={() => step(-1)} aria-label="Previous">‹</button>
    <figure class="lb-figure">
      <img src="{assetOrigin}/images/deep-sky/{current.key}.jpg" alt={current.title} />
      <figcaption>
        <div class="lb-scope">
          <span class="lb-obs">{current.fullscope}</span>
          {#each agencyToLogoEntries(current.agency) as lg (lg.path)}
            <img class="lb-logo" src={lg.path} alt={lg.short} title={lg.full} />
          {/each}
        </div>
        <h2>{current.title}</h2>
        {#if current.designation}
          <div class="lb-desig">
            {current.designation}{#if current.constellation && current.constellation !== '—'}<span
                class="lb-desig-sep">·</span
              >{current.constellation}{/if}
          </div>
        {/if}
        <p class="lb-caption">{current.caption}</p>
        <dl class="lb-facts">
          <div>
            <dt>Object</dt>
            <dd>{current.type}</dd>
          </div>
          {#if current.constellation && current.constellation !== '—'}
            <div>
              <dt>Constellation</dt>
              <dd>{current.constellation}</dd>
            </div>
          {/if}
          <div>
            <dt>Distance</dt>
            <dd>{current.distance}</dd>
          </div>
          <div>
            <dt>Captured</dt>
            <dd>{current.taken}</dd>
          </div>
          <div>
            <dt>Instrument</dt>
            <dd>{current.instrument}</dd>
          </div>
        </dl>
        <p class="lb-meta">
          <span class="lb-credit">{current.credit}</span>
          <a class="lb-src" href={current.source} target="_blank" rel="noopener noreferrer"
            >{current.licence} · source ↗</a
          >
        </p>
        {#if current.designation && skyDesignations.has(current.designation)}
          <a class="lb-sky" href="{base}/explore?deepsky={encodeURIComponent(current.designation)}">
            Show in the sky →
          </a>
        {/if}
      </figcaption>
    </figure>
    <button class="lb-nav lb-next" onclick={() => step(1)} aria-label="Next">›</button>
  </div>
{/if}

<style>
  .gallery {
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px 24px 64px;
    color: var(--color-text);
  }
  header {
    text-align: center;
    margin-bottom: 26px;
  }
  .crumb {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 14px;
  }
  .crumb a {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
  }
  .crumb .sep {
    margin: 0 8px;
  }
  h1 {
    font-family: var(--font-display);
    font-size: 42px;
    letter-spacing: 10px;
    margin: 0 0 12px;
  }
  .lede {
    font-family: var(--font-editorial), 'Crimson Pro', serif;
    font-style: italic;
    font-size: 17px;
    color: rgba(255, 255, 255, 0.75);
    max-width: 760px;
    margin: 0 auto;
    line-height: 1.55;
  }
  .filters {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin: 0 auto 30px;
    max-width: 900px;
  }
  .chip {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.7);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 999px;
    padding: 7px 14px;
    cursor: pointer;
    transition:
      border-color 0.15s,
      color 0.15s,
      background 0.15s;
  }
  .chip:hover {
    border-color: rgba(127, 176, 224, 0.5);
    color: #fff;
  }
  .chip.active {
    color: #06121f;
    background: #7fb0e0;
    border-color: #7fb0e0;
  }
  .chip .n {
    margin-left: 7px;
    opacity: 0.6;
    font-size: 10px;
  }
  .chip.active .n {
    opacity: 0.75;
  }

  /* Brick mosaic — a dense spanning grid. Feature tiles (2×2) and panorama /
     tall tiles vary the size + rhythm; grid-auto-flow:dense back-fills the gaps
     the big tiles leave, so the wall reads as an interesting, spread-out mosaic
     rather than a uniform ledger. Cells crop (object-fit:cover) but spans are
     matched to each frame's aspect, so the crop is slight; the lightbox shows
     the full uncropped frame. */
  .masonry {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-auto-rows: 230px;
    grid-auto-flow: dense;
    gap: 12px;
  }
  .tile {
    margin: 0;
    grid-column: span 1;
    grid-row: span 1;
    min-width: 0;
  }
  .tile.feature {
    grid-column: span 2;
    grid-row: span 2;
  }
  .tile.wide {
    grid-column: span 2;
  }
  .tile.tall {
    grid-row: span 2;
  }
  .tile button {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    overflow: hidden;
    background: #05060d;
    cursor: pointer;
    position: relative;
    transition:
      border-color 0.2s,
      transform 0.2s;
  }
  .tile button:hover {
    border-color: rgba(127, 176, 224, 0.55);
    transform: translateY(-2px);
    z-index: 2;
  }
  .tile img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .tile .t-cap {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 3px 7px;
    padding: 24px 12px 9px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.88), rgba(0, 0, 0, 0));
    opacity: 0;
    transition: opacity 0.2s;
    text-align: left;
  }
  .tile button:hover .t-cap,
  .tile button:focus-visible .t-cap {
    opacity: 1;
  }
  .t-title {
    font-family: var(--font-display);
    font-size: 15px;
    letter-spacing: 0.5px;
    color: #fff;
    line-height: 1.1;
  }
  /* Matches /fly's .opening-agency: Space Mono, uppercase, wide tracking. */
  .t-scope {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 9px;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: #9fc4ea;
    white-space: nowrap;
  }
  .t-scope::before {
    content: '·';
    margin-right: 2px;
    letter-spacing: 0;
    color: rgba(255, 255, 255, 0.4);
  }
  /* Specificity must beat `.tile img` (which forces width:100%/height:auto). */
  .t-scope .t-logo {
    align-self: center;
    height: 10px;
    width: auto;
    opacity: 0.9;
  }
  .t-desig {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }
  .t-desig::before {
    content: '·';
    margin-right: 5px;
    color: rgba(255, 255, 255, 0.35);
  }

  .gallery-footer {
    margin-top: 44px;
    padding: 20px 24px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  .gallery-footer p {
    font-family: var(--font-mono), monospace;
    font-size: 12px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 10px;
  }
  .gallery-footer p:last-child {
    margin-bottom: 0;
  }
  .gallery-footer strong {
    color: #7fb0e0;
    font-weight: normal;
    letter-spacing: 1px;
  }

  /* Lightbox */
  .lightbox {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    background: rgba(2, 4, 10, 0.92);
    backdrop-filter: blur(6px);
  }
  .lb-backdrop {
    position: absolute;
    inset: 0;
    z-index: 0;
    background: none;
    border: 0;
    padding: 0;
    cursor: default;
  }
  .lb-figure {
    position: relative;
    z-index: 1;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: min(1200px, 92vw);
    max-height: 90vh;
  }
  .lb-figure img {
    max-width: 100%;
    max-height: 72vh;
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }
  .lb-figure figcaption {
    text-align: center;
    margin-top: 16px;
    max-width: 680px;
  }
  .lb-figure h2 {
    font-family: var(--font-display);
    font-size: 26px;
    letter-spacing: 2px;
    margin: 0 0 6px;
    color: #fff;
  }
  .lb-scope {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .lb-obs {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #e9c46a;
  }
  .lb-desig {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #9fc4ea;
    margin: -2px 0 12px;
  }
  .lb-desig-sep {
    margin: 0 8px;
    color: rgba(255, 255, 255, 0.4);
  }
  .lb-logo {
    height: 20px;
    width: auto;
    opacity: 0.92;
  }
  .lb-caption {
    font-family: var(--font-editorial), 'Crimson Pro', serif;
    font-style: italic;
    font-size: 16px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.82);
    margin: 0 0 14px;
  }
  .lb-facts {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 22px;
    margin: 0 0 14px;
    padding: 12px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }
  .lb-facts div {
    text-align: center;
  }
  .lb-facts dt {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 3px;
  }
  .lb-facts dd {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
  }
  .lb-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px 16px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    color: rgba(255, 255, 255, 0.55);
  }
  .lb-scope {
    color: #9fc4ea;
  }
  .lb-src {
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
  }
  .lb-src:hover {
    color: #fff;
    text-decoration: underline;
  }
  .lb-sky {
    display: inline-block;
    margin-top: 0.6rem;
    padding: 0.45rem 0.85rem;
    border-radius: 6px;
    background: linear-gradient(135deg, #4ecdc4, #7ff0e0);
    color: #06231f;
    font-weight: 700;
    font-size: 0.85rem;
    text-decoration: none;
  }
  .lb-sky:hover {
    filter: brightness(1.08);
  }
  .lb-close {
    position: fixed;
    top: 18px;
    right: 22px;
    z-index: 2;
    font-size: 32px;
    line-height: 1;
    color: rgba(255, 255, 255, 0.8);
    background: none;
    border: none;
    cursor: pointer;
  }
  .lb-nav {
    position: fixed;
    top: 50%;
    z-index: 2;
    transform: translateY(-50%);
    font-size: 44px;
    line-height: 1;
    color: rgba(255, 255, 255, 0.7);
    background: none;
    border: none;
    cursor: pointer;
    padding: 12px;
  }
  .lb-nav:hover {
    color: #fff;
  }
  .lb-prev {
    left: 12px;
  }
  .lb-next {
    right: 12px;
  }

  @media (max-width: 1200px) {
    .masonry {
      grid-template-columns: repeat(3, 1fr);
      grid-auto-rows: 210px;
    }
  }
  @media (max-width: 800px) {
    .masonry {
      grid-template-columns: repeat(2, 1fr);
      grid-auto-rows: 190px;
      gap: 10px;
    }
    /* On two columns a 2×2 feature would swallow the whole row — keep the
       size variety but cap features to a wide 2×1 band instead. */
    .tile.feature {
      grid-row: span 1;
    }
    h1 {
      font-size: 32px;
      letter-spacing: 6px;
    }
  }
  @media (max-width: 480px) {
    .gallery {
      padding: 16px 14px 32px;
    }
    .masonry {
      grid-auto-rows: 150px;
    }
    .lightbox {
      padding: 16px;
    }
    .lb-nav {
      font-size: 32px;
    }
  }
</style>

<!--
  CollectibleCard — template 01 'cinematic' (#547, design locked from the
  Higgsfield consultation round 7B, 2026-09-12).

  Pure presentational HTML/CSS over a CardSpec: full-bleed hero dissolving
  into black, display title at the seam, bold kicker, editorial-serif story,
  a stat grid whose VALUES carry the weight, the computed figure rendered
  monochrome, and a footer with collection number · credit · slug.

  Style rules from the consultation: strictly monochrome chrome (the only
  colour on the card is the photograph itself) — no teal accents, no gold,
  no ornamental frames. Luxury = weight, hierarchy, precision.

  Templates are the restyle surface: edit here (or add template variants)
  and every card updates. Nothing per-entity is ever generated.
-->
<script lang="ts">
  import { assetUrl } from '$lib/asset-url';
  import type { CardSpec } from './card-spec';

  type Props = { spec: CardSpec };
  let { spec }: Props = $props();

  // The figure is speculative (cardForMission points at a trajectory
  // thumbnail that ~50 missions don't have) — collapse it on load error
  // instead of rendering the browser's broken-image glyph.
  let figFailed = $state(false);
  $effect(() => {
    void spec.figureUrl;
    figFailed = false;
  });
</script>

<article class="card" aria-label={spec.title}>
  <header class="head">
    <span class="wordmark">ORRERY</span>
    <span class="collection">{spec.collection} · №{spec.number}</span>
  </header>

  <div class="hero">
    {#if spec.heroUrl}
      <img class="hero-img" src={spec.heroUrl} alt="" loading="lazy" decoding="async" />
    {/if}
    <div class="hero-fade"></div>
    <h2 class="title">{spec.title}</h2>
  </div>

  <div class="body">
    <p class="kicker">{spec.kicker}</p>
    {#if spec.story}
      <p class="story">{spec.story}</p>
    {/if}

    <div class="lower">
      <dl class="stats">
        {#each spec.stats as s (s.label)}
          <div class="stat">
            <dt>{s.label}</dt>
            <dd>{s.value}</dd>
          </div>
        {/each}
      </dl>
      {#if spec.figureUrl && !figFailed}
        <figure class="fig">
          <img
            src={assetUrl(spec.figureUrl)}
            alt=""
            loading="lazy"
            decoding="async"
            onerror={() => (figFailed = true)}
          />
          {#if spec.figureCaption}<figcaption>{spec.figureCaption}</figcaption>{/if}
        </figure>
      {/if}
    </div>

    {#if spec.fact}
      <p class="fact">
        <span class="fact-label">{spec.factLabel ?? 'FACT'}</span>
        {spec.fact}
      </p>
    {/if}
  </div>

  <footer class="foot">
    <span class="foot-num">№ {spec.number}</span>
    {#if spec.creditLine}<span class="foot-credit">{spec.creditLine}</span>{/if}
    <span class="foot-slug">{spec.slug}</span>
  </footer>
</article>

<style>
  .card {
    /* The template's design tokens — the restyle surface. */
    --card-bg: #04040c;
    --card-ink: #ffffff;
    --card-grey: rgba(255, 255, 255, 0.55);
    --card-faint: rgba(255, 255, 255, 0.28);
    --card-hairline: rgba(255, 255, 255, 0.14);

    width: 360px;
    aspect-ratio: 3 / 4;
    display: flex;
    flex-direction: column;
    background: var(--card-bg);
    color: var(--card-ink);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px 10px;
  }
  .wordmark {
    font-family: var(--font-display, 'Bebas Neue', sans-serif);
    font-size: 14px;
    letter-spacing: 4px;
  }
  .collection {
    text-transform: uppercase;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 9px;
    letter-spacing: 1px;
    color: var(--card-grey);
    border: 1px solid var(--card-hairline);
    border-radius: 999px;
    padding: 3px 9px;
  }

  .hero {
    position: relative;
    flex: 1 1 46%;
    min-height: 0;
  }
  .hero-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .hero-fade {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 45%, var(--card-bg) 96%);
  }
  .title {
    position: absolute;
    left: 16px;
    right: 16px;
    bottom: 0;
    margin: 0;
    font-family: var(--font-display, 'Bebas Neue', sans-serif);
    font-size: 52px;
    line-height: 0.92;
    letter-spacing: 1px;
    text-shadow: 0 2px 18px rgba(0, 0, 0, 0.75);
  }

  .body {
    padding: 8px 16px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .kicker {
    margin: 0;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }
  .story {
    margin: 0;
    font-family: var(--font-editorial, 'Crimson Pro', serif);
    font-style: italic;
    font-size: 15px;
    line-height: 1.35;
    color: rgba(255, 255, 255, 0.88);
  }

  .lower {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }
  .stats {
    margin: 0;
    flex: 1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 7px 12px;
  }
  .stat dt {
    text-transform: uppercase;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 8px;
    letter-spacing: 1.2px;
    color: var(--card-grey);
  }
  .stat dd {
    margin: 1px 0 0;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fig {
    margin: 0;
    flex: none;
    width: 96px;
    text-align: center;
  }
  .fig img {
    width: 96px;
    height: 72px;
    object-fit: contain;
    /* Monochrome register — the figure is drafted, not decorative.
       screen-blend sinks the thumbnail's dark background into the card
       and leaves the path reading as white linework. */
    mix-blend-mode: screen;
    filter: grayscale(1) brightness(1.9) contrast(1.15);
  }
  .fig figcaption {
    text-transform: uppercase;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 7px;
    letter-spacing: 1.5px;
    color: var(--card-faint);
    margin-top: 2px;
  }

  .fact {
    margin: 2px 0 0;
    padding-top: 8px;
    border-top: 1px solid var(--card-hairline);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 9.5px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.82);
  }
  .fact-label {
    text-transform: uppercase;
    font-weight: 700;
    color: var(--card-ink);
    margin-right: 6px;
  }

  .foot {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
    padding: 8px 16px 12px;
    border-top: 1px solid var(--card-hairline);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 8px;
    letter-spacing: 0.8px;
    color: var(--card-faint);
  }
  .foot-num {
    font-weight: 700;
    color: var(--card-grey);
  }
  .foot-credit {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }
</style>

<script lang="ts">
  /**
   * Shared big-box route-card grid.
   *
   * Extracted from the home landing (`src/routes/+page.svelte`) so the
   * `/explore` hub can render the same house-style tiles without cloning the
   * ~470 lines of hand-drawn per-route SVG. One source of truth for the icon
   * set + card styling; callers supply the card list and an href builder
   * (locale-aware) so the grid stays presentational.
   *
   * The gradient/filter `<defs>` and the per-route icon `{#if}` chain live
   * together here so the `url(#ic-*)` references resolve within the component
   * scope.
   */
  interface RouteCard {
    /** App path — used for the href, the per-card audio-stage id, and the key. */
    route: string;
    /** Optional query suffix (e.g. `?context=milky-way`) appended to the href;
     *  also disambiguates the key/audio-stage when several cards share a route. */
    query?: string;
    /** Display headline for the tile (e.g. the nav label "OUR SOLAR SYSTEM"). */
    name: string;
    title: string;
    desc: string;
    /** Explore scale-level glyph id (ScaleGlyph), the same icon the home grid draws for it. */
    glyph?: string;
  }

  import RouteGlyph from './RouteGlyph.svelte';
  import RouteGlyphDefs from './RouteGlyphDefs.svelte';

  let {
    cards,
    hrefFor,
    gridTestId = 'landing-cards',
    gridAudioStage = 'route-grid',
  }: {
    cards: RouteCard[];
    /** Build the (locale-aware) href for a card route. */
    hrefFor: (route: string) => string;
    gridTestId?: string;
    gridAudioStage?: string;
  } = $props();
</script>

<RouteGlyphDefs />

<ul class="card-grid" data-testid={gridTestId} data-audio-stage={gridAudioStage}>
  {#each cards as card (card.route + (card.query ?? ''))}
    <li>
      <a
        class="card"
        href={hrefFor(card.route + (card.query ?? ''))}
        aria-label={`${card.name}: ${card.title}`}
        data-audio-stage="route-card-{card.route.slice(1)}{card.query
          ? '-' + card.query.replace(/\W+/g, '')
          : ''}"
      >
        <span class="card-head">
          <svg class="card-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
            <RouteGlyph glyph={card.glyph ?? card.route.slice(1)} variant="hub" />
          </svg>
          <span class="card-name">{card.name}</span>
        </span>
        <span class="card-title">{card.title}</span>
        <span class="card-desc">{card.desc}</span>
      </a>
    </li>
  {/each}
</ul>

<style>
  .card-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px;
    min-height: 180px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    text-decoration: none;
    color: inherit;
    transition:
      transform 150ms ease,
      border-color 150ms ease,
      background 150ms ease;
  }
  .card-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .card-icon {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    display: block;
  }
  .card:hover,
  .card:focus-visible {
    border-color: var(--color-accent-edge);
    background: color-mix(in srgb, var(--color-accent) 4%, transparent);
    transform: translateY(-4px);
    outline: none;
  }
  .card:focus-visible {
    outline: 2px solid var(--color-accent, var(--color-focus));
    outline-offset: 2px;
  }
  .card-name {
    font-family: var(--font-display);
    font-size: 22px;
    letter-spacing: 2px;
    color: var(--color-text);
  }
  .card-title {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.92);
  }
  .card-desc {
    font-family: var(--font-mono), 'Space Mono', monospace;
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-text-label);
  }

  @media (min-width: 768px) {
    .card-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 1024px) {
    .card-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  /* TV / 10-foot landscape (RFC-031 S6) — compact 3-up grid, all in view. */
  @media (hover: none) and (pointer: coarse) and (min-width: 1100px) and (max-resolution: 1.5dppx) {
    .card-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .card {
      transition: none;
    }
    .card:hover,
    .card:focus-visible {
      transform: none;
    }
  }
</style>

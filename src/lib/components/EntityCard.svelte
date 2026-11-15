<!--
  EntityCard — the one catalogue card of /missions and /fleet (UXD-048). One footprint: a 16:9
  photo, then a fixed-height body of four rows, so every card of a grid has the same size and no
  empty band appears at the bottom whatever a record carries:

    name (one line, ellipsis) + year at the row's end
    one line per agency: a 3 px bar in its colour, then the name
    pills (a snippet: the status pill, a quality or category pill) on one line
    the story, two lines at most (`story`)

  A page differs only in the data and in what it puts in `pills`; it never forks the card. The
  grid is `<ul class="entity-card-grid">` (src/lib/styles/entity-card-grid.css); this component
  renders the `<li>`. Visually hidden `facts` (year and destination, say) are read out as a
  definition list. Spec: Design System §5.4.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { responsive } from '$lib/responsive-image.svelte';
  import { IMAGE_SIZES } from '$lib/image-sizes';
  import { heroPositionFor } from '$lib/image-hero';
  import { assetUrl } from '$lib/asset-url';

  interface Props {
    /** Hero URL (`pickHero(...)`). A missing or failing photo shows the soft placeholder. */
    photo: string;
    name: string;
    year: string | number;
    /** One entry per agency; `color` is the palette colour of its bar. */
    agencies: { name: string; color: string | null }[];
    agencyTitle?: string;
    /** The lead colour: the card's left edge. */
    accent: string;
    story?: string | null;
    /** Insignia beside the name (PRD-029), already gated on the badges map. */
    badge?: string | null;
    selected?: boolean;
    testid?: string;
    audioStage?: string;
    ariaLabel?: string;
    /** Hidden label / value pairs read out after the card (year, destination, country). */
    facts?: { label: string; value: string }[];
    pills?: Snippet;
    onclick: () => void;
    onkeydown?: (e: KeyboardEvent) => void;
  }
  let {
    photo,
    name,
    year,
    agencies,
    agencyTitle,
    accent,
    story = null,
    badge = null,
    selected = false,
    testid,
    audioStage,
    ariaLabel,
    facts = [],
    pills,
    onclick,
    onkeydown,
  }: Props = $props();
</script>

<li class="card-li">
  <button
    type="button"
    class="card"
    class:selected
    style:--accent={accent}
    data-testid={testid}
    data-audio-stage={audioStage}
    aria-label={ariaLabel}
    {onclick}
    {onkeydown}
  >
    <div class="card-accent" aria-hidden="true"></div>
    <figure class="card-photo">
      <img
        class="card-cover"
        {...responsive(photo, IMAGE_SIZES.card)}
        style:object-position={heroPositionFor(photo)}
        alt=""
        loading="lazy"
        decoding="async"
        onerror={(e) =>
          (e.currentTarget as HTMLImageElement).closest('figure')?.classList.add('cover-missing')}
      />
    </figure>
    <div class="card-body">
      <div class="card-name-row">
        <h2 class="card-name">{name}</h2>
        {#if badge}
          <img class="card-badge" src={assetUrl(badge)} alt="" loading="lazy" decoding="async" />
        {/if}
        <span class="card-year-vis" aria-hidden="true">{year}</span>
      </div>
      <p class="card-agencies" title={agencyTitle}>
        {#each agencies as a (a.name)}
          <span class="card-agency" style:--agency={a.color ?? accent}
            ><i aria-hidden="true"></i>{a.name}</span
          >
        {/each}
      </p>
      <div class="card-pills">{@render pills?.()}</div>
      <p class="card-first">{story ?? ''}</p>
      {#if facts.length > 0}
        <dl class="sr-only">
          {#each facts as f (f.label)}
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          {/each}
        </dl>
      {/if}
    </div>
  </button>
</li>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>

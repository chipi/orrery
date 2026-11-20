<!--
  EntityCard — the one catalogue card of /missions and /fleet (UXD-048). One footprint: a 16:9
  photo, then a fixed-height body of four rows, so every card of a grid has the same size and no
  empty band appears at the bottom whatever a record carries:

    name (one line, ellipsis) + year at the row's end
    one line per agency: a 3 px bar in its colour, then the name
    pills (a snippet: the status pill, a quality or category pill) on one line
    the story, two lines at most (`story`)

  A page differs only in the data and in what it puts in `pills`; it never forks the card. The
  shape props (`aspect`, `fit`, `body`, `nameLines`, a link or plain root) let /patches, /essays and
  /posters use the same card: Design System §5.4, UXS-017 §4. The
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
    year?: string | number | null;
    /** One entry per agency; `color` is the palette colour of its bar. None: the row is left out. */
    agencies?: { name: string; color: string | null }[];
    agencyTitle?: string;
    /** The lead colour: the card's left edge. None: the edge stays, in a neutral tone. */
    accent?: string | null;
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
    /** The last row of a `compact` body (a credit line, say). */
    extra?: Snippet;
    /** The root: a button with `onclick`, a link with `href`, or a plain box with neither. */
    onclick?: () => void;
    onkeydown?: (e: KeyboardEvent) => void;
    href?: string;
    download?: string;
    /** Photo shape: `wide` is 16:9 (the catalogue), `portrait` is 2:3 (a print). */
    aspect?: 'wide' | 'portrait';
    /** `contain` shows the whole artwork (an insignia) on the soft gradient instead of cropping it. */
    fit?: 'cover' | 'contain';
    /** `full` is the four-row body, `compact` a name and one `extra` row, `none` the photo alone. */
    body?: 'full' | 'compact' | 'none';
    /** The name's lines (1 ellipsis, or 2 for a title). The row keeps the room either way. */
    nameLines?: 1 | 2;
    /** The name's heading level: 2 under the page title, 3 under a section heading. */
    level?: 2 | 3;
    /** An essay: the summary is set in the editorial serif, three lines, and there is no pills row. */
    editorial?: boolean;
    /** A photo from the image ladder (the default) or a plain file. */
    ladder?: boolean;
    imageSizes?: string;
    alt?: string;
    imgWidth?: number;
    imgHeight?: number;
  }
  let {
    photo,
    name,
    year = null,
    agencies = [],
    agencyTitle,
    accent = null,
    story = null,
    badge = null,
    selected = false,
    testid,
    audioStage,
    ariaLabel,
    facts = [],
    pills,
    extra,
    onclick,
    onkeydown,
    href,
    download,
    aspect = 'wide',
    fit = 'cover',
    body = 'full',
    nameLines = 1,
    level = 2,
    editorial = false,
    ladder = true,
    imageSizes = IMAGE_SIZES.card,
    alt = '',
    imgWidth,
    imgHeight,
  }: Props = $props();

  const tag = $derived(href ? 'a' : onclick ? 'button' : 'div');
  const rootAttrs = $derived(
    tag === 'a'
      ? { href, download, 'aria-label': ariaLabel }
      : tag === 'button'
        ? { type: 'button', onclick, onkeydown, 'aria-label': ariaLabel }
        : {},
  );
  const imgAttrs = $derived(ladder ? responsive(photo, imageSizes) : { src: photo });
</script>

<li class="card-li">
  <svelte:element
    this={tag}
    class="card {aspect} {fit}"
    class:selected
    style:--accent={accent ?? undefined}
    data-testid={testid}
    data-audio-stage={audioStage}
    {...rootAttrs}
  >
    <div class="card-accent" aria-hidden="true"></div>
    <figure class="card-photo">
      {#if photo}
        <img
          class="card-cover"
          {...imgAttrs}
          style:object-position={fit === 'cover' ? heroPositionFor(photo) : undefined}
          {alt}
          width={imgWidth}
          height={imgHeight}
          loading="lazy"
          decoding="async"
          onerror={(e) =>
            (e.currentTarget as HTMLImageElement).closest('figure')?.classList.add('cover-missing')}
        />
      {/if}
    </figure>
    {#if body !== 'none'}
      <div class="card-body" class:compact={body === 'compact'} class:essay={editorial}>
        <div class="card-name-row" class:lines-2={nameLines === 2}>
          <svelte:element
            this={`h${level}`}
            class="card-name"
            title={nameLines === 2 ? name : undefined}>{name}</svelte:element
          >
          {#if badge}
            <img class="card-badge" src={assetUrl(badge)} alt="" loading="lazy" decoding="async" />
          {/if}
          {#if year != null}<span class="card-year-vis" aria-hidden="true">{year}</span>{/if}
        </div>
        {#if body === 'compact'}
          <div class="card-extra">{@render extra?.()}</div>
        {:else}
          {#if agencies.length > 0}
            <p class="card-agencies" title={agencyTitle}>
              {#each agencies as a, ki (ki + ':' + a.name)}
                <span class="card-agency" style:--agency={a.color ?? accent}
                  ><i aria-hidden="true"></i>{a.name}</span
                >
              {/each}
            </p>
          {/if}
          {#if !editorial}<div class="card-pills">{@render pills?.()}</div>{/if}
          <p class="card-first">{story ?? ''}</p>
        {/if}
        {#if facts.length > 0}
          <dl class="sr-only">
            {#each facts as f, ki (ki + ':' + f.label)}
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            {/each}
          </dl>
        {/if}
      </div>
    {/if}
  </svelte:element>
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

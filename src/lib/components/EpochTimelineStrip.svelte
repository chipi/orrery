<script lang="ts">
  /**
   * Era strip (UXD-048; PRD-012 v0.2 §epochs, RFC-016 v0.2 OQ-17): nine equal tiles, one per
   * historic spaceflight epoch, in a radiogroup of <Chip kind="choice">. A tile is the
   * era's photo (`$lib/era-flagships`) fading in from the text over its end 70 %, with the era's
   * name (wraps, never clipped), its years, its count and, where the page brings them, a row
   * of agency-colour dots (the agencies active in that era). The chosen tile has the #889fe7
   * edge. Click or Enter/Space on the chosen tile clears the choice. Arrow keys move and
   * select (reversed in right-to-left, by ChipGroup). Nine columns, five and four under
   * 1100 px of strip, one scroll row under 560. Serves /missions and /fleet.
   */
  import type { FleetEpoch } from '$types/fleet';
  import { EPOCH_BANDS, eraSelectable } from '$lib/epoch-bands';
  import { ERA_PHOTO, eraPhotoPath } from '$lib/era-flagships';
  import { assetUrl } from '$lib/asset-url';
  import * as m from '$lib/paraglide/messages';
  import { epochLabel } from '$lib/epoch-label';
  import Chip from './Chip.svelte';
  import ChipGroup from './ChipGroup.svelte';

  type Props = {
    countByEpoch: Map<FleetEpoch, number>;
    /** Agency colours active in each era (one per agency); omitted on a page without agencies. */
    colorsByEpoch?: Map<FleetEpoch, string[]>;
    selected: FleetEpoch | 'ALL';
    onSelect: (v: FleetEpoch | 'ALL') => void;
  };

  let { countByEpoch, colorsByEpoch, selected, onSelect }: Props = $props();

  const MAX_DOTS = 5;
  const yearsOf = (b: (typeof EPOCH_BANDS)[number]) =>
    `${b.yearStart}–${b.id === 'mars-era' ? '∞' : b.yearEnd}`;
</script>

<section class="strip" aria-label={m.epoch_timeline_aria()}>
  <ChipGroup role="radiogroup" label={m.epoch_filter_aria()} class="era-tiles">
    {#each EPOCH_BANDS as ep (ep.id)}
      {@const colors = colorsByEpoch?.get(ep.id) ?? []}
      <Chip
        kind="choice"
        class="era-tile"
        active={selected === ep.id}
        disabled={!eraSelectable(countByEpoch.get(ep.id), selected === ep.id)}
        aria-label={m.epoch_band_aria({
          label: epochLabel(ep.id),
          start: ep.yearStart,
          end: ep.yearEnd,
          count: countByEpoch.get(ep.id) ?? 0,
        })}
        onclick={() => onSelect(selected === ep.id ? 'ALL' : ep.id)}
      >
        <span class="era-photo" style:--flip={ERA_PHOTO[ep.id].flipRtl ? -1 : 1}>
          <img
            class="era-img"
            src={assetUrl(eraPhotoPath(ERA_PHOTO[ep.id]))}
            style:object-position={ERA_PHOTO[ep.id].position}
            alt=""
            width="64"
            height="96"
            loading="lazy"
            decoding="async"
            onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
          />
        </span>
        <span class="era-body">
          <span class="era-name">{epochLabel(ep.id)}</span>
          <span class="era-years"><bdi dir="ltr">{yearsOf(ep)}</bdi></span>
          <span class="era-foot">
            <b class="era-count" aria-hidden="true">{countByEpoch.get(ep.id) ?? 0}</b>
            {#if colors.length > 0}
              <span class="era-dots" aria-hidden="true">
                {#each colors.slice(0, MAX_DOTS) as c (c)}<i style:background={c}></i>{/each}
                {#if colors.length > MAX_DOTS}<em>+{colors.length - MAX_DOTS}</em>{/if}
              </span>
            {/if}
          </span>
        </span>
      </Chip>
    {/each}
  </ChipGroup>
</section>

<style>
  .strip {
    container-type: inline-size;
    margin: 0 0 14px;
  }
  .strip :global(.era-tiles) {
    display: grid;
    grid-template-columns: repeat(9, minmax(0, 1fr));
    gap: 6px;
  }
  .strip :global(.era-tile) {
    position: relative;
    overflow: hidden;
    justify-content: flex-start;
    align-items: stretch;
    /* block-size, not min-block-size: the chip's own minimum (30 / 44 px) stays, so the tile is a
       taller chip that follows chip.spec's size rule instead of a second chip size. */
    block-size: 96px;
    padding: 0;
    text-align: start;
    white-space: normal;
    letter-spacing: 0;
    background: var(--color-bg);
  }
  .strip :global(.era-tile[aria-checked='true']) {
    border-color: var(--color-state);
    box-shadow: 0 0 0 1px var(--color-state);
  }
  /* The photo sits crisp on the end side (about 40 % of the tile) with a short fade into the dark at its
     inner edge; the text is on the plain tile surface, so its contrast does not depend on the photo. */
  .era-photo {
    position: absolute;
    display: block;
    inset-block: 0;
    inset-inline-end: 0;
    inline-size: 70%;
    block-size: 100%;
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0%,
      rgb(0 0 0 / 0.04) 14%,
      rgb(0 0 0 / 0.14) 26%,
      rgb(0 0 0 / 0.38) 36%,
      rgb(0 0 0 / 0.72) 43%,
      #000 50%
    );
    mask-image: linear-gradient(
      to right,
      transparent 0%,
      rgb(0 0 0 / 0.04) 14%,
      rgb(0 0 0 / 0.14) 26%,
      rgb(0 0 0 / 0.38) 36%,
      rgb(0 0 0 / 0.72) 43%,
      #000 50%
    );
  }
  :global([dir='rtl']) .era-photo {
    -webkit-mask-image: linear-gradient(
      to left,
      transparent 0%,
      rgb(0 0 0 / 0.04) 14%,
      rgb(0 0 0 / 0.14) 26%,
      rgb(0 0 0 / 0.38) 36%,
      rgb(0 0 0 / 0.72) 43%,
      #000 50%
    );
    mask-image: linear-gradient(
      to left,
      transparent 0%,
      rgb(0 0 0 / 0.04) 14%,
      rgb(0 0 0 / 0.14) 26%,
      rgb(0 0 0 / 0.38) 36%,
      rgb(0 0 0 / 0.72) 43%,
      #000 50%
    );
  }
  .era-img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }
  /* A picture without text or flags (a symmetric subject) may be mirrored in right-to-left, so
     its subject lands in the visible part and not in the fade. */
  :global([dir='rtl']) .era-img {
    transform: scaleX(var(--flip, 1));
  }
  .era-body {
    position: relative;
    z-index: 0;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 4px;
    inline-size: 100%;
    padding: 9px 10px 8px;
  }
  .era-name {
    display: block;
    /* the name stays in the left 56 %, on the plain dark: it wraps rather than reach the photo */
    max-inline-size: 59%;
    line-height: 1.25;
    overflow-wrap: anywhere;
    color: var(--color-text);
  }
  .era-years {
    font-weight: 400;
    letter-spacing: 0;
    color: rgba(255, 255, 255, 0.9);
  }
  .era-foot {
    display: flex;
    align-items: center;
    gap: 8px;
    letter-spacing: 0;
    flex-wrap: wrap;
  }
  .era-count {
    font-size: 13px;
  }
  .era-dots {
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 3px;
  }
  .era-dots i {
    inline-size: 7px;
    block-size: 7px;
    border-radius: 50%;
  }
  .era-dots em {
    font-style: normal;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.78);
  }
  @container (max-width: 1099px) {
    .strip :global(.era-tiles) {
      grid-template-columns: repeat(5, minmax(0, 1fr));
    }
  }
  @container (max-width: 559px) {
    .strip :global(.era-tiles) {
      display: flex;
      flex-wrap: nowrap;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
    }
    .strip :global(.era-tile) {
      flex: 0 0 132px;
      block-size: 88px;
      scroll-snap-align: start;
    }
  }
</style>

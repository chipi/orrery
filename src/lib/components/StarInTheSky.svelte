<!--
  StarInTheSky — the IN THE SKY body of a named star (UXD-008): the figure of its constellation
  with the star marked, the constellation named, the zodiac note and the lines action. Shared by
  the StarPanel tab and the /explore/stars/<id> page (plan D1), so the two cannot drift.
-->
<script lang="ts">
  import Chip from './Chip.svelte';
  import ConstellationFinder from './ConstellationFinder.svelte';
  import UniverseFacts from './UniverseFacts.svelte';
  import * as m from '$lib/paraglide/messages';
  import { getConstellationLines } from '$lib/data/universe';
  import { dataLoadFailed } from '$lib/data/core';
  import { constellationName, isZodiacConstellation } from '$lib/universe/iau-constellations';
  import { showConstellationLines } from '$lib/universe/constellation-actions';
  import { figureVertices } from '$lib/universe/sky-finder';

  type Props = {
    star: { id: string; con: string; xyz: [number, number, number] };
    /** On a page outside the explorer: the action turns the lines on and opens this link. */
    explorerHref?: string;
  };
  let { star, explorerHref }: Props = $props();

  let lastKey = $state<string | null>(null);
  let conVertices = $state<number[] | null>(null);
  $effect(() => {
    const key = `${star.id}:${star.con}`;
    if (key === lastKey) return;
    lastKey = key;
    conVertices = null;
    const con = star.con;
    void getConstellationLines()
      .then((all) => {
        if (lastKey === key) conVertices = figureVertices(all, con);
      })
      .catch(dataLoadFailed);
  });
</script>

{#if conVertices}
  <div class="star-finder">
    <ConstellationFinder
      vertices={conVertices}
      starXYZ={star.xyz}
      label={constellationName(star.con)}
    />
    <p class="hero-caption">{m.star_finder_caption({ con: constellationName(star.con) })}</p>
  </div>
{/if}
<UniverseFacts
  facts={[
    { label: m.star_label_constellation(), value: constellationName(star.con), accent: true },
  ]}
/>
{#if isZodiacConstellation(star.con)}
  <p class="editorial">{m.star_zodiac_note({ con: constellationName(star.con) })}</p>
{/if}
<div class="ui-chip-group">
  {#if explorerHref}
    <Chip kind="link" href={explorerHref} onclick={showConstellationLines}
      >{m.star_show_constellations()}</Chip
    >
  {:else}
    <Chip kind="action" onclick={showConstellationLines}>{m.star_show_constellations()}</Chip>
  {/if}
</div>

<style>
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
</style>

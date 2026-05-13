<!--
  ObservatoryShowcase — horizontal strip of one signature image per
  observatory in the /fleet/observatory category. Embedded inside the
  /science/observation/space-photography section page.

  Pulls each observatory's first gallery image (01.jpg) via the existing
  fleet-galleries manifest. Clicking a thumbnail deep-links into the
  fleet panel for that observatory. Mobile-friendly: horizontal-scroll
  strip on narrow viewports, grid on wider ones.

  Provenance: every image rendered here is already in
  image-provenance.json from Phase D — no new attribution required.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { onMount } from 'svelte';
  import { getFleetByCategory, getFleetGallery } from '$lib/data';
  import type { FleetEntry } from '$types/fleet';

  /** Observatory + its hero image URL (resolved from the gallery manifest). */
  type ShowcaseItem = {
    entry: FleetEntry;
    heroUrl: string | null;
  };

  let items: ShowcaseItem[] = $state([]);
  let loading = $state(true);

  onMount(async () => {
    const observatories = await getFleetByCategory('observatory');
    const resolved = await Promise.all(
      observatories.map(async (entry) => {
        const urls = await getFleetGallery(entry.id);
        return { entry, heroUrl: urls[0] ?? null } as ShowcaseItem;
      }),
    );
    items = resolved
      .filter((it) => it.heroUrl !== null)
      // Chronological-ish display: by first_flight ascending. Older
      // observatories first so the strip reads as a timeline of how
      // our cosmic vision has expanded.
      .sort((a, b) => a.entry.first_flight.localeCompare(b.entry.first_flight));
    loading = false;
  });
</script>

<section
  class="observatory-showcase"
  aria-label="Observatory showcase — one hero image per orbital observatory"
>
  <header>
    <h2>The actual telescopes</h2>
    <p class="caption">
      One signature image per observatory in Orrery's fleet — click any to drop into that
      observatory's full gallery + technical panel. Listed by first-flight date, so the strip reads
      as a timeline of how our cosmic vision has expanded.
    </p>
  </header>

  {#if loading}
    <p class="status">Loading observatory imagery…</p>
  {:else if items.length === 0}
    <p class="status">No observatory imagery available yet.</p>
  {:else}
    <ul class="strip">
      {#each items as item (item.entry.id)}
        <li>
          <a class="card" href="{base}/fleet?id={item.entry.id}">
            <figure>
              <img src={item.heroUrl} alt="{item.entry.name} hero image" loading="lazy" />
              <figcaption>
                <span class="name">{item.entry.name}</span>
                <span class="meta">
                  <span class="agency">{item.entry.agency}</span>
                  <span class="year">{item.entry.first_flight.slice(0, 4)}</span>
                </span>
              </figcaption>
            </figure>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .observatory-showcase {
    margin: 24px 0 32px;
    padding: 16px 0;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  header {
    margin-bottom: 14px;
  }
  h2 {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 22px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.95);
    margin: 0 0 6px;
  }
  .caption {
    font-family: 'Crimson Pro', serif;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    font-style: italic;
    margin: 0;
    line-height: 1.5;
  }
  .status {
    color: rgba(255, 255, 255, 0.55);
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    padding: 16px 0;
  }

  /* Horizontal scroll strip on narrow viewports; CSS grid on wider. */
  .strip {
    display: grid;
    grid-template-columns: repeat(6, minmax(140px, 1fr));
    gap: 10px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  @media (max-width: 900px) {
    .strip {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding-bottom: 4px;
    }
    .strip li {
      flex: 0 0 160px;
      scroll-snap-align: start;
    }
  }
  li {
    margin: 0;
  }
  .card {
    display: block;
    color: inherit;
    text-decoration: none;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    overflow: hidden;
    transition:
      border-color 120ms,
      transform 120ms;
  }
  .card:hover,
  .card:focus-visible {
    border-color: rgba(78, 205, 196, 0.5);
    transform: translateY(-2px);
    outline: none;
  }
  figure {
    margin: 0;
  }
  img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    background: rgba(255, 255, 255, 0.04);
  }
  figcaption {
    padding: 6px 8px 8px;
    font-family: 'Space Mono', monospace;
  }
  .name {
    display: block;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.92);
    letter-spacing: 0.5px;
    line-height: 1.3;
  }
  .meta {
    display: flex;
    justify-content: space-between;
    margin-top: 2px;
    font-size: 8px;
    letter-spacing: 1.5px;
    color: rgba(255, 255, 255, 0.5);
  }
  .agency {
    text-transform: uppercase;
  }
  .year {
    color: #4ecdc4;
  }
</style>

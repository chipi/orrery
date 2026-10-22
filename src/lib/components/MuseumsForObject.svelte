<!--
  "You can see this in…" (PRD-027): every museum showing the real object
  (flown, or a real flight backup), with what exactly is there, a button to
  the museum's website and a link to its card on the /earth globe. Renders
  nothing when no museum holds the object.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { localeFromPage } from '$lib/locale';
  import { getMuseums, museumsForObject, holdingNotYetOpen } from '$lib/data';
  import type { MuseumForObject } from '$types/museum';
  import * as m from '$lib/paraglide/messages';

  /** Fleet entry id, or a `/science/history/<slug>` page path. */
  let { objectRef }: { objectRef: string } = $props();

  let rows = $state<MuseumForObject[]>([]);
  const locale = $derived(localeFromPage(page));

  $effect(() => {
    const ref = objectRef;
    const loc = locale;
    let live = true;
    getMuseums(loc)
      .then((all) => {
        if (live) rows = museumsForObject(all, ref);
      })
      .catch(() => {
        if (live) rows = [];
      });
    return () => {
      live = false;
    };
  });

  function opens(from: string): string {
    const d = new Date(`${from}T12:00:00Z`);
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(d);
    } catch {
      return from;
    }
  }
</script>

{#if rows.length > 0}
  <section class="museums" data-testid="museums-for-object" aria-labelledby="museums-heading">
    <h4 id="museums-heading">{m.museum_block_heading()}</h4>
    <ul>
      {#each rows as r (r.museum.id)}
        <li data-testid="museum-row" data-museum-id={r.museum.id}>
          <div class="where">
            <span class="name">{r.museum.name}</span>
            <span class="city">{r.museum.city}</span>
          </div>
          {#if r.item}<p class="item">{r.item}</p>{/if}
          {#if r.holding.from && holdingNotYetOpen(r.holding)}
            <p class="opens">{m.museum_opens({ date: opens(r.holding.from) })}</p>
          {/if}
          <div class="actions">
            <a
              class="site"
              href={r.museum.website}
              target="_blank"
              rel="noopener noreferrer external"
              data-testid="museum-website">{m.museum_website()}</a
            >
            <a
              class="map"
              href="{base}/earth?museum={r.museum.id}"
              data-testid="museum-on-map"
              data-sveltekit-preload-data="hover">{m.museum_on_map()}</a
            >
          </div>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .museums {
    margin: 14px 0;
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
  }
  h4 {
    margin: 0 0 8px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.5);
    font-weight: normal;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .where {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 8px;
    align-items: baseline;
  }
  .name {
    color: var(--color-text);
    font-size: 14px;
  }
  .city {
    color: var(--color-text-dim);
    font-size: 12px;
  }
  .item {
    margin: 3px 0 0;
    color: rgba(255, 255, 255, 0.75);
    font-size: 13px;
    line-height: 1.45;
  }
  .opens {
    margin: 3px 0 0;
    color: var(--color-gold);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 6px;
  }
  .actions a {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    text-decoration: none;
    padding: 7px 10px;
    border-radius: 4px;
    min-height: 32px;
    display: inline-flex;
    align-items: center;
  }
  .site {
    color: #4ecdc4;
    background: rgba(78, 205, 196, 0.1);
    border: 1px solid rgba(78, 205, 196, 0.4);
  }
  .site:hover,
  .site:focus-visible {
    background: rgba(78, 205, 196, 0.18);
    border-color: #4ecdc4;
  }
  .map {
    color: var(--color-earth);
    border: 1px solid rgba(75, 156, 211, 0.4);
  }
  .map:hover,
  .map:focus-visible {
    border-color: var(--color-earth);
  }
</style>

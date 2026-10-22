<!--
  "Where this is done" (PRD-028): the observatories whose card links this
  science article, each with its place and a link to its card on the
  /earth globe. Renders nothing when no observatory links the article.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { localeFromPage } from '$lib/locale';
  import { getObservatories, observatoriesForArticle } from '$lib/data';
  import type { Observatory } from '$types/observatory';
  import * as m from '$lib/paraglide/messages';

  /** The article's `/science/<tab>/<slug>` path. */
  let { articlePath }: { articlePath: string } = $props();

  let rows = $state<Observatory[]>([]);
  const locale = $derived(localeFromPage(page));

  $effect(() => {
    const path = articlePath;
    const loc = locale;
    let live = true;
    getObservatories(loc)
      .then((all) => {
        if (live) rows = observatoriesForArticle(all, path);
      })
      .catch(() => {
        if (live) rows = [];
      });
    return () => {
      live = false;
    };
  });
</script>

{#if rows.length > 0}
  <section class="observatories" data-testid="observatories-for-article">
    <h2>{m.observatory_block_heading()}</h2>
    <ul>
      {#each rows as o (o.id)}
        <li data-testid="observatory-row" data-observatory-id={o.id}>
          <span class="name">{o.name}</span>
          <span class="place">{o.place}</span>
          <a
            class="map"
            href="{base}/earth?observatory={o.id}"
            data-testid="observatory-on-map"
            data-sveltekit-preload-data="hover">{m.museum_on_map()}</a
          >
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .observatories {
    margin: 24px 0;
  }
  /* Same heading as the article's own sections (.learn-more h2). */
  h2 {
    font-family: var(--font-display);
    font-size: 14px;
    letter-spacing: 3px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 12px;
    font-weight: normal;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 10px;
  }
  .name {
    color: var(--color-text);
    font-size: 15px;
  }
  .place {
    color: var(--color-text-dim);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
  }
  .map {
    color: var(--color-earth);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
    text-decoration: none;
    border: 1px solid rgba(75, 156, 211, 0.4);
    border-radius: 4px;
    padding: 4px 8px;
  }
  .map:hover,
  .map:focus-visible {
    border-color: var(--color-earth);
  }
</style>

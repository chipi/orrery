<!--
  DataSources — the "Data sources" block of an entity page or a detail panel (#658): each
  catalogue an object's values come from, linked to its record, with its paper (an ADS link by
  bibcode), the values it supplied and any note on where catalogues disagree; then the object's
  own pages at SIMBAD / NED / the NASA Exoplanet Archive. Catalogue names, bibcodes and notes are
  proper nouns and English data text; only the heading is localized.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { adsHref, type DataSourceItem } from '$lib/catalogue';

  type Props = {
    items: DataSourceItem[];
    links?: Array<{ label: string; url: string }>;
    /** 'page' is an open section of an entity page; 'panel' folds into a details element. */
    variant?: 'page' | 'panel';
  };
  let { items, links = [], variant = 'page' }: Props = $props();
</script>

{#snippet list()}
  <ul class="ds-list">
    {#each items as it (`${it.label}|${it.bibcode ?? ''}`)}
      <li>
        <a href={it.url} target="_blank" rel="noopener noreferrer external">{it.label}</a>
        {#if it.bibcode}
          <span class="ds-sep">·</span>
          <a
            class="ds-bib"
            href={adsHref(it.bibcode)}
            target="_blank"
            rel="noopener noreferrer external">{it.bibcode}</a
          >
        {/if}
        <span class="ds-fields">{it.fields.join(' · ')}</span>
        {#each it.notes as n (n)}<span class="ds-note">{n}</span>{/each}
      </li>
    {/each}
    {#if links.length}
      <li class="ds-records">
        {#each links as l, i (l.url)}
          {#if i > 0}<span class="ds-sep">·</span>{/if}
          <a href={l.url} target="_blank" rel="noopener noreferrer external">{l.label}</a>
        {/each}
      </li>
    {/if}
  </ul>
{/snippet}

{#if items.length || links.length}
  {#if variant === 'panel'}
    <details class="data-sources panel" data-testid="data-sources">
      <summary class="ui-hit">{m.catalogue_data_sources()}</summary>
      {@render list()}
    </details>
  {:else}
    <section class="data-sources page" data-testid="data-sources">
      <h2 class="page-section-label">{m.catalogue_data_sources()}</h2>
      {@render list()}
    </section>
  {/if}
{/if}

<style>
  .ds-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .ds-list li {
    margin: 0.35rem 0;
    line-height: 1.45;
  }
  .ds-list a {
    color: var(--color-state);
  }
  .ds-bib {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 0.85em;
  }
  .ds-sep {
    margin: 0 0.35em;
    color: var(--color-text-label);
  }
  .ds-fields,
  .ds-note {
    display: block;
    color: var(--color-text-label);
    font-size: 0.85em;
  }
  .panel {
    margin: 0.6rem 0;
    font-size: 0.8rem;
  }
  .panel summary {
    cursor: pointer;
    font-size: var(--size-label);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-label);
  }
</style>

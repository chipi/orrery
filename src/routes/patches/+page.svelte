<!--
  /patches — the insignia gallery. Every program + mission patch Orrery has
  sourced, with per-badge credit + licence. Sister page to /posters under the
  Gallery hub. English-only, matching /posters. Badges + provenance come from
  scripts/fetch-badges.ts (badges.json + badge-provenance.json).

  The cards are the catalogue's (EntityCard in an `entity-card-grid`, UXD-048): the same photo slot,
  the same grid, the same type; an insignia is shown whole (`fit="contain"`) with a compact body of
  its name and its credit line.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { metaDescription } from '$lib/seo';
  import { assetOrigin } from '$lib/asset-url';
  import * as m from '$lib/paraglide/messages';
  import { localizeHref } from '$lib/paraglide/runtime';
  import type { PageData } from './$types';
  import { licenseLabel } from '$lib/license-label';
  import EntityCard from '$lib/components/EntityCard.svelte';

  let { data }: { data: PageData } = $props();

  type Badge = PageData['programs'][number];
</script>

<svelte:head>
  <title>{m.gallery_insignia_title()} · {m.layout_footer_gallery()} · Orrery</title>
  <meta name="description" content={metaDescription(m.patches_meta_description())} />
</svelte:head>

{#snippet badges(items: Badge[])}
  <ul class="entity-card-grid">
    {#each items as p (p.key)}
      <EntityCard
        photo="{assetOrigin}{p.img}"
        ladder={false}
        alt={m.patches_alt({ name: p.name })}
        name={p.name}
        nameLines={2}
        level={3}
        fit="contain"
        body="compact"
      >
        {#snippet extra()}
          {#if p.credit}
            <a href={p.credit.source_url} target="_blank" rel="noopener noreferrer"
              >{p.credit.author} · {licenseLabel(p.credit.license_short)}</a
            >
          {/if}
        {/snippet}
      </EntityCard>
    {/each}
  </ul>
{/snippet}

<article class="patches page-shell" data-route-ready="true">
  <header>
    <nav class="crumb page-crumb">
      <a href="{base}{localizeHref('/gallery')}">{m.layout_footer_gallery()}</a><span class="sep"
        >›</span
      ><span>{m.patches_crumb()}</span>
    </nav>
    <h1 class="page-title">{m.patches_h1()}</h1>
    <p class="lede page-lead">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- safe: m.*() output + base path, no user input -->
      {@html m.patches_lede({
        link: `<a href="${base}${localizeHref('/sourcing')}">${m.patches_link_sourcing()}</a>`,
      })}
    </p>
  </header>

  <section class="group">
    <h2 class="page-section-label page-section-label--rule">{m.patches_group_programs()}</h2>
    {@render badges(data.programs)}
  </section>

  <section class="group">
    <h2 class="page-section-label page-section-label--rule">{m.patches_group_missions()}</h2>
    {@render badges(data.missions)}
  </section>

  {#if data.fleet.length}
    <section class="group">
      <h2 class="page-section-label page-section-label--rule">{m.credits_category_fleet()}</h2>
      {@render badges(data.fleet)}
    </section>
  {/if}

  <footer class="page-note">
    <p>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- safe: m.*() output + base path, no user input -->
      {@html m.patches_footer({
        sourcing: `<a href="${base}${localizeHref('/sourcing')}">${m.patches_footer_link_sourcing()}</a>`,
        colophon: `<a href="${base}${localizeHref('/colophon')}">${m.patches_footer_link_colophon()}</a>`,
      })}
    </p>
  </footer>
</article>

<style>
  .crumb a {
    text-decoration: underline;
  }
  .crumb .sep {
    margin: 0 8px;
  }
  /* a2-keep: link colour inside the lead; slice A3 owns colour */
  .lede :global(a) {
    color: var(--color-state);
  }
</style>

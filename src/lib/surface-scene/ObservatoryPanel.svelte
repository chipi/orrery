<!--
  Observatory card on the /earth globe (PRD-028): what is done there, its
  highlights, a button to its website, the science articles it
  illustrates, and the film line where there is one.
-->
<script lang="ts">
  import { page } from '$app/state';
  import Panel from '$lib/components/Panel.svelte';
  import PlaceHero from '$lib/components/PlaceHero.svelte';
  import { getScienceSection } from '$lib/data';
  import { localeFromPage, localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import type { Observatory } from '$types/observatory';
  import type { ScienceTabId } from '$types/science';

  interface Props {
    observatory: Observatory | null;
    open: boolean;
    onClose: () => void;
  }
  let { observatory, open, onClose }: Props = $props();

  type Article = { path: string; title: string };
  let articles = $state<Article[]>([]);
  const locale = $derived(localeFromPage(page));

  const KIND: Record<Observatory['kind'], () => string> = {
    radio: m.observatory_kind_radio,
    optical: m.observatory_kind_optical,
    'deep-space': m.observatory_kind_deep_space,
    seti: m.observatory_kind_seti,
  };
  const STATUS: Record<Observatory['status'], () => string> = {
    active: m.observatory_status_active,
    historic: m.observatory_status_historic,
    building: m.observatory_status_building,
  };

  $effect(() => {
    const o = observatory;
    const loc = locale;
    if (!o) {
      articles = [];
      return;
    }
    let live = true;
    Promise.all(
      o.science.map(async (path) => {
        const [, , tab, slug] = path.split('/');
        const s = await getScienceSection(tab as ScienceTabId, slug, loc).catch(() => null);
        return { path, title: s?.title ?? slug };
      }),
    ).then((a) => {
      if (live) articles = a;
    });
    return () => {
      live = false;
    };
  });
</script>

<Panel {open} title={observatory?.name ?? ''} {onClose}>
  {#snippet eyebrow()}
    {#if observatory}
      <div class="tags">
        <span class="tag kind">{KIND[observatory.kind]()}</span>
        <span class="tag status status-{observatory.status}">{STATUS[observatory.status]()}</span>
      </div>
    {/if}
  {/snippet}
  {#snippet heading()}
    {#if observatory}<h1 class="name">{observatory.name}</h1>{/if}
  {/snippet}

  {#if observatory}
    <div class="obs" data-testid="observatory-panel" data-observatory-id={observatory.id}>
      <PlaceHero src="/images/observatories/{observatory.id}/01.webp" {locale} />
      <p class="place">
        {observatory.place}{#if observatory.since}
          · {m.observatory_since({ year: observatory.since.slice(0, 4) })}{/if}
      </p>
      <p class="description">{observatory.description}</p>
      <a
        class="site"
        href={observatory.website}
        target="_blank"
        rel="noopener noreferrer external"
        data-testid="observatory-website">{m.observatory_website()}</a
      >
      {#if observatory.highlights.length > 0}
        <h3>{m.observatory_highlights()}</h3>
        <ul class="highlights">
          {#each observatory.highlights as h, i (i)}
            <li>{h}</li>
          {/each}
        </ul>
      {/if}
      {#if articles.length > 0}
        <h3>{m.observatory_learn()}</h3>
        <ul class="articles">
          {#each articles as a (a.path)}
            <li>
              <a
                href={localHref(a.path)}
                data-testid="observatory-article"
                data-sveltekit-preload-data="hover">{a.title}</a
              >
            </li>
          {/each}
        </ul>
      {/if}
      {#if observatory.film}
        <h3>{m.observatory_film()}</h3>
        <p class="film">{observatory.film}</p>
      {/if}
    </div>
  {/if}
</Panel>

<style>
  .obs {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .tag {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 3px 7px;
    border-radius: 3px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
    color: var(--color-state);
  }
  .status-historic {
    border-color: rgba(255, 255, 255, 0.3);
    color: rgba(255, 255, 255, 0.7);
  }
  .status-building {
    border-color: rgba(255, 200, 80, 0.5);
    color: var(--color-gold);
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1.05;
    margin: 0;
  }
  .place {
    margin: 0;
    color: var(--color-text-dim);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
  }
  .description,
  .film {
    margin: 0;
    color: rgba(255, 255, 255, 0.85);
    font-size: 14px;
    line-height: 1.5;
  }
  .site {
    align-self: flex-start;
    color: var(--color-state);
    background: var(--color-accent-soft);
    border: 1px solid var(--color-accent-edge);
    border-radius: 4px;
    padding: 8px 12px;
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
  }
  .site:hover,
  .site:focus-visible {
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    border-color: var(--color-accent);
  }
  h3 {
    margin: 8px 0 0;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    font-weight: normal;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-label);
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .highlights li {
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
    line-height: 1.45;
    padding-left: 12px;
    border-left: 2px solid var(--color-accent-edge);
  }
  .articles a {
    color: var(--color-earth);
    text-decoration: none;
    font-size: 14px;
  }
  .articles a:hover,
  .articles a:focus-visible {
    text-decoration: underline;
  }
</style>

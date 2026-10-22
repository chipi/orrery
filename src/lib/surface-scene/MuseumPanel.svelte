<!--
  Museum card on the /earth globe (PRD-027): where the museum is, a short
  description, a button to its website, and the real Orrery objects it
  shows, each linking to that object's page.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import Panel from '$lib/components/Panel.svelte';
  import PlaceHero from '$lib/components/PlaceHero.svelte';
  import { getFleet, getFleetIndex, getScienceSection, holdingNotYetOpen } from '$lib/data';
  import { localeFromPage } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import type { Museum } from '$types/museum';
  import type { ScienceTabId } from '$types/science';

  interface Props {
    museum: Museum | null;
    open: boolean;
    onClose: () => void;
  }
  let { museum, open, onClose }: Props = $props();

  type Row = { ref: string; name: string; href: string; item: string; from?: string };
  let rows = $state<Row[]>([]);
  const locale = $derived(localeFromPage(page));

  async function objectName(ref: string, loc: string): Promise<{ name: string; href: string }> {
    if (ref.startsWith('/science/')) {
      const [, , tab, slug] = ref.split('/');
      const s = await getScienceSection(tab as ScienceTabId, slug, loc).catch(() => null);
      return { name: s?.title ?? slug, href: `${base}${ref}` };
    }
    const idx = await getFleetIndex();
    const entry = idx.find((e) => e.id === ref);
    const full = entry ? await getFleet(ref, entry.category, loc).catch(() => null) : null;
    return { name: full?.name ?? entry?.name ?? ref, href: `${base}/fleet?id=${ref}` };
  }

  $effect(() => {
    const mu = museum;
    const loc = locale;
    if (!mu) {
      rows = [];
      return;
    }
    let live = true;
    Promise.all(
      mu.holds.map(async (h) => {
        const { name, href } = await objectName(h.ref, loc);
        return { ref: h.ref, name, href, item: mu.items[h.ref] ?? '', from: h.from };
      }),
    ).then((r) => {
      if (live) rows = r;
    });
    return () => {
      live = false;
    };
  });

  function opens(from: string): string {
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(
        new Date(`${from}T12:00:00Z`),
      );
    } catch {
      return from;
    }
  }
</script>

<Panel {open} title={museum?.name ?? ''} {onClose}>
  {#if museum}
    <div class="museum" data-testid="museum-panel" data-museum-id={museum.id}>
      <PlaceHero src="/images/museums/{museum.id}/01.webp" {locale} />
      <h1 class="name">{museum.name}</h1>
      <p class="city">{museum.city}</p>
      <p class="description">{museum.description}</p>
      <a
        class="site"
        href={museum.website}
        target="_blank"
        rel="noopener noreferrer external"
        data-testid="museum-panel-website">{m.museum_website()}</a
      >
      <h3>{m.museum_card_heading()}</h3>
      <ul>
        {#each rows as r (r.ref)}
          <li data-testid="museum-panel-object">
            <a href={r.href} data-sveltekit-preload-data="hover">{r.name}</a>
            {#if r.item}<p class="item">{r.item}</p>{/if}
            {#if r.from && holdingNotYetOpen({ from: r.from })}
              <p class="opens">{m.museum_opens({ date: opens(r.from) })}</p>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</Panel>

<style>
  .museum {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 28px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1.05;
    margin: 0;
  }
  .city {
    margin: 0;
    color: var(--color-text-dim);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 12px;
  }
  .description {
    margin: 0;
    color: rgba(255, 255, 255, 0.85);
    font-size: 14px;
    line-height: 1.5;
  }
  .site {
    align-self: flex-start;
    color: #4ecdc4;
    background: rgba(78, 205, 196, 0.1);
    border: 1px solid rgba(78, 205, 196, 0.4);
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
    background: rgba(78, 205, 196, 0.18);
    border-color: #4ecdc4;
  }
  h3 {
    margin: 8px 0 0;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 10.5px;
    font-weight: normal;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.5);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  li a {
    color: var(--color-earth);
    text-decoration: none;
    font-size: 14px;
  }
  li a:hover,
  li a:focus-visible {
    text-decoration: underline;
  }
  .item {
    margin: 2px 0 0;
    color: rgba(255, 255, 255, 0.75);
    font-size: 13px;
    line-height: 1.45;
  }
  .opens {
    margin: 2px 0 0;
    color: var(--color-gold);
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
  }
</style>

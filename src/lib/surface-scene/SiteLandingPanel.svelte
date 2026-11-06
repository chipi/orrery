<!--
  Top of a surface site's STORY tab (#641): the anatomy drawings of what
  is on the surface (site-anatomy.ts), each opening full-size and linking to
  its fleet entry. Styled as /fleet's anatomy figure.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { localHref } from '$lib/locale';
  import { loadLadder, ladderSources } from '$lib/image-srcset';
  import { getFleet, getFleetIndex } from '$lib/data/fleet';
  import { dataLoadFailed } from '$lib/data/core';
  import type { SiteAnatomy } from '$lib/surface-scene/site-anatomy';

  let {
    anatomy,
    locale,
    onOpen,
  }: {
    anatomy: SiteAnatomy[];
    locale: string;
    onOpen: (src: string) => void;
  } = $props();

  let ladderReady = $state(false);
  loadLadder()
    .then(() => (ladderReady = true))
    .catch(dataLoadFailed);

  // Each craft's name in the page's locale: the base index gives the
  // category, then only those one or two entries' overlays are read.
  let names = $state<Record<string, string>>({});
  $effect(() => {
    const ids = anatomy.map((a) => a.fleetId);
    let current = true;
    void (async () => {
      const index = await getFleetIndex();
      const found: Record<string, string> = {};
      for (const id of ids) {
        const base = index.find((e) => e.id === id);
        if (!base) continue;
        const entry = await getFleet(id, base.category, locale).catch(() => null);
        found[id] = entry?.name ?? base.name;
      }
      if (current) names = found;
    })().catch(dataLoadFailed);
    return () => {
      current = false;
    };
  });
</script>

<section class="landing" data-testid="site-landing">
  <h3 class="landing-heading">{m.programs_on_surface()}</h3>
  {#each anatomy as a (a.fleetId)}
    {@const name = names[a.fleetId] ?? a.fleetId}
    {@const ladder = ladderReady ? ladderSources(a.src) : null}
    <figure class="anatomy">
      <button
        type="button"
        class="anatomy-open"
        onclick={() => onOpen(a.src)}
        aria-label={m.fleet_anatomy_open_aria({ name })}
      >
        <img
          src={ladder?.src ?? a.src}
          srcset={ladder?.srcset}
          sizes="(max-width: 640px) 100vw, 480px"
          alt={m.fleet_anatomy_alt({ name })}
          loading="lazy"
          decoding="async"
        />
      </button>
      <figcaption>
        <a class="fleet-link" href={localHref(`/fleet?id=${a.fleetId}`)}
          >{m.plan_view_in_fleet({ label: name })} →</a
        >
      </figcaption>
    </figure>
  {/each}
  <p class="anatomy-caption">{m.fleet_anatomy_caption()}</p>
</section>

<style>
  .landing {
    display: flex;
    flex-direction: column;
    gap: 12px;
    /* The site's story follows in the same tab. */
    margin-bottom: 24px;
  }
  .landing-heading {
    margin: 0;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    font-weight: 400;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--body-tint, rgba(255, 255, 255, 0.6));
  }
  .anatomy {
    margin: 0;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 12px;
    text-align: center;
  }
  .anatomy-open {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    cursor: zoom-in;
  }
  .anatomy img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0 auto;
  }
  figcaption {
    margin-top: 8px;
  }
  .fleet-link {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 0.08em;
    color: var(--body-tint, #8fb4ff);
  }
  .anatomy-caption {
    margin: 0;
    font-family: 'Crimson Pro', Georgia, serif;
    font-style: italic;
    font-size: 11.5px;
    color: rgba(255, 255, 255, 0.5);
  }
</style>

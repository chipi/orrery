<!--
  ExoplanetPanel — detail panel for a single planet in a /explore v2 BodyScene
  (Slice 2). Mirrors the shared Panel + detail-panel family (StarPanel/PlanetPanel):
  header + a technical grid of the planet's real orbital elements (period / a / e)
  plus radius, mass, and discovery metadata from the NASA Exoplanet Archive. An
  honest caption notes the scene is not to scale and the body procedural.
-->
<script lang="ts">
  import Panel from './Panel.svelte';
  import LearnLink from './LearnLink.svelte';
  import CultureDoorCard from './CultureDoorCard.svelte';
  import type { ExoplanetPlanet, ExoplanetOverlay, LocalizedCultureDoor } from '$lib/data';
  import * as m from '$lib/paraglide/messages';

  type Props = {
    planet: ExoplanetPlanet | null;
    hostName: string;
    overlay?: ExoplanetOverlay | null;
    cultureDoors?: LocalizedCultureDoor[];
    open: boolean;
    onClose: () => void;
  };
  let { planet, hostName, overlay = null, cultureDoors = [], open, onClose }: Props = $props();

  type LinkItem = NonNullable<ExoplanetOverlay['links']>[number];
  let library = $derived.by(() => {
    const order = { intro: 0, core: 1, deep: 2 } as const;
    return [...(overlay?.links ?? [])].sort((a, b) => order[a.t] - order[b.t]) as LinkItem[];
  });

  const fmt = (n: number, dp = 2): string =>
    n.toLocaleString(undefined, { maximumFractionDigits: dp });
  let title = $derived(planet ? planet.name : '');
</script>

<Panel {open} {onClose} {title}>
  {#if planet}
    <div class="head">
      <div class="kind">{m.exo_kind()} · {hostName}</div>
      <div class="name">{planet.name}</div>
    </div>

    {#if overlay?.fact}<p class="editorial">{overlay.fact}</p>{/if}
    {#if overlay?.bio}<p class="prose">{overlay.bio}</p>{/if}

    <div class="grid">
      <div class="cell">
        <div class="cell-label">{m.exo_label_period()}</div>
        <div class="cell-value teal">{fmt(planet.period_days, 3)} {m.exo_days()}</div>
      </div>
      <div class="cell">
        <div class="cell-label">{m.exo_label_axis()}</div>
        <div class="cell-value">{fmt(planet.a_au, 4)} AU</div>
      </div>
      <div class="cell">
        <div class="cell-label">{m.exo_label_eccentricity()}</div>
        <div class="cell-value">{fmt(planet.e, 3)}</div>
      </div>
      {#if planet.radius_earth != null}
        <div class="cell">
          <div class="cell-label">{m.exo_label_radius()}</div>
          <div class="cell-value">{fmt(planet.radius_earth, 2)} R⊕</div>
        </div>
      {/if}
      {#if planet.mass_earth != null}
        <div class="cell">
          <div class="cell-label">{m.exo_label_mass()}</div>
          <div class="cell-value">{fmt(planet.mass_earth, 2)} M⊕</div>
        </div>
      {/if}
      {#if planet.disc_year != null}
        <div class="cell">
          <div class="cell-label">{m.exo_label_discovery()}</div>
          <div class="cell-value">
            {planet.disc_year}{planet.disc_method ? ` · ${planet.disc_method}` : ''}
          </div>
        </div>
      {/if}
    </div>

    <p class="caption">{m.exo_caption()}</p>

    {#if cultureDoors.length > 0}
      <h3 class="library-heading">{m.culture_heading()}</h3>
      {#each cultureDoors as door (door.id)}
        <CultureDoorCard {door} />
      {/each}
    {/if}

    {#if library.length > 0}
      <div class="science-library">
        <h3 class="library-heading">{m.science_learn_more()}</h3>
        <ul class="learn-list">
          {#each library as l (l.u)}
            <li><LearnLink entityId={planet.id} url={l.u} label={l.l} /></li>
          {/each}
        </ul>
      </div>
    {/if}
  {/if}
</Panel>

<style>
  .head {
    padding: 0 0 12px;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 12px;
  }
  .kind {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
  }
  .name {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 36px;
    letter-spacing: 3px;
    color: var(--color-text);
    line-height: 1;
    margin: 6px 0 0;
  }
  .grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px 16px;
  }
  .cell-label {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.45);
    margin-bottom: 2px;
  }
  .cell-value {
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.92);
  }
  .cell-value.teal {
    color: #4ecdc4;
  }
  .caption {
    font-family: 'Space Mono', monospace;
    font-size: 8px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    margin: 14px 0 0;
    line-height: 1.5;
  }
  .editorial {
    font-family: 'Crimson Pro', serif;
    font-style: italic;
    font-size: 14px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.85);
    margin: 0 0 12px;
  }
  .prose {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.82);
    margin: 0 0 12px;
  }
  .science-library {
    margin-top: 16px;
  }
  .library-heading {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 8px;
  }
  .learn-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .learn-list :global(a) {
    color: #4ecdc4;
    text-decoration: none;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    letter-spacing: 1px;
    padding: 8px 10px;
    background: rgba(78, 205, 196, 0.06);
    border: 1px solid rgba(78, 205, 196, 0.25);
    border-radius: 3px;
    display: block;
  }
  .learn-list :global(a:hover),
  .learn-list :global(a:focus-visible) {
    background: rgba(78, 205, 196, 0.14);
    border-color: rgba(78, 205, 196, 0.5);
    outline: none;
  }
</style>

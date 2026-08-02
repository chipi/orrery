<!--
  /essays — The Long View index. Long-form essays that cut across the atlas,
  grouped into the series' five movements (the spiral). Cards deep-link into
  each essay; the essays deep-link back into missions / fleet / science.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { localizeHref } from '$lib/paraglide/runtime';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // The spiral, in order. Essays without a listed movement fall to the end.
  const MOVEMENTS: { key: string; label: string; blurb: string }[] = [
    {
      key: 'into-the-dark',
      label: 'Into the Dark',
      blurb:
        'The fundamentals of going — how we find our way, move, and stay in touch where there are no roads.',
    },
    {
      key: 'the-machines',
      label: 'The Machines',
      blurb:
        'How we build the going — leaving the ground, and the exits beyond the chemical rocket.',
    },
    {
      key: 'the-destinations',
      label: 'The Destinations',
      blurb:
        'Where we are actually going — the Moon we keep relearning, the Mars that breaks every plan, and the rocks worth more as fuel than as gold.',
    },
    {
      key: 'arrival-and-the-body',
      label: 'Arrival & the Body',
      blurb:
        'The cost of getting there — the violence of landing, and the fragile traveller the whole enterprise exists to carry.',
    },
    {
      key: 'the-far-horizon',
      label: 'The Far Horizon',
      blurb:
        'The honest edge of the map — the arithmetic of the stars, and the ship that would have to become a world.',
    },
  ];

  let groups = $derived(
    MOVEMENTS.map((mv) => ({
      ...mv,
      essays: data.essays.filter((e) => e.movement === mv.key).sort((a, b) => a.order - b.order),
    })).filter((g) => g.essays.length),
  );
</script>

<svelte:head>
  <title>The Long View · Essays · Orrery</title>
  <meta
    name="description"
    content="The Long View — long-form essays on how we reach into the solar system: navigation, propulsion, reuse, and the long history of getting anywhere."
  />
</svelte:head>

<section class="longview" data-route-ready="true">
  <header class="head">
    <h1>The Long View</h1>
    <p class="intro">
      Essays that step back from any one mission and take in the whole subject — how we find our way
      out there, how we get off the ground, how we go farther, and what seventy years of it all adds
      up to. One story, told in a spiral.
    </p>
  </header>

  {#each groups as g (g.key)}
    <section class="movement">
      <h2>{g.label}</h2>
      <p class="mv-blurb">{g.blurb}</p>
      <div class="cards">
        {#each g.essays as e (e.slug)}
          <a class="card" href="{base}{localizeHref(`/essays/${e.slug}`)}">
            <h3>{e.title}</h3>
            <p class="card-dek">{e.dek}</p>
            <span class="go">Read →</span>
          </a>
        {/each}
      </div>
    </section>
  {/each}
</section>

<style>
  .longview {
    max-width: 1000px;
    margin: 0 auto;
    padding: calc(var(--nav-height, 64px) + 28px) 20px 96px;
    color: var(--color-text, #eef);
  }
  h1 {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: clamp(48px, 10vw, 84px);
    letter-spacing: 1px;
    margin: 0 0 14px;
  }
  .intro {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 20px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
    max-width: 64ch;
    margin: 0 0 8px;
  }
  .movement {
    margin-top: 44px;
  }
  .movement h2 {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 13px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #7fb0e0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 18px;
    margin: 0 0 4px;
  }
  .mv-blurb {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.5);
    margin: 0 0 18px;
    max-width: 60ch;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px;
    background: rgba(18, 24, 38, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition:
      border-color 0.15s,
      transform 0.15s;
  }
  .card:hover {
    border-color: rgba(127, 176, 224, 0.6);
    transform: translateY(-2px);
  }
  .card h3 {
    font-family: 'Bebas Neue', 'Space Mono', sans-serif;
    font-size: 26px;
    letter-spacing: 0.5px;
    margin: 0;
    color: #fff;
  }
  .card-dek {
    font-family: 'Crimson Pro', Georgia, serif;
    font-size: 15.5px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.68);
    margin: 0;
    flex: 1;
  }
  .go {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
    letter-spacing: 1px;
    color: #7fb0e0;
  }
</style>

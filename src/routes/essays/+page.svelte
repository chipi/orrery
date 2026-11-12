<!--
  /essays — The Long View index. Long-form essays that cut across the atlas,
  grouped into the series' five movements (the spiral). Cards deep-link into
  each essay; the essays deep-link back into missions / fleet / science.
-->
<script lang="ts">
  import { metaDescription, seoPageTitle } from '$lib/seo';
  import { responsive } from '$lib/responsive-image.svelte';
  import { IMAGE_SIZES } from '$lib/image-sizes';
  import { base } from '$app/paths';
  import { localizeHref } from '$lib/paraglide/runtime';
  import { assetUrl } from '$lib/asset-url';
  import LongViewHero from '$lib/components/LongViewHero.svelte';
  import { essayPlainText } from '$lib/essay-md';
  import * as m from '$lib/paraglide/messages';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  // Resolve an essay image ref (e.g. `essays/<slug>/<name>`) to its webp — mirrors
  // the per-essay page's helper so the landing can show each essay's hero.
  function imgSrc(ref: string): string {
    const [coll, id, n] = ref.split('/');
    if (coll === 'essays' && id && n) return assetUrl(`/images/essays/${id}/${n}.webp`);
    return assetUrl(`/images/${ref}.webp`);
  }

  // The spiral, in order. Essays without a listed movement fall to the end.
  const MOVEMENTS: { key: string; label: string; blurb: string }[] = [
    { key: 'into-the-dark', label: m.essays_mv_dark(), blurb: m.essays_mv_dark_blurb() },
    { key: 'the-machines', label: m.essays_mv_machines(), blurb: m.essays_mv_machines_blurb() },
    {
      key: 'the-destinations',
      label: m.essays_mv_destinations(),
      blurb: m.essays_mv_destinations_blurb(),
    },
    {
      key: 'arrival-and-the-body',
      label: m.essays_mv_arrival(),
      blurb: m.essays_mv_arrival_blurb(),
    },
    { key: 'the-far-horizon', label: m.essays_mv_horizon(), blurb: m.essays_mv_horizon_blurb() },
  ];

  let groups = $derived(
    MOVEMENTS.map((mv) => ({
      ...mv,
      essays: data.essays.filter((e) => e.movement === mv.key).sort((a, b) => a.order - b.order),
    })).filter((g) => g.essays.length),
  );
</script>

<svelte:head>
  <title
    >{seoPageTitle(
      m.essays_seo_title(),
      `${m.essays_title()} · ${m.essays_label()} · Orrery`,
    )}</title
  >
  <meta name="description" content={metaDescription(m.essays_seo_description())} />
</svelte:head>

<section class="longview page-shell" data-route-ready="true">
  <header class="head">
    <LongViewHero />
    <p class="intro page-lead">{m.essays_intro()}</p>
  </header>

  {#each groups as g (g.key)}
    <section class="movement">
      <h2 class="page-section-label page-section-label--rule">{g.label}</h2>
      <p class="mv-blurb">{g.blurb}</p>
      <div class="cards">
        {#each g.essays as e (e.slug)}
          <a class="card" href="{base}{localizeHref(`/essays/${e.slug}`)}">
            {#if e.hero}
              <img
                class="card-hero"
                {...responsive(imgSrc(e.hero), IMAGE_SIZES.wideCard)}
                alt=""
                loading="lazy"
                decoding="async"
              />
            {/if}
            <h3>{e.title}</h3>
            <p class="card-dek">{essayPlainText(e.dek ?? '')}</p>
            <span class="go">{m.essays_read()}</span>
          </a>
        {/each}
      </div>
    </section>
  {/each}
</section>

<style>
  .movement {
    margin-top: 44px;
  }
  .movement .page-section-label {
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
  /* Full-bleed hero at the top of the card (bleeds out of the 20px padding). */
  .card-hero {
    display: block;
    width: calc(100% + 40px);
    height: 148px;
    margin: -20px -20px 4px;
    object-fit: cover;
    border-radius: 10px 10px 0 0;
    background: rgba(8, 12, 22, 0.6);
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
    color: var(--color-state);
  }
</style>

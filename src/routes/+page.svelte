<script lang="ts">
  import { responsive } from '$lib/responsive-image.svelte';
  import { IMAGE_SIZES } from '$lib/image-sizes';

  // See the about-body markup below — sentinel, not the rendered word.
  const PRIVACY_LINK_TOKEN = '\u0000privacy-link\u0000';
  import { assetOrigin } from '$lib/asset-url';
  import { localHref } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';
  import JsonLd from '$lib/components/JsonLd.svelte';
  import RouteGlyph from '$lib/components/RouteGlyph.svelte';
  import RouteGlyphDefs from '$lib/components/RouteGlyphDefs.svelte';
  import { SCALE_SHELL_CARD_LIST } from '$lib/explore/scale-shell-cards';
  import { website } from '$lib/json-ld';
  import { canonicalUrl, metaDescription } from '$lib/seo';
  import { getLocale } from '$lib/paraglide/runtime';

  // The author's other sites. Names are brands (not translated); the sites are
  // English, hence hreflang.
  const MORE_UTM = '?utm_source=orrery&utm_medium=referral&utm_content=landing_about';
  const MORE_SITES = [
    {
      name: 'Human Copilot',
      href: `https://www.humancopilot.eu/${MORE_UTM}`,
      line: m.landing_more_humancopilot,
    },
    {
      name: 'Air and Space History',
      href: `https://airandspacehistory.com/${MORE_UTM}`,
      line: m.landing_more_airandspace,
    },
  ];
  const jsonLd = $derived(
    website({
      url: canonicalUrl('/', getLocale()),
      inLanguage: getLocale(),
      description: m.landing_meta_description(),
    }),
  );
  import { audio } from '$lib/audio-state.svelte';
  import { audioRegistry } from '$lib/audio-registry.svelte';
  import { CURATOR_FULL_TOUR } from '$lib/audio-tour';
  import { AudioWaveIcon } from '$lib/components/icons';

  // Hero CTA — kicks off the Curator Tour the same way the audio overlay's
  // tour-start button does (AudioOverlay startTourFromSequence). Loads the
  // registry, filters CURATOR_FULL_TOUR to episodes that actually have audio
  // shipped, opens the overlay, starts the tour, and queues the first
  // episode (loadEpisode + playing=true). The $effect in AudioOverlay
  // picks up `audio.playing` and calls audioEl.play() once the overlay's
  // `<audio>` element has mounted.
  async function startCuratorTour(): Promise<void> {
    await audioRegistry.load();
    const available = CURATOR_FULL_TOUR.filter((id) => audioRegistry.byId(id));
    if (available.length === 0) return;
    audio.openOverlay();
    audio.startTour(available, 'curator-full');
    const first = audioRegistry.byId(available[0]);
    if (first) {
      audio.loadEpisode(first);
      audio.playing = true;
    }
  }

  // Card definitions in the canonical order from PRD-013 §scope.
  // Title + description come from message catalogue; route is the
  // canonical app path.
  // Card order matches the Nav (Nav.svelte): explore · missions · fleet ·
  // plan · fly · earth · moon · mars · venus · iss · tiangong · science.
  // Sectioned landing grid (IA.md §home-cards, 2026-08). The home page is a
  // DISCOVERY surface, not the compact wayfinding nav — so it shows every leaf
  // destination with its own rich card, grouped under headers that mirror the nav
  // (Explore · Plan & Fly · Catalog · Learn). Headers reuse the nav labels so the
  // landing teaches the nav's grouping by showing it. Interspersed heading rows
  // span the full grid width (grid-column: 1 / -1).
  // Each card carries a `glyph` id (which hand-drawn icon to render) and an
  // optional `name` (the big label — used when the card doesn't map to a unique
  // route, e.g. the scale shells all share /explore) and `query`.
  type GridCard = {
    route: string;
    query?: string;
    name?: string;
    glyph: string;
    title: string;
    desc: string;
  };
  type GridItem = { heading: string } | GridCard;
  const grid: GridItem[] = $derived([
    // EXPLORE — the zoom-out scale shells (all jump into /explore at a scale).
    { heading: m.nav_group_explore() },
    ...SCALE_SHELL_CARD_LIST.map((s) => ({
      route: '/explore',
      query: s.query,
      name: s.name(),
      glyph: s.glyph,
      title: s.title(),
      desc: s.desc(),
    })),
    // WORLDS — the worlds you can stand on.
    { heading: m.nav_group_worlds() },
    {
      route: '/earth',
      glyph: 'earth',
      title: m.landing_card_earth_title(),
      desc: m.landing_card_earth_desc(),
    },
    {
      route: '/moon',
      glyph: 'moon',
      title: m.landing_card_moon_title(),
      desc: m.landing_card_moon_desc(),
    },
    {
      route: '/mars',
      glyph: 'mars',
      title: m.landing_card_mars_title(),
      desc: m.landing_card_mars_desc(),
    },
    {
      route: '/venus',
      glyph: 'venus',
      title: m.landing_card_venus_title(),
      desc: m.landing_card_venus_desc(),
    },
    // PLAN & FLY — the mission tools.
    { heading: m.landing_section_do_heading() },
    {
      route: '/plan',
      glyph: 'plan',
      title: m.landing_card_plan_title(),
      desc: m.landing_card_plan_desc(),
    },
    {
      route: '/fly',
      glyph: 'fly',
      title: m.landing_card_fly_title(),
      desc: m.landing_card_fly_desc(),
    },
    // CATALOG — the record.
    { heading: m.nav_catalog() },
    {
      route: '/programs',
      glyph: 'programs',
      title: m.landing_card_programs_title(),
      desc: m.landing_card_programs_desc(),
    },
    {
      route: '/missions',
      glyph: 'missions',
      title: m.landing_card_missions_title(),
      desc: m.landing_card_missions_desc(),
    },
    {
      route: '/fleet',
      glyph: 'fleet',
      title: m.landing_card_fleet_title(),
      desc: m.landing_card_fleet_desc(),
    },
    {
      route: '/iss',
      glyph: 'iss',
      title: m.landing_card_iss_title(),
      desc: m.landing_card_iss_desc(),
    },
    {
      route: '/tiangong',
      glyph: 'tiangong',
      title: m.landing_card_tiangong_title(),
      desc: m.landing_card_tiangong_desc(),
    },
    {
      route: '/live',
      glyph: 'live',
      title: m.landing_card_live_title(),
      desc: m.landing_card_live_desc(),
    },
    // LEARN — read + study.
    { heading: m.nav_learn() },
    {
      route: '/lab',
      glyph: 'lab',
      title: m.landing_card_lab_title(),
      desc: m.landing_card_lab_desc(),
    },
    {
      route: '/essays',
      glyph: 'essays',
      title: m.landing_card_essays_title(),
      desc: m.landing_card_essays_desc(),
    },
    {
      route: '/science',
      glyph: 'science',
      title: m.landing_card_science_title(),
      desc: m.landing_card_science_desc(),
    },
  ]);
  const destinationCount = $derived(grid.filter((item) => !('heading' in item)).length);
</script>

<svelte:head>
  <title>{m.landing_page_title()}</title>
  <meta name="description" content={metaDescription(m.landing_meta_description())} />
</svelte:head>
<JsonLd data={jsonLd} />

<article class="landing" data-testid="landing">
  <header class="hero" data-audio-stage="hero">
    <!-- Hero: poster-art orrery illustration (flat-family redesign). -->
    <img
      class="hero-illustration"
      data-audio-stage="hero-illustration"
      {...responsive(`${assetOrigin}/images/app-landing-hero.webp`, IMAGE_SIZES.column)}
      alt={m.landing_hero_aria()}
    />

    <div class="hero-copy">
      <h1 class="wordmark">ORRERY</h1>

      <p class="tagline">{m.landing_hero_tagline()}</p>
      <p class="subhead">{m.landing_hero_subhead()}</p>
      <div class="cta-row">
        <a class="cta cta-primary" href={localHref('/explore')} data-testid="landing-cta-primary">
          {m.landing_cta_primary()}
        </a>
        <button
          type="button"
          class="cta cta-tour"
          data-testid="landing-cta-tour"
          onclick={startCuratorTour}
        >
          <span class="cta-tour-glyph" aria-hidden="true"><AudioWaveIcon size={14} /></span>
          {m.landing_cta_tour()}
        </button>
        <a class="cta cta-secondary" href="#how-it-works">
          {m.landing_cta_secondary()}
        </a>
      </div>
    </div>
  </header>

  <hr class="divider" />

  <section class="prose" aria-labelledby="what-heading">
    <h2 id="what-heading">{m.landing_section_what_heading()}</h2>
    <p>{m.landing_section_what_p1()}</p>
    <p>{m.landing_section_what_p2()}</p>
    <p>{m.landing_section_what_p3()}</p>
  </section>

  <hr class="divider" />

  <section class="prose" aria-labelledby="why-heading">
    <h2 id="why-heading">{m.landing_section_why_heading()}</h2>
    <p>{m.landing_section_why_p1()}</p>
    <p>{m.landing_section_why_p2()}</p>
  </section>

  <hr class="divider" />

  <section class="prose" id="how-it-works" aria-labelledby="tour-heading">
    <h2 id="tour-heading">{m.landing_section_tour_heading()}</h2>
    <p>{m.landing_section_tour_p1()}</p>
    <p>{m.landing_section_tour_p2()}</p>
    <p>{m.landing_section_tour_p3()}</p>
    <p>{m.landing_section_tour_p4()}</p>
  </section>

  <hr class="divider" />

  <section class="route-cards" aria-labelledby="cards-heading">
    <h2 id="cards-heading">{m.landing_section_cards_heading({ count: destinationCount })}</h2>

    <RouteGlyphDefs />

    <ul class="card-grid" data-testid="landing-cards" data-audio-stage="route-grid">
      {#each grid as item ('heading' in item ? item.heading : item.glyph)}
        {#if 'heading' in item}
          <li class="grid-section"><h3 class="grid-section-heading">{item.heading}</h3></li>
        {:else}
          {@const card = item}
          <li>
            <a
              class="card"
              href={localHref(`${card.route}${card.query ?? ''}`)}
              aria-label={`${card.name ?? card.route}: ${card.title}`}
              data-audio-stage="route-card-{card.glyph}"
            >
              <span class="card-head">
                <svg class="card-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                  <RouteGlyph glyph={card.glyph} />
                </svg>
                <span class="card-route">{card.name ?? card.route}</span>
              </span>
              <span class="card-title">{card.title}</span>
              <span class="card-desc">{card.desc}</span>
            </a>
          </li>
        {/if}
      {/each}
    </ul>
  </section>

  <hr class="divider" />

  <section class="footer-block" aria-labelledby="about-heading">
    <h2 id="about-heading" class="about-heading">{m.landing_footer_heading()}</h2>
    <!-- Substitute a sentinel, not the rendered word: `.replace(word, link)`
         would link the first occurrence of that word in the sentence, which is
         correct in en-US by luck and wrong once a translation uses it earlier.
         Same approach as the /credits storage card. -->
    <p class="about-body">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- safe: m.*() output + a localHref path, no user input -->
      {@html m
        .landing_footer_about({ privacy: PRIVACY_LINK_TOKEN })
        .replace(
          PRIVACY_LINK_TOKEN,
          `<a href="${localHref('/privacy')}">${m.landing_footer_privacy_link()}</a>`,
        )}
    </p>
    <h3 class="more-heading">{m.landing_more_heading()}</h3>
    <ul class="more-list">
      {#each MORE_SITES as site (site.href)}
        <li>
          <a href={site.href} hreflang="en" target="_blank" rel="noopener noreferrer">{site.name}</a
          >
          <span class="more-line">— {site.line()}</span>
        </li>
      {/each}
    </ul>
    <!-- Project links live in the persistent site-footer (rendered by
         src/routes/+layout.svelte) so they're available on every route,
         not just here. The About prose stays — the landing is the right
         place for narrative context, the footer strip handles navigation. -->
  </section>
</article>

<style>
  /* Phase 30 (#342) — mobile-first cascade. Base values land at 375 px;
     @media (min-width: 768px) lifts to tablet; (min-width: 1024px)
     lifts to desktop. Output is identical to the pre-Phase-30 desktop-
     first cascade at every breakpoint — pure convention hygiene per
     AGENTS.md § Mobile-first rules. */
  .landing {
    margin: 0 auto;
    padding: 16px 16px 32px;
    color: var(--color-text);
  }

  .hero {
    text-align: center;
    padding-bottom: 24px;
  }
  .hero-illustration {
    display: block;
    /* Break out of the .landing text column and centre on the page so the
       orrery reads ~3-4x larger than the body copy. */
    width: min(720px, 62vw);
    max-width: none;
    height: auto;
    margin: 0 0 24px;
    margin-left: 50%;
    transform: translateX(-50%);
    /* The illustration's backdrop is a touch lighter than --color-bg and
       non-uniform (a faint glow toward the base), so the raw rectangle reads
       as a framed box against the page. Feather all four edges to transparent
       so the orrery melts into the page starfield instead of sitting in a box.
       Two axis gradients intersected = a rectangular edge-vignette. */
    --hero-fade: 8%;
    -webkit-mask-image:
      linear-gradient(
        to right,
        transparent 0,
        #000 var(--hero-fade),
        #000 calc(100% - var(--hero-fade)),
        transparent 100%
      ),
      linear-gradient(
        to bottom,
        transparent 0,
        #000 var(--hero-fade),
        #000 calc(100% - var(--hero-fade)),
        transparent 100%
      );
    -webkit-mask-composite: source-in;
    mask-image:
      linear-gradient(
        to right,
        transparent 0,
        #000 var(--hero-fade),
        #000 calc(100% - var(--hero-fade)),
        transparent 100%
      ),
      linear-gradient(
        to bottom,
        transparent 0,
        #000 var(--hero-fade),
        #000 calc(100% - var(--hero-fade)),
        transparent 100%
      );
    mask-composite: intersect;
  }
  .wordmark {
    font-family: var(--font-display);
    font-size: 48px;
    letter-spacing: 6px;
    line-height: 1;
    margin: 0 0 16px;
    color: var(--color-text);
  }
  .tagline {
    font-size: var(--size-lead);
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.92);
    margin: 0 0 8px;
  }
  .subhead {
    font-family: var(--font-mono), 'Space Mono', monospace;
    font-size: var(--size-body);
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 32px;
  }

  .cta-row {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    gap: 16px;
    flex-wrap: wrap;
  }
  .cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    width: 100%;
    max-width: 320px;
    padding: 14px 28px;
    font-family: var(--font-display);
    font-size: 14px;
    letter-spacing: 2px;
    text-decoration: none;
    border-radius: 4px;
    transition:
      background 120ms,
      border-color 120ms,
      color 120ms;
  }
  .cta-primary {
    border: 1px solid var(--color-accent);
    color: var(--color-state);
    background: transparent;
  }
  .cta-primary:hover,
  .cta-primary:focus-visible {
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    outline: none;
  }
  .cta-tour {
    border: 1px solid color-mix(in srgb, var(--color-accent) 55%, transparent);
    color: #fff;
    background: var(--color-accent-soft);
    cursor: pointer;
    gap: 10px;
  }
  .cta-tour:hover,
  .cta-tour:focus-visible {
    background: color-mix(in srgb, var(--color-accent) 24%, transparent);
    border-color: var(--color-accent);
    outline: none;
  }
  .cta-tour-glyph {
    display: inline-block;
    color: var(--color-state);
  }
  .cta-secondary {
    border: 1px solid transparent;
    color: rgba(255, 255, 255, 0.7);
  }
  .cta-secondary:hover,
  .cta-secondary:focus-visible {
    color: var(--color-state);
    outline: none;
  }
  .cta:focus-visible {
    outline: 2px solid var(--color-accent, var(--color-focus));
    outline-offset: 2px;
  }

  .divider {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin: 40px 0;
  }

  .prose h2,
  section > h2 {
    font-family: var(--font-display);
    font-size: 24px;
    letter-spacing: 2px;
    margin: 0 0 24px;
    color: var(--color-text);
  }
  .prose p {
    font-size: var(--size-body);
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.82);
    margin: 0 0 16px;
  }
  /* The intro paragraph is the page's lead; the rest of the prose reads at body size. */
  #what-heading + p {
    font-size: var(--size-lead);
  }

  .card-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }
  /* Section headers (IA.md §home-cards) — full-width dividers that group the
     cards under nav-mirroring labels. First one sits flush; later ones get top
     breathing room. */
  .grid-section {
    grid-column: 1 / -1;
    margin: 8px 0 -4px;
  }
  .grid-section:first-child {
    margin-top: 0;
  }
  .grid-section-heading {
    font-family: var(--font-display);
    font-size: 13px;
    letter-spacing: 3px;
    color: rgba(255, 255, 255, 0.5); /* 0.45 was 4.45:1, under AA 4.5 */
    margin: 0;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 20px;
    min-height: 180px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    text-decoration: none;
    color: inherit;
    transition:
      transform 150ms ease,
      border-color 150ms ease,
      background 150ms ease;
  }
  .card-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .card-icon {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    display: block;
  }
  .card:hover,
  .card:focus-visible {
    border-color: var(--color-accent-edge);
    background: color-mix(in srgb, var(--color-accent) 4%, transparent);
    transform: translateY(-4px);
    outline: none;
  }
  .card:focus-visible {
    outline: 2px solid var(--color-accent, var(--color-focus));
    outline-offset: 2px;
  }
  .card-route {
    font-family: var(--font-display);
    font-size: 22px;
    letter-spacing: 2px;
    color: var(--color-text);
  }
  .card-title {
    font-size: var(--size-lead);
    color: rgba(255, 255, 255, 0.92);
  }
  .card-desc {
    font-family: var(--font-mono), 'Space Mono', monospace;
    font-size: var(--size-meta);
    line-height: 1.5;
    color: var(--color-text-label);
  }

  .footer-block {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    padding: 24px;
  }
  .about-heading {
    font-family: var(--font-display);
    font-size: 14px;
    letter-spacing: 3px;
    margin: 0 0 12px;
    color: var(--color-text);
  }
  .about-body {
    font-family: var(--font-mono), 'Space Mono', monospace;
    font-size: var(--size-meta);
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }
  .more-heading {
    font-family: var(--font-display);
    font-size: 12px;
    letter-spacing: 2px;
    margin: 20px 0 8px;
    color: var(--color-text);
  }
  .more-list {
    list-style: none;
    margin: 0;
    padding: 0;
    font-family: var(--font-mono), 'Space Mono', monospace;
    font-size: var(--size-meta);
    line-height: 1.7;
  }
  .more-list li + li {
    margin-top: 6px;
  }
  .more-list a {
    color: var(--color-text);
  }
  .more-line {
    color: rgba(255, 255, 255, 0.6);
  }

  /* ─── Tablet enhancement (≥768px) ─────────────────────────── */
  @media (min-width: 768px) {
    .landing {
      padding: 24px 24px 48px;
      max-width: 720px;
    }
    .wordmark {
      font-size: 80px;
      letter-spacing: 8px;
    }
    .hero-illustration {
      margin-bottom: 32px;
    }
    .tagline {
      font-size: 20px;
    }
    .cta {
      width: auto;
      max-width: none;
    }
    .cta-row {
      flex-direction: row;
    }
    .prose h2,
    section > h2 {
      font-size: 32px;
      letter-spacing: 3px;
    }
    .card-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* ─── Desktop enhancement (≥1024px) ───────────────────────── */
  @media (min-width: 1024px) {
    .landing {
      max-width: 880px;
    }
    .wordmark {
      font-size: 96px;
    }
    /* The picture fills the hero's right side, breaks out of the 880 px column toward the window
       edge, and runs behind the intro, whose side of it fades out so the text stays readable. The
       wordmark, the CTAs and the first heading still fit the first screen of a 1366x768 laptop. */
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: center;
      text-align: left;
      padding-bottom: 0;
    }
    .hero-illustration {
      grid-area: 1 / 1;
      justify-self: end;
      width: min(800px, 56vw);
      margin: 0;
      margin-inline-end: calc(-1 * clamp(0px, (100vw - 880px) / 2 - 32px, 260px));
      transform: none;
      --hero-fade: 18%;
      --hero-fade-start: 42%;
      --hero-fade-dir: to right;
      -webkit-mask-image:
        linear-gradient(
          var(--hero-fade-dir),
          transparent 0,
          #000 var(--hero-fade-start),
          #000 calc(100% - var(--hero-fade)),
          transparent 100%
        ),
        linear-gradient(
          to bottom,
          transparent 0,
          #000 var(--hero-fade),
          #000 calc(100% - var(--hero-fade)),
          transparent 100%
        );
      mask-image:
        linear-gradient(
          var(--hero-fade-dir),
          transparent 0,
          #000 var(--hero-fade-start),
          #000 calc(100% - var(--hero-fade)),
          transparent 100%
        ),
        linear-gradient(
          to bottom,
          transparent 0,
          #000 var(--hero-fade),
          #000 calc(100% - var(--hero-fade)),
          transparent 100%
        );
    }
    :global([dir='rtl']) .hero-illustration {
      --hero-fade-dir: to left;
    }
    .hero-copy {
      grid-area: 1 / 1;
      position: relative;
      z-index: 1;
      max-width: 500px;
      text-shadow: 0 1px 12px rgba(4, 4, 12, 0.9);
    }
    .cta-row {
      justify-content: flex-start;
    }
    .tagline {
      font-size: 22px;
    }
    .card-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* ─── TV / 10-foot landscape (RFC-031 S6) — two-panel, fit one viewport ───
     A TV is wide-but-short + D-pad driven; the desktop column (max-width 880px)
     forces a long vertical scroll to reach the route grid. Here the hero + CTAs
     sit left and the route grid sits right, both centred in a single 100svh
     screen — prose + about flow full-width below (optional scroll). Detector
     mirrors the overscan layer in app.css (coarse pointer + no hover + large +
     low-DPR), so it hits TV but excludes desktop and high-DPR tablets. */
  @media (hover: none) and (pointer: coarse) and (min-width: 1100px) and (max-resolution: 1.5dppx) {
    .landing {
      max-width: none;
      width: 100%;
      box-sizing: border-box;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: minmax(100svh, auto);
      align-items: start;
      column-gap: 5vw;
      padding: 0 var(--safe-area-inset-right, 48px) 0 var(--safe-area-inset-left, 48px);
    }
    /* Above the fold: hero left, route grid right. The hero is one centred column again (the
       two-column hero of the desktop query does not fit half a TV screen). The route grid is
       taller than one screen, so its row grows with it and starts at the top (a fixed 100svh row
       with centred items pushed the heading and the first cards above the page top, out of reach);
       the hero stays pinned and centred in the first screen while the cards scroll. */
    .hero {
      grid-column: 1;
      grid-row: 1;
      position: sticky;
      top: 0;
      height: 100svh;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      column-gap: 0;
      align-content: center;
      text-align: center;
      padding-bottom: 0;
    }
    /* Hero present but not dominant. */
    .hero-illustration {
      grid-column: auto;
      grid-row: auto;
      width: min(400px, 26vw);
      margin: 0 0 20px 50%;
      transform: translateX(-50%);
    }
    .hero-copy {
      grid-column: auto;
      grid-row: auto;
    }
    .route-cards {
      grid-column: 2;
      grid-row: 1;
    }
    .wordmark {
      font-size: 64px;
    }
    .subhead {
      margin-bottom: 20px;
    }
    .cta-row {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: center;
    }
    /* Route grid = the actual navigation, kept compact + all in view. */
    .route-cards > h2 {
      margin-top: 0;
    }
    .card-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    /* Everything else drops full-width below the fold. */
    .divider,
    .prose,
    .footer-block {
      grid-column: 1 / -1;
    }
  }

  /* ─── Reduced motion ───────────────────────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    .card {
      transition: none;
    }
    .card:hover,
    .card:focus-visible {
      transform: none;
    }
    .cta {
      transition: none;
    }
  }
</style>

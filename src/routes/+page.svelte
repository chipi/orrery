<script lang="ts">
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { DEFAULT_LOCALE, localeFromPage } from '$lib/locale';
  import * as m from '$lib/paraglide/messages';

  const activeLocale = $derived(localeFromPage($page));

  function withLang(path: string): string {
    return activeLocale === DEFAULT_LOCALE
      ? path
      : `${path}?lang=${encodeURIComponent(activeLocale)}`;
  }

  // Card definitions in the canonical order from PRD-013 §scope.
  // Title + description come from message catalogue; route is the
  // canonical app path.
  // Card order matches the Nav (Nav.svelte): explore · missions · fleet ·
  // plan · fly · earth · moon · mars · iss · tiangong · science.
  const cards = $derived([
    {
      route: '/explore',
      title: m.landing_card_explore_title(),
      desc: m.landing_card_explore_desc(),
    },
    {
      route: '/missions',
      title: m.landing_card_missions_title(),
      desc: m.landing_card_missions_desc(),
    },
    { route: '/fleet', title: m.landing_card_fleet_title(), desc: m.landing_card_fleet_desc() },
    { route: '/plan', title: m.landing_card_plan_title(), desc: m.landing_card_plan_desc() },
    { route: '/fly', title: m.landing_card_fly_title(), desc: m.landing_card_fly_desc() },
    { route: '/earth', title: m.landing_card_earth_title(), desc: m.landing_card_earth_desc() },
    { route: '/moon', title: m.landing_card_moon_title(), desc: m.landing_card_moon_desc() },
    { route: '/mars', title: m.landing_card_mars_title(), desc: m.landing_card_mars_desc() },
    { route: '/iss', title: m.landing_card_iss_title(), desc: m.landing_card_iss_desc() },
    {
      route: '/tiangong',
      title: m.landing_card_tiangong_title(),
      desc: m.landing_card_tiangong_desc(),
    },
    {
      route: '/science',
      title: m.landing_card_science_title(),
      desc: m.landing_card_science_desc(),
    },
  ]);
</script>

<svelte:head>
  <title>{m.landing_page_title()}</title>
  <meta name="description" content={m.landing_meta_description()} />
</svelte:head>

<article class="landing" data-testid="landing">
  <header class="hero">
    <div class="hero-row">
      <!-- Left flourish: a tiny orrery — Sun + three concentric orbits + a planet on each.
           Engineering-blueprint style matching /science diagrams (white stroke, teal accents). -->
      <svg
        class="hero-art hero-art-left"
        viewBox="0 0 160 160"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="80" cy="80" r="4" fill="#ffc850" />
        <circle
          cx="80"
          cy="80"
          r="22"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1"
        />
        <circle
          cx="80"
          cy="80"
          r="44"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          stroke-width="1"
        />
        <circle
          cx="80"
          cy="80"
          r="68"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          stroke-width="1"
          stroke-dasharray="3 3"
        />
        <circle cx="102" cy="80" r="2.5" fill="rgba(255,255,255,0.85)" />
        <circle cx="55" cy="58" r="3" fill="rgba(193,68,14,0.85)" />
        <circle cx="80" cy="148" r="3.5" fill="rgba(78,205,196,0.85)" />
      </svg>

      <h1 class="wordmark">ORRERY</h1>

      <!-- Right flourish: a Hohmann-style transfer arc — inner orbit + outer orbit
           + the elliptical transfer that connects them at perihelion and aphelion. -->
      <svg
        class="hero-art hero-art-right"
        viewBox="0 0 160 160"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="80" cy="80" r="4" fill="#ffc850" />
        <circle
          cx="80"
          cy="80"
          r="28"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1"
        />
        <circle
          cx="80"
          cy="80"
          r="62"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          stroke-width="1"
        />
        <ellipse
          cx="80"
          cy="80"
          rx="45"
          ry="44"
          fill="none"
          stroke="#4ecdc4"
          stroke-width="1.5"
          stroke-dasharray="4 3"
        />
        <circle cx="108" cy="80" r="2.5" fill="rgba(255,255,255,0.85)" />
        <circle cx="18" cy="80" r="3" fill="#4ecdc4" />
      </svg>
    </div>

    <p class="tagline">{m.landing_hero_tagline()}</p>
    <p class="subhead">{m.landing_hero_subhead()}</p>
    <div class="cta-row">
      <a
        class="cta cta-primary"
        href={withLang(`${base}/explore`)}
        data-testid="landing-cta-primary"
      >
        {m.landing_cta_primary()}
      </a>
      <a class="cta cta-secondary" href="#how-it-works">
        {m.landing_cta_secondary()}
      </a>
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

  <section aria-labelledby="cards-heading">
    <h2 id="cards-heading">{m.landing_section_cards_heading()}</h2>
    <ul class="card-grid" data-testid="landing-cards">
      {#each cards as card (card.route)}
        <li>
          <a
            class="card"
            href={withLang(`${base}${card.route}`)}
            aria-label={`${card.route}: ${card.title}`}
          >
            <span class="card-route">{card.route}</span>
            <span class="card-title">{card.title}</span>
            <span class="card-desc">{card.desc}</span>
          </a>
        </li>
      {/each}
    </ul>
  </section>

  <hr class="divider" />

  <section class="footer-block" aria-labelledby="about-heading">
    <h2 id="about-heading" class="about-heading">{m.landing_footer_heading()}</h2>
    <p class="about-body">{m.landing_footer_about()}</p>
    <!-- Project links live in the persistent site-footer (rendered by
         src/routes/+layout.svelte) so they're available on every route,
         not just here. The About prose stays — the landing is the right
         place for narrative context, the footer strip handles navigation. -->
  </section>
</article>

<style>
  .landing {
    max-width: 880px;
    margin: 0 auto;
    padding: 96px 24px 48px;
    color: var(--color-text);
  }

  .hero {
    text-align: center;
    padding-bottom: 24px;
  }
  .hero-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 32px;
    margin: 0 0 16px;
  }
  .hero-art {
    width: 140px;
    height: 140px;
    flex-shrink: 0;
  }
  .wordmark {
    font-family: var(--font-display);
    font-size: 96px;
    letter-spacing: 8px;
    line-height: 1;
    margin: 0;
    color: var(--color-text);
  }
  .tagline {
    font-family: var(--font-editorial), 'Crimson Pro', serif;
    font-style: italic;
    font-size: 22px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.92);
    margin: 0 0 8px;
  }
  .subhead {
    font-family: var(--font-mono), 'Space Mono', monospace;
    font-size: 14px;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0 0 32px;
  }

  .cta-row {
    display: flex;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
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
    border: 1px solid #4ecdc4;
    color: #4ecdc4;
    background: transparent;
  }
  .cta-primary:hover,
  .cta-primary:focus-visible {
    background: rgba(78, 205, 196, 0.18);
    outline: none;
  }
  .cta-secondary {
    border: 1px solid transparent;
    color: rgba(255, 255, 255, 0.7);
  }
  .cta-secondary:hover,
  .cta-secondary:focus-visible {
    color: #4ecdc4;
    outline: none;
  }
  .cta:focus-visible {
    outline: 2px solid var(--color-accent, #4466ff);
    outline-offset: 2px;
  }

  .divider {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    margin: 64px 0;
  }

  .prose h2,
  section > h2 {
    font-family: var(--font-display);
    font-size: 32px;
    letter-spacing: 3px;
    margin: 0 0 24px;
    color: var(--color-text);
  }
  .prose p {
    font-family: var(--font-editorial), 'Crimson Pro', serif;
    font-style: italic;
    font-size: 17px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.82);
    margin: 0 0 16px;
  }

  .card-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 20px;
    min-height: 160px;
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
  .card:hover,
  .card:focus-visible {
    border-color: rgba(78, 205, 196, 0.4);
    background: rgba(78, 205, 196, 0.04);
    transform: translateY(-4px);
    outline: none;
  }
  .card:focus-visible {
    outline: 2px solid var(--color-accent, #4466ff);
    outline-offset: 2px;
  }
  .card-route {
    font-family: var(--font-display);
    font-size: 22px;
    letter-spacing: 2px;
    color: var(--color-text);
  }
  .card-title {
    font-family: var(--font-editorial), 'Crimson Pro', serif;
    font-style: italic;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.92);
  }
  .card-desc {
    font-family: var(--font-mono), 'Space Mono', monospace;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.55);
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
    font-size: 12px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
  }

  /* ─── Tablet ───────────────────────────────────────────────── */
  @media (max-width: 1023px) {
    .landing {
      max-width: 720px;
    }
    .wordmark {
      font-size: 80px;
    }
    .hero-art {
      width: 110px;
      height: 110px;
    }
    .hero-row {
      gap: 24px;
    }
    .tagline {
      font-size: 20px;
    }
    .card-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* ─── Mobile ───────────────────────────────────────────────── */
  @media (max-width: 767px) {
    .landing {
      padding: 48px 16px 32px;
    }
    .wordmark {
      font-size: 48px;
      letter-spacing: 6px;
    }
    /* Drop the flourishes on mobile — wordmark stands alone for clarity. */
    .hero-art {
      display: none;
    }
    .hero-row {
      gap: 0;
    }
    .tagline {
      font-size: 18px;
    }
    .subhead {
      font-size: 13px;
    }
    .cta {
      width: 100%;
      max-width: 320px;
    }
    .cta-row {
      flex-direction: column;
      align-items: stretch;
    }
    .divider {
      margin: 40px 0;
    }
    .prose h2,
    section > h2 {
      font-size: 24px;
      letter-spacing: 2px;
    }
    .prose p {
      font-size: 15px;
    }
    .card-grid {
      grid-template-columns: 1fr;
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

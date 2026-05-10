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
    <!-- Hero illustration: an inner-solar-system orrery with the
         classic Earth-Mars Hohmann transfer highlighted in teal.
         Style mirrors /science chapter covers — multiple stroke
         weights, scattered stars, planet markers, tiny annotations
         in Space Mono. Decorative; aria-hidden for screen readers. -->
    <svg
      class="hero-illustration"
      viewBox="0 0 600 260"
      role="img"
      aria-label="Orrery — inner solar system with an Earth-to-Mars transfer arc"
    >
      <style>
        .h-soft {
          stroke: rgba(255, 255, 255, 0.18);
          stroke-width: 0.8;
          fill: none;
        }
        .h-mid {
          stroke: rgba(255, 255, 255, 0.32);
          stroke-width: 1;
          fill: none;
        }
        .h-bright {
          stroke: rgba(255, 255, 255, 0.62);
          stroke-width: 1.2;
          fill: none;
        }
        .h-accent {
          stroke: #4ecdc4;
          stroke-width: 1.6;
          fill: none;
        }
        .h-sun {
          fill: #ffc850;
        }
        .h-mercury {
          fill: rgba(170, 170, 170, 0.9);
        }
        .h-venus {
          fill: rgba(212, 180, 128, 0.9);
        }
        .h-earth {
          fill: rgba(75, 156, 211, 0.95);
        }
        .h-mars {
          fill: rgba(193, 68, 14, 0.95);
        }
        .h-craft {
          fill: #4ecdc4;
        }
        .h-star {
          fill: rgba(255, 255, 255, 0.5);
        }
        .h-dim {
          fill: rgba(255, 255, 255, 0.22);
        }
        .h-label {
          font-family: 'Space Mono', monospace;
          font-size: 8px;
          letter-spacing: 1px;
          fill: rgba(255, 255, 255, 0.5);
        }
        .h-label-accent {
          font-family: 'Space Mono', monospace;
          font-size: 8px;
          letter-spacing: 1px;
          fill: #4ecdc4;
        }
      </style>

      <!-- Scattered starfield -->
      <circle class="h-dim" cx="40" cy="32" r="0.8" />
      <circle class="h-star" cx="115" cy="48" r="1.1" />
      <circle class="h-dim" cx="200" cy="28" r="0.9" />
      <circle class="h-star" cx="290" cy="40" r="1.2" />
      <circle class="h-dim" cx="380" cy="32" r="0.7" />
      <circle class="h-star" cx="465" cy="50" r="1.1" />
      <circle class="h-dim" cx="540" cy="34" r="0.8" />
      <circle class="h-dim" cx="65" cy="225" r="0.8" />
      <circle class="h-star" cx="170" cy="240" r="1.1" />
      <circle class="h-dim" cx="270" cy="232" r="0.7" />
      <circle class="h-star" cx="365" cy="225" r="1" />
      <circle class="h-dim" cx="460" cy="240" r="0.8" />
      <circle class="h-star" cx="540" cy="228" r="1.1" />

      <!-- Inner-solar-system orrery, centred at (300, 130) -->
      <!-- Mercury, Venus orbits — soft -->
      <ellipse class="h-soft" cx="300" cy="130" rx="40" ry="18" />
      <ellipse class="h-soft" cx="300" cy="130" rx="75" ry="32" />
      <!-- Earth orbit — bright (the source orbit of our highlighted transfer) -->
      <ellipse class="h-bright" cx="300" cy="130" rx="115" ry="50" />
      <!-- Mars orbit — bright (target) -->
      <ellipse class="h-bright" cx="300" cy="130" rx="170" ry="74" />
      <!-- Jupiter, Saturn orbits — soft, hinted off the edges -->
      <ellipse class="h-soft" cx="300" cy="130" rx="235" ry="103" />
      <ellipse class="h-soft" cx="300" cy="130" rx="285" ry="125" />

      <!-- Transfer ellipse (Earth perihelion → Mars aphelion), highlighted in teal -->
      <ellipse class="h-accent" cx="300" cy="130" rx="142" ry="62" stroke-dasharray="5 3" />

      <!-- Sun at the centre -->
      <circle class="h-sun" cx="300" cy="130" r="7" />

      <!-- Planets at chosen orbital positions -->
      <circle class="h-mercury" cx="340" cy="130" r="1.6" />
      <circle class="h-venus" cx="225" cy="148" r="2.2" />
      <circle class="h-earth" cx="415" cy="130" r="2.8" />
      <circle class="h-mars" cx="155" cy="125" r="2.5" />

      <!-- Spacecraft marker mid-transfer (top of teal ellipse) -->
      <circle class="h-craft" cx="300" cy="68" r="2.2" />
      <line x1="300" y1="64" x2="300" y2="60" stroke="#4ecdc4" stroke-width="1" />

      <!-- Subtle annotations to reinforce the engineering tone -->
      <text x="425" y="146" class="h-label">EARTH</text>
      <text x="125" y="142" class="h-label">MARS</text>
      <text x="305" y="58" class="h-label-accent">∆v</text>
      <text x="305" y="195" class="h-label">SUN</text>
    </svg>

    <h1 class="wordmark">ORRERY</h1>

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
            <span class="card-head">
              <svg class="card-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
                {#if card.route === '/explore'}
                  <!-- Solar system: Sun + 2 concentric orbits + a small planet -->
                  <circle cx="24" cy="24" r="2.5" fill="#ffc850" />
                  <circle
                    cx="24"
                    cy="24"
                    r="9"
                    fill="none"
                    stroke="rgba(255,255,255,0.4)"
                    stroke-width="1"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="16"
                    fill="none"
                    stroke="rgba(255,255,255,0.55)"
                    stroke-width="1.2"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="22"
                    fill="none"
                    stroke="rgba(255,255,255,0.25)"
                    stroke-width="0.8"
                    stroke-dasharray="2 2"
                  />
                  <circle cx="33" cy="24" r="1.6" fill="rgba(75,156,211,0.95)" />
                  <circle cx="14" cy="20" r="1.3" fill="rgba(193,68,14,0.95)" />
                {:else if card.route === '/missions'}
                  <!-- Capsule + trajectory dot grid -->
                  <line
                    x1="6"
                    y1="40"
                    x2="42"
                    y2="40"
                    stroke="rgba(255,255,255,0.5)"
                    stroke-width="1"
                  />
                  <path
                    d="M 8 38 Q 24 10 40 38"
                    fill="none"
                    stroke="#4ecdc4"
                    stroke-width="1.4"
                    stroke-dasharray="3 2"
                  />
                  <circle cx="24" cy="14" r="2.4" fill="#4ecdc4" />
                  <circle cx="8" cy="38" r="1.6" fill="rgba(255,255,255,0.7)" />
                  <circle cx="40" cy="38" r="1.6" fill="rgba(193,68,14,0.9)" />
                  <text
                    x="24"
                    y="34"
                    font-family="'Space Mono', monospace"
                    font-size="5"
                    fill="rgba(255,255,255,0.4)"
                    text-anchor="middle">MET</text
                  >
                {:else if card.route === '/fleet'}
                  <!-- Three stacked spacecraft silhouettes -->
                  <rect
                    x="14"
                    y="6"
                    width="20"
                    height="6"
                    rx="1"
                    fill="none"
                    stroke="rgba(255,255,255,0.65)"
                    stroke-width="1"
                  />
                  <rect x="11" y="7" width="3" height="4" fill="rgba(255,255,255,0.4)" />
                  <rect x="34" y="7" width="3" height="4" fill="rgba(255,255,255,0.4)" />
                  <rect
                    x="14"
                    y="20"
                    width="20"
                    height="6"
                    rx="1"
                    fill="none"
                    stroke="#4ecdc4"
                    stroke-width="1.2"
                  />
                  <rect x="11" y="21" width="3" height="4" fill="#4ecdc4" opacity="0.7" />
                  <rect x="34" y="21" width="3" height="4" fill="#4ecdc4" opacity="0.7" />
                  <rect
                    x="14"
                    y="34"
                    width="20"
                    height="6"
                    rx="1"
                    fill="none"
                    stroke="rgba(255,255,255,0.5)"
                    stroke-width="1"
                  />
                  <rect x="11" y="35" width="3" height="4" fill="rgba(255,255,255,0.3)" />
                  <rect x="34" y="35" width="3" height="4" fill="rgba(255,255,255,0.3)" />
                {:else if card.route === '/plan'}
                  <!-- Mini porkchop heatmap (5x4 grid with one teal cell) -->
                  <g stroke="rgba(255,255,255,0.15)" stroke-width="0.5" fill="none">
                    <line x1="8" y1="10" x2="40" y2="10" />
                    <line x1="8" y1="18" x2="40" y2="18" />
                    <line x1="8" y1="26" x2="40" y2="26" />
                    <line x1="8" y1="34" x2="40" y2="34" />
                    <line x1="8" y1="42" x2="40" y2="42" />
                  </g>
                  <rect x="9" y="11" width="6" height="6" fill="rgba(193,68,14,0.55)" />
                  <rect x="15" y="19" width="6" height="6" fill="rgba(255,200,80,0.45)" />
                  <rect x="21" y="27" width="6" height="6" fill="#4ecdc4" />
                  <rect x="27" y="19" width="6" height="6" fill="rgba(255,200,80,0.35)" />
                  <rect x="33" y="11" width="6" height="6" fill="rgba(193,68,14,0.4)" />
                {:else if card.route === '/fly'}
                  <!-- Trajectory arc from Earth to Mars with spacecraft marker -->
                  <circle cx="8" cy="38" r="2.6" fill="rgba(75,156,211,0.95)" />
                  <circle cx="40" cy="14" r="2.2" fill="rgba(193,68,14,0.95)" />
                  <path
                    d="M 10 36 Q 24 4 38 14"
                    fill="none"
                    stroke="#4ecdc4"
                    stroke-width="1.4"
                    stroke-dasharray="3 2"
                  />
                  <polygon points="22,16 28,20 22,24 24,20" fill="#4ecdc4" />
                  <line
                    x1="8"
                    y1="42"
                    x2="40"
                    y2="42"
                    stroke="rgba(255,255,255,0.2)"
                    stroke-width="0.6"
                  />
                {:else if card.route === '/earth'}
                  <!-- Earth + ISS orbit ring -->
                  <circle cx="24" cy="24" r="9" fill="rgba(75,156,211,0.85)" />
                  <path
                    d="M 16 22 Q 21 21 24 23 Q 28 25 32 23"
                    fill="none"
                    stroke="rgba(255,255,255,0.4)"
                    stroke-width="0.8"
                  />
                  <ellipse
                    cx="24"
                    cy="24"
                    rx="16"
                    ry="5"
                    fill="none"
                    stroke="#4ecdc4"
                    stroke-width="1.2"
                  />
                  <circle cx="40" cy="24" r="1.5" fill="#4ecdc4" />
                {:else if card.route === '/moon'}
                  <!-- Moon disc with craters -->
                  <circle cx="24" cy="24" r="14" fill="rgba(220,220,220,0.78)" />
                  <circle cx="20" cy="20" r="2" fill="rgba(120,120,120,0.6)" />
                  <circle cx="29" cy="26" r="2.8" fill="rgba(120,120,120,0.55)" />
                  <circle cx="22" cy="30" r="1.5" fill="rgba(120,120,120,0.6)" />
                  <circle cx="14" cy="22" r="1.2" fill="rgba(120,120,120,0.5)" />
                {:else if card.route === '/mars'}
                  <!-- Mars with polar caps -->
                  <circle cx="24" cy="24" r="14" fill="rgba(193,68,14,0.92)" />
                  <ellipse cx="24" cy="11" rx="5" ry="2" fill="rgba(255,255,255,0.85)" />
                  <ellipse cx="24" cy="37" rx="4" ry="1.6" fill="rgba(255,255,255,0.75)" />
                  <ellipse cx="20" cy="22" rx="2.5" ry="1.5" fill="rgba(120,40,8,0.5)" />
                  <ellipse cx="30" cy="28" rx="2" ry="1.2" fill="rgba(120,40,8,0.5)" />
                {:else if card.route === '/iss'}
                  <!-- ISS truss + solar panels (simplified T-shape) -->
                  <line
                    x1="6"
                    y1="24"
                    x2="42"
                    y2="24"
                    stroke="rgba(255,255,255,0.7)"
                    stroke-width="1.2"
                  />
                  <rect x="3" y="20" width="6" height="8" fill="rgba(78,205,196,0.7)" />
                  <rect x="39" y="20" width="6" height="8" fill="rgba(78,205,196,0.7)" />
                  <rect
                    x="13"
                    y="22"
                    width="22"
                    height="4"
                    fill="rgba(255,255,255,0.3)"
                    stroke="rgba(255,255,255,0.6)"
                    stroke-width="0.8"
                  />
                  <rect
                    x="22"
                    y="14"
                    width="4"
                    height="8"
                    fill="rgba(255,255,255,0.3)"
                    stroke="rgba(255,255,255,0.6)"
                    stroke-width="0.8"
                  />
                  <rect
                    x="22"
                    y="26"
                    width="4"
                    height="8"
                    fill="rgba(255,255,255,0.3)"
                    stroke="rgba(255,255,255,0.6)"
                    stroke-width="0.8"
                  />
                {:else if card.route === '/tiangong'}
                  <!-- Tiangong T-shape (Tianhe core + Wentian/Mengtian labs) -->
                  <rect
                    x="18"
                    y="6"
                    width="12"
                    height="36"
                    fill="rgba(255,255,255,0.3)"
                    stroke="rgba(255,255,255,0.7)"
                    stroke-width="1"
                  />
                  <rect
                    x="6"
                    y="20"
                    width="36"
                    height="8"
                    fill="rgba(255,200,80,0.25)"
                    stroke="rgba(255,200,80,0.65)"
                    stroke-width="1"
                  />
                  <line
                    x1="3"
                    y1="24"
                    x2="6"
                    y2="24"
                    stroke="rgba(255,255,255,0.5)"
                    stroke-width="0.8"
                  />
                  <line
                    x1="42"
                    y1="24"
                    x2="45"
                    y2="24"
                    stroke="rgba(255,255,255,0.5)"
                    stroke-width="0.8"
                  />
                  <circle cx="24" cy="24" r="2" fill="#4ecdc4" />
                {:else if card.route === '/science'}
                  <!-- Formula/encyclopedia glyph -->
                  <rect
                    x="6"
                    y="8"
                    width="36"
                    height="32"
                    fill="none"
                    stroke="rgba(255,255,255,0.5)"
                    stroke-width="1"
                    rx="1"
                  />
                  <line
                    x1="6"
                    y1="14"
                    x2="42"
                    y2="14"
                    stroke="rgba(255,255,255,0.4)"
                    stroke-width="0.8"
                  />
                  <text
                    x="24"
                    y="30"
                    font-family="'Space Mono', monospace"
                    font-size="14"
                    font-weight="bold"
                    fill="#4ecdc4"
                    text-anchor="middle">∆v</text
                  >
                  <text
                    x="24"
                    y="38"
                    font-family="'Space Mono', monospace"
                    font-size="6"
                    fill="rgba(255,255,255,0.5)"
                    text-anchor="middle">= vₑ ln R</text
                  >
                {/if}
              </svg>
              <span class="card-route">{card.route}</span>
            </span>
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
  .hero-illustration {
    display: block;
    width: 100%;
    max-width: 600px;
    height: auto;
    margin: 0 auto -8px;
  }
  .wordmark {
    font-family: var(--font-display);
    font-size: 96px;
    letter-spacing: 8px;
    line-height: 1;
    margin: 0 0 16px;
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
    .hero-illustration {
      max-width: 520px;
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
    .hero-illustration {
      max-width: 100%;
      margin-bottom: 4px;
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

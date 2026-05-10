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
    <!-- Hero illustration: poster-art orrery, inspired by JPL
         "Visions of the Future" + Eames "Powers of Ten" + the
         vintage planetarium-print tradition. Subject stays
         orbital — Sun-centred system, Hohmann + outer-system
         slingshot — but execution is art-print: gradient sun
         + corona, planets with proper colours and terminator
         shading + halos, multi-hue accent trajectories,
         depth-fading orbital paths, comet streak. Engineering
         labels in Space Mono survive as the "still scientific"
         anchor. Decorative; aria-hidden via role="img" + label. -->
    <svg
      class="hero-illustration"
      viewBox="0 0 600 320"
      role="img"
      aria-label="Orrery — a stylised solar system with two highlighted mission trajectories"
    >
      <defs>
        <!-- Sun: hot core → orange → yellow → fading corona -->
        <radialGradient id="h-sun-grad" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#fff7e0" />
          <stop offset="35%" stop-color="#ffc850" />
          <stop offset="75%" stop-color="#f08a3c" />
          <stop offset="100%" stop-color="#c14a1e" />
        </radialGradient>
        <radialGradient id="h-sun-corona" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#ffc850" stop-opacity="0.55" />
          <stop offset="60%" stop-color="#ffc850" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#ffc850" stop-opacity="0" />
        </radialGradient>

        <!-- Planet gradients: each has a lit side + a darker terminator
             (offset so the lit side faces the Sun at centre). -->
        <radialGradient id="h-mercury-grad" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stop-color="#d4cabe" />
          <stop offset="55%" stop-color="#9a8a7a" />
          <stop offset="100%" stop-color="#3e3530" />
        </radialGradient>
        <radialGradient id="h-venus-grad" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stop-color="#fce6b6" />
          <stop offset="55%" stop-color="#d4a868" />
          <stop offset="100%" stop-color="#5a3d20" />
        </radialGradient>
        <radialGradient id="h-earth-grad" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stop-color="#a8e0ff" />
          <stop offset="40%" stop-color="#4b9cd3" />
          <stop offset="80%" stop-color="#1f4870" />
          <stop offset="100%" stop-color="#0a1b30" />
        </radialGradient>
        <radialGradient id="h-mars-grad" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stop-color="#f4b298" />
          <stop offset="50%" stop-color="#c1440e" />
          <stop offset="100%" stop-color="#3a1408" />
        </radialGradient>
        <radialGradient id="h-jupiter-grad" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stop-color="#f4d8a4" />
          <stop offset="50%" stop-color="#c89968" />
          <stop offset="100%" stop-color="#4a3520" />
        </radialGradient>
        <radialGradient id="h-saturn-grad" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stop-color="#f8e8b8" />
          <stop offset="50%" stop-color="#d8b878" />
          <stop offset="100%" stop-color="#544030" />
        </radialGradient>

        <!-- Halos for each planet (subtle glow rings) -->
        <radialGradient id="h-halo-blue" cx="0.5" cy="0.5" r="0.5">
          <stop offset="55%" stop-color="#4b9cd3" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#4b9cd3" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="h-halo-red" cx="0.5" cy="0.5" r="0.5">
          <stop offset="55%" stop-color="#c1440e" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#c1440e" stop-opacity="0" />
        </radialGradient>

        <!-- Two trajectory accent gradients (multicolour) -->
        <linearGradient id="h-traj-teal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#4ecdc4" stop-opacity="0.35" />
          <stop offset="50%" stop-color="#4ecdc4" stop-opacity="1" />
          <stop offset="100%" stop-color="#4ecdc4" stop-opacity="0.35" />
        </linearGradient>
        <linearGradient id="h-traj-magenta" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ff6b9d" stop-opacity="0.25" />
          <stop offset="60%" stop-color="#c14ad8" stop-opacity="1" />
          <stop offset="100%" stop-color="#7a4ad8" stop-opacity="0.4" />
        </linearGradient>

        <!-- Star halo: tiny radial glow applied to a few "feature" stars -->
        <radialGradient id="h-star-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
          <stop offset="40%" stop-color="#ffffff" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>

        <!-- Comet trail -->
        <linearGradient id="h-comet" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="80%" stop-color="#a8e0ff" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.95" />
        </linearGradient>
      </defs>

      <style>
        .h-soft {
          stroke: rgba(255, 255, 255, 0.14);
          stroke-width: 0.8;
          fill: none;
        }
        .h-mid {
          stroke: rgba(255, 255, 255, 0.28);
          stroke-width: 1;
          fill: none;
        }
        .h-bright {
          stroke: rgba(255, 255, 255, 0.55);
          stroke-width: 1.2;
          fill: none;
        }
        .h-back {
          stroke: rgba(255, 255, 255, 0.06);
          stroke-width: 0.8;
          fill: none;
        }
        .h-label {
          font-family: 'Space Mono', monospace;
          font-size: 8px;
          letter-spacing: 1px;
          fill: rgba(255, 255, 255, 0.55);
        }
        .h-label-teal {
          font-family: 'Space Mono', monospace;
          font-size: 8px;
          letter-spacing: 1px;
          fill: #4ecdc4;
        }
        .h-label-magenta {
          font-family: 'Space Mono', monospace;
          font-size: 8px;
          letter-spacing: 1px;
          fill: #c14ad8;
        }
      </style>

      <!-- ─── Deep starfield ─────────────────────────────────── -->
      <circle cx="40" cy="35" r="0.8" fill="rgba(255,255,255,0.22)" />
      <circle cx="115" cy="55" r="1.1" fill="rgba(255,255,255,0.5)" />
      <circle cx="155" cy="22" r="0.6" fill="rgba(255,255,255,0.3)" />
      <circle cx="220" cy="40" r="0.9" fill="rgba(255,255,255,0.4)" />
      <circle cx="290" cy="20" r="1.3" fill="rgba(255,255,255,0.62)" />
      <circle cx="340" cy="42" r="0.7" fill="rgba(255,255,255,0.32)" />
      <circle cx="395" cy="20" r="0.8" fill="rgba(255,255,255,0.45)" />
      <circle cx="450" cy="38" r="1.4" fill="rgba(255,255,255,0.65)" />
      <circle cx="510" cy="22" r="0.7" fill="rgba(255,255,255,0.28)" />
      <circle cx="555" cy="44" r="1" fill="rgba(255,255,255,0.45)" />
      <circle cx="60" cy="290" r="0.9" fill="rgba(255,255,255,0.35)" />
      <circle cx="135" cy="280" r="0.7" fill="rgba(255,255,255,0.28)" />
      <circle cx="200" cy="295" r="1.2" fill="rgba(255,255,255,0.55)" />
      <circle cx="290" cy="288" r="0.7" fill="rgba(255,255,255,0.32)" />
      <circle cx="370" cy="295" r="1.1" fill="rgba(255,255,255,0.5)" />
      <circle cx="435" cy="282" r="0.8" fill="rgba(255,255,255,0.38)" />
      <circle cx="510" cy="290" r="1" fill="rgba(255,255,255,0.45)" />
      <circle cx="555" cy="278" r="0.8" fill="rgba(255,255,255,0.4)" />

      <!-- A few "feature" stars with halo glow for variety -->
      <circle cx="290" cy="20" r="6" fill="url(#h-star-glow)" />
      <circle cx="450" cy="38" r="7" fill="url(#h-star-glow)" />
      <circle cx="200" cy="295" r="6" fill="url(#h-star-glow)" />

      <!-- ─── Sun corona (drawn before orbits so it doesn't cover them) ── -->
      <circle cx="300" cy="160" r="55" fill="url(#h-sun-corona)" />

      <!-- ─── Orbits ─────────────────────────────────────────────
           Drawn as ellipses to suggest a gentle camera tilt from
           above. Stroke opacity fades on the back half via two
           overlapping arcs so the orbit "wraps" the Sun visually. -->
      <!-- Mercury (front + back) -->
      <ellipse class="h-back" cx="300" cy="160" rx="38" ry="14" />
      <path class="h-mid" d="M 262 160 A 38 14 0 0 0 338 160" />
      <!-- Venus -->
      <ellipse class="h-back" cx="300" cy="160" rx="62" ry="22" />
      <path class="h-mid" d="M 238 160 A 62 22 0 0 0 362 160" />
      <!-- Earth (highlighted) -->
      <ellipse class="h-back" cx="300" cy="160" rx="100" ry="36" />
      <path class="h-bright" d="M 200 160 A 100 36 0 0 0 400 160" />
      <!-- Mars (highlighted) -->
      <ellipse class="h-back" cx="300" cy="160" rx="142" ry="52" />
      <path class="h-bright" d="M 158 160 A 142 52 0 0 0 442 160" />
      <!-- Jupiter -->
      <ellipse class="h-back" cx="300" cy="160" rx="195" ry="72" />
      <path class="h-soft" d="M 105 160 A 195 72 0 0 0 495 160" />
      <!-- Saturn -->
      <ellipse class="h-back" cx="300" cy="160" rx="245" ry="92" />
      <path class="h-soft" d="M 55 160 A 245 92 0 0 0 545 160" />

      <!-- ─── Highlighted trajectories ─────────────────────────── -->
      <!-- 1. Earth → Mars Hohmann ellipse (teal). Drawn as a true
           ellipse with semi-major a=121 and semi-minor selected so
           the perihelion sits on Earth's orbit, aphelion on Mars's. -->
      <ellipse
        cx="300"
        cy="160"
        rx="121"
        ry="44"
        fill="none"
        stroke="url(#h-traj-teal)"
        stroke-width="2"
        stroke-dasharray="5 3"
      />
      <!-- 2. Outer-system slingshot (magenta) — a sweeping arc that
           leaves Earth's orbit, swings near Jupiter, and exits the
           frame. Quadratic Bezier for an organic curve. -->
      <path
        d="M 395 152 Q 360 80 450 60 Q 530 50 580 90"
        fill="none"
        stroke="url(#h-traj-magenta)"
        stroke-width="2.2"
        stroke-linecap="round"
      />

      <!-- ─── Comet (top-left → diagonal sweep) ────────────────── -->
      <path
        d="M 30 80 L 95 65"
        stroke="url(#h-comet)"
        stroke-width="1.8"
        stroke-linecap="round"
        fill="none"
      />
      <circle cx="95" cy="65" r="2.2" fill="#ffffff" />
      <circle cx="95" cy="65" r="5" fill="url(#h-star-glow)" />

      <!-- ─── Sun (after orbits so it's the focal point) ───────── -->
      <circle cx="300" cy="160" r="14" fill="url(#h-sun-grad)" />
      <!-- Sun's outer rim highlight -->
      <circle cx="296" cy="156" r="4" fill="rgba(255,255,255,0.5)" opacity="0.5" />

      <!-- ─── Planets ────────────────────────────────────────────
           Halo first (radial glow), then planet disc, then a tiny
           crescent of darkness on the side away from the Sun for
           a hint of terminator shading. Rendering order matters
           for depth — planets in front of the Sun appear "in
           front" because they're drawn last. -->

      <!-- Mercury -->
      <circle cx="338" cy="160" r="6" fill="rgba(255,255,255,0.06)" />
      <circle cx="338" cy="160" r="3.4" fill="url(#h-mercury-grad)" />

      <!-- Venus -->
      <circle cx="240" cy="172" r="9" fill="rgba(255,200,120,0.08)" />
      <circle cx="240" cy="172" r="4.4" fill="url(#h-venus-grad)" />

      <!-- Earth (with halo + a tiny moon) -->
      <circle cx="396" cy="160" r="14" fill="url(#h-halo-blue)" />
      <circle cx="396" cy="160" r="5.5" fill="url(#h-earth-grad)" />
      <circle cx="408" cy="156" r="1.4" fill="rgba(220,220,220,0.85)" />

      <!-- Mars -->
      <circle cx="162" cy="156" r="14" fill="url(#h-halo-red)" />
      <circle cx="162" cy="156" r="5" fill="url(#h-mars-grad)" />

      <!-- Jupiter (off to the right; also serves as the slingshot pivot) -->
      <circle cx="468" cy="118" r="11" fill="rgba(212,168,104,0.1)" />
      <circle cx="468" cy="118" r="7" fill="url(#h-jupiter-grad)" />
      <!-- Faint band hint -->
      <ellipse cx="468" cy="118" rx="7" ry="1.4" fill="rgba(120,80,40,0.35)" />

      <!-- Saturn (far left, with rings) -->
      <circle cx="80" cy="118" r="10" fill="rgba(232,208,152,0.08)" />
      <ellipse
        cx="80"
        cy="118"
        rx="14"
        ry="3"
        fill="none"
        stroke="rgba(232,208,152,0.7)"
        stroke-width="1.2"
      />
      <ellipse
        cx="80"
        cy="118"
        rx="14"
        ry="3"
        fill="none"
        stroke="rgba(180,140,80,0.5)"
        stroke-width="0.6"
        transform="rotate(-8 80 118)"
      />
      <circle cx="80" cy="118" r="6" fill="url(#h-saturn-grad)" />

      <!-- ─── Spacecraft markers on the highlighted arcs ───────── -->
      <!-- Hohmann craft (teal arrow) -->
      <g transform="translate(300 116)">
        <polygon points="-3,-2 4,0 -3,2 -1,0" fill="#4ecdc4" />
        <circle r="3.5" fill="rgba(78,205,196,0.18)" />
      </g>
      <!-- Outer-system probe (magenta arrow) on the slingshot path -->
      <g transform="translate(490 60)">
        <polygon points="-3,-2 4,0 -3,2 -1,0" fill="#c14ad8" />
        <circle r="3.5" fill="rgba(193,74,216,0.18)" />
      </g>

      <!-- ─── Engineering annotations ─────────────────────────── -->
      <text x="402" y="184" class="h-label">EARTH</text>
      <text x="142" y="184" class="h-label">MARS</text>
      <text x="476" y="142" class="h-label">JUPITER</text>
      <text x="62" y="142" class="h-label">SATURN</text>
      <text x="305" y="148" class="h-label">SUN</text>
      <text x="270" y="106" class="h-label-teal">∆v · HOHMANN</text>
      <text x="498" y="50" class="h-label-magenta">SLINGSHOT</text>
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

    <!-- Shared gradient + filter defs for the per-card icons.
         An invisible 0x0 SVG keeps the layout untouched while making
         these `id` references reachable from all later <svg> blocks. -->
    <svg class="card-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="ic-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#fff7e0" />
          <stop offset="55%" stop-color="#ffc850" />
          <stop offset="100%" stop-color="#c14a1e" />
        </radialGradient>
        <radialGradient id="ic-sun-corona" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#ffc850" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#ffc850" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="ic-earth" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stop-color="#a8e0ff" />
          <stop offset="50%" stop-color="#4b9cd3" />
          <stop offset="100%" stop-color="#0a1b30" />
        </radialGradient>
        <radialGradient id="ic-mars" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stop-color="#f4b298" />
          <stop offset="50%" stop-color="#c1440e" />
          <stop offset="100%" stop-color="#3a1408" />
        </radialGradient>
        <radialGradient id="ic-moon" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stop-color="#f0ece4" />
          <stop offset="55%" stop-color="#a8a09c" />
          <stop offset="100%" stop-color="#1c1a18" />
        </radialGradient>
        <radialGradient id="ic-jupiter" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stop-color="#f4d8a4" />
          <stop offset="50%" stop-color="#c89968" />
          <stop offset="100%" stop-color="#4a3520" />
        </radialGradient>
        <radialGradient id="ic-craft" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stop-color="#a0fff0" />
          <stop offset="60%" stop-color="#4ecdc4" />
          <stop offset="100%" stop-color="#1c5a55" />
        </radialGradient>
        <radialGradient id="ic-glow-blue" cx="0.5" cy="0.5" r="0.5">
          <stop offset="40%" stop-color="#4b9cd3" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#4b9cd3" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="ic-glow-red" cx="0.5" cy="0.5" r="0.5">
          <stop offset="40%" stop-color="#c1440e" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#c1440e" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="ic-glow-teal" cx="0.5" cy="0.5" r="0.5">
          <stop offset="40%" stop-color="#4ecdc4" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#4ecdc4" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="ic-glow-magenta" cx="0.5" cy="0.5" r="0.5">
          <stop offset="40%" stop-color="#c14ad8" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#c14ad8" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="ic-traj" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#4ecdc4" stop-opacity="0.2" />
          <stop offset="60%" stop-color="#4ecdc4" stop-opacity="1" />
          <stop offset="100%" stop-color="#c14ad8" stop-opacity="0.7" />
        </linearGradient>
        <linearGradient id="ic-panel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7defe5" />
          <stop offset="100%" stop-color="#1f7872" />
        </linearGradient>
        <linearGradient id="ic-panel-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffd87a" />
          <stop offset="100%" stop-color="#9a6818" />
        </linearGradient>
      </defs>
    </svg>

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
                  <!-- Mini solar system: gradient Sun + corona, three orbital ellipses
                       (slight perspective tilt), Earth + Mars with halos. -->
                  <circle cx="24" cy="26" r="14" fill="url(#ic-sun-corona)" />
                  <ellipse
                    cx="24"
                    cy="26"
                    rx="9"
                    ry="3.5"
                    fill="none"
                    stroke="rgba(255,255,255,0.35)"
                    stroke-width="0.8"
                  />
                  <ellipse
                    cx="24"
                    cy="26"
                    rx="15"
                    ry="6"
                    fill="none"
                    stroke="rgba(255,255,255,0.55)"
                    stroke-width="1"
                  />
                  <ellipse
                    cx="24"
                    cy="26"
                    rx="21"
                    ry="8"
                    fill="none"
                    stroke="rgba(255,255,255,0.25)"
                    stroke-width="0.7"
                    stroke-dasharray="2 2"
                  />
                  <circle cx="24" cy="26" r="3.2" fill="url(#ic-sun)" />
                  <circle cx="33" cy="26" r="3" fill="url(#ic-glow-blue)" />
                  <circle cx="33" cy="26" r="1.8" fill="url(#ic-earth)" />
                  <circle cx="9" cy="26" r="3" fill="url(#ic-glow-red)" />
                  <circle cx="9" cy="26" r="1.6" fill="url(#ic-mars)" />
                {:else if card.route === '/missions'}
                  <!-- Capsule with engine glow on a rising trajectory + planet horizon -->
                  <path d="M 0 44 Q 24 36 48 44 L 48 48 L 0 48 Z" fill="rgba(75,156,211,0.4)" />
                  <path
                    d="M 0 44 Q 24 36 48 44"
                    fill="none"
                    stroke="rgba(168,224,255,0.7)"
                    stroke-width="0.8"
                  />
                  <path
                    d="M 6 38 Q 24 6 42 18"
                    fill="none"
                    stroke="url(#ic-traj)"
                    stroke-width="1.6"
                    stroke-dasharray="3 2"
                  />
                  <circle cx="24" cy="16" r="5" fill="url(#ic-glow-teal)" />
                  <ellipse cx="24" cy="16" rx="2" ry="3" fill="url(#ic-craft)" />
                  <ellipse cx="24" cy="22" rx="1.6" ry="1.6" fill="#ffc850" opacity="0.85" />
                  <text
                    x="24"
                    y="33"
                    font-family="'Space Mono', monospace"
                    font-size="4.5"
                    fill="rgba(255,255,255,0.45)"
                    text-anchor="middle">T+254 d</text
                  >
                {:else if card.route === '/fleet'}
                  <!-- Three spacecraft silhouettes, layered with depth (back row dim, front bright teal) -->
                  <g opacity="0.55">
                    <rect
                      x="6"
                      y="9"
                      width="12"
                      height="6"
                      rx="1"
                      fill="rgba(255,255,255,0.18)"
                      stroke="rgba(255,255,255,0.55)"
                      stroke-width="0.7"
                    />
                    <rect x="3" y="10" width="3" height="4" fill="rgba(120,180,220,0.6)" />
                    <rect x="18" y="10" width="3" height="4" fill="rgba(120,180,220,0.6)" />
                  </g>
                  <g>
                    <rect
                      x="20"
                      y="20"
                      width="20"
                      height="9"
                      rx="1.2"
                      fill="rgba(78,205,196,0.18)"
                      stroke="#4ecdc4"
                      stroke-width="1.2"
                    />
                    <rect x="15" y="22" width="5" height="5" fill="url(#ic-panel)" />
                    <rect x="40" y="22" width="5" height="5" fill="url(#ic-panel)" />
                    <circle cx="30" cy="24.5" r="1.2" fill="#a0fff0" />
                  </g>
                  <g opacity="0.7">
                    <rect
                      x="10"
                      y="36"
                      width="14"
                      height="6"
                      rx="1"
                      fill="rgba(193,74,216,0.12)"
                      stroke="rgba(193,74,216,0.7)"
                      stroke-width="0.9"
                    />
                    <rect x="6" y="37" width="4" height="4" fill="url(#ic-panel-gold)" />
                    <rect x="24" y="37" width="4" height="4" fill="url(#ic-panel-gold)" />
                  </g>
                {:else if card.route === '/plan'}
                  <!-- Vivid porkchop heatmap (5×5 grid, gradient of cool→hot cells like a real plot) -->
                  <rect
                    x="6"
                    y="6"
                    width="36"
                    height="36"
                    fill="rgba(10,12,28,0.5)"
                    stroke="rgba(255,255,255,0.18)"
                    stroke-width="0.6"
                  />
                  <!-- Row 1 (bottom = cheapest, brightest teal lobe in middle) -->
                  <rect x="7" y="7" width="6.8" height="6.8" fill="rgba(193,68,14,0.6)" />
                  <rect x="14" y="7" width="6.8" height="6.8" fill="rgba(220,108,40,0.7)" />
                  <rect x="21" y="7" width="6.8" height="6.8" fill="rgba(240,160,60,0.8)" />
                  <rect x="28" y="7" width="6.8" height="6.8" fill="rgba(220,108,40,0.7)" />
                  <rect x="35" y="7" width="6.8" height="6.8" fill="rgba(193,68,14,0.5)" />
                  <rect x="7" y="14" width="6.8" height="6.8" fill="rgba(220,108,40,0.7)" />
                  <rect x="14" y="14" width="6.8" height="6.8" fill="rgba(240,200,80,0.85)" />
                  <rect x="21" y="14" width="6.8" height="6.8" fill="rgba(180,220,180,0.85)" />
                  <rect x="28" y="14" width="6.8" height="6.8" fill="rgba(240,200,80,0.85)" />
                  <rect x="35" y="14" width="6.8" height="6.8" fill="rgba(220,108,40,0.6)" />
                  <rect x="7" y="21" width="6.8" height="6.8" fill="rgba(240,200,80,0.7)" />
                  <rect x="14" y="21" width="6.8" height="6.8" fill="rgba(180,220,180,0.85)" />
                  <rect x="21" y="21" width="6.8" height="6.8" fill="#4ecdc4" />
                  <rect x="28" y="21" width="6.8" height="6.8" fill="rgba(180,220,180,0.85)" />
                  <rect x="35" y="21" width="6.8" height="6.8" fill="rgba(240,200,80,0.7)" />
                  <rect x="7" y="28" width="6.8" height="6.8" fill="rgba(220,108,40,0.7)" />
                  <rect x="14" y="28" width="6.8" height="6.8" fill="rgba(240,200,80,0.85)" />
                  <rect x="21" y="28" width="6.8" height="6.8" fill="rgba(180,220,180,0.85)" />
                  <rect x="28" y="28" width="6.8" height="6.8" fill="rgba(240,200,80,0.85)" />
                  <rect x="35" y="28" width="6.8" height="6.8" fill="rgba(220,108,40,0.6)" />
                  <rect x="7" y="35" width="6.8" height="6.8" fill="rgba(193,68,14,0.6)" />
                  <rect x="14" y="35" width="6.8" height="6.8" fill="rgba(220,108,40,0.7)" />
                  <rect x="21" y="35" width="6.8" height="6.8" fill="rgba(240,160,60,0.7)" />
                  <rect x="28" y="35" width="6.8" height="6.8" fill="rgba(220,108,40,0.7)" />
                  <rect x="35" y="35" width="6.8" height="6.8" fill="rgba(193,68,14,0.5)" />
                  <!-- Pin marker on the cheap centre cell -->
                  <circle cx="24.4" cy="24.4" r="2" fill="none" stroke="#fff" stroke-width="1" />
                  <circle cx="24.4" cy="24.4" r="0.8" fill="#fff" />
                {:else if card.route === '/fly'}
                  <!-- Earth → Mars trajectory: gradient transfer arc + glowing spacecraft -->
                  <circle cx="6" cy="38" r="6" fill="url(#ic-glow-blue)" />
                  <circle cx="6" cy="38" r="3.5" fill="url(#ic-earth)" />
                  <circle cx="42" cy="12" r="6" fill="url(#ic-glow-red)" />
                  <circle cx="42" cy="12" r="3" fill="url(#ic-mars)" />
                  <path
                    d="M 9 36 Q 24 0 40 14"
                    fill="none"
                    stroke="url(#ic-traj)"
                    stroke-width="1.8"
                    stroke-dasharray="3 2"
                  />
                  <circle cx="24" cy="14" r="4" fill="url(#ic-glow-teal)" />
                  <polygon points="20,14 28,18 20,22 22,18" fill="url(#ic-craft)" />
                {:else if card.route === '/earth'}
                  <!-- Earth: blue gradient + atmosphere halo + ISS orbit + GPS dot -->
                  <circle cx="24" cy="24" r="16" fill="url(#ic-glow-blue)" />
                  <circle cx="24" cy="24" r="11" fill="url(#ic-earth)" />
                  <!-- Continent hint -->
                  <path
                    d="M 18 22 Q 22 18 26 22 Q 28 26 24 28 Q 20 26 18 22 Z"
                    fill="rgba(140,180,120,0.55)"
                  />
                  <path
                    d="M 28 26 Q 31 24 32 27"
                    fill="none"
                    stroke="rgba(140,180,120,0.45)"
                    stroke-width="1"
                  />
                  <!-- Atmosphere ring -->
                  <circle
                    cx="24"
                    cy="24"
                    r="11.5"
                    fill="none"
                    stroke="rgba(168,224,255,0.45)"
                    stroke-width="0.6"
                  />
                  <!-- ISS orbit -->
                  <ellipse
                    cx="24"
                    cy="24"
                    rx="18"
                    ry="6"
                    fill="none"
                    stroke="#4ecdc4"
                    stroke-width="1"
                    stroke-dasharray="2 2"
                  />
                  <circle cx="42" cy="24" r="2" fill="url(#ic-glow-teal)" />
                  <circle cx="42" cy="24" r="1.2" fill="#4ecdc4" />
                {:else if card.route === '/moon'}
                  <!-- Moon: gradient grey disc + craters with shading + Earth-glow on horizon -->
                  <circle cx="22" cy="24" r="16" fill="rgba(75,156,211,0.18)" />
                  <circle cx="22" cy="24" r="13" fill="url(#ic-moon)" />
                  <!-- Craters with shadow -->
                  <ellipse cx="18" cy="20" rx="2.4" ry="2.2" fill="rgba(60,55,50,0.7)" />
                  <ellipse cx="18.5" cy="19.5" rx="1.8" ry="1.6" fill="rgba(168,160,156,0.7)" />
                  <ellipse cx="27" cy="26" rx="3" ry="2.6" fill="rgba(60,55,50,0.65)" />
                  <ellipse cx="27.5" cy="25.5" rx="2.4" ry="2" fill="rgba(168,160,156,0.7)" />
                  <ellipse cx="20" cy="30" rx="1.6" ry="1.4" fill="rgba(60,55,50,0.6)" />
                  <!-- Apollo flag marker -->
                  <line
                    x1="25"
                    y1="22"
                    x2="25"
                    y2="17"
                    stroke="rgba(255,255,255,0.7)"
                    stroke-width="0.6"
                  />
                  <polygon points="25,17 28,18 25,19" fill="#c1440e" />
                {:else if card.route === '/mars'}
                  <!-- Mars: rich red gradient + polar caps + Olympus Mons hint + atmosphere -->
                  <circle cx="24" cy="24" r="16" fill="url(#ic-glow-red)" />
                  <circle cx="24" cy="24" r="13" fill="url(#ic-mars)" />
                  <!-- Polar caps -->
                  <ellipse cx="24" cy="12.5" rx="5" ry="2" fill="rgba(255,255,255,0.85)" />
                  <ellipse cx="24" cy="35.5" rx="4" ry="1.6" fill="rgba(245,235,225,0.78)" />
                  <!-- Surface features -->
                  <ellipse cx="19" cy="22" rx="2.6" ry="1.5" fill="rgba(80,28,8,0.55)" />
                  <ellipse cx="29" cy="27" rx="2" ry="1.2" fill="rgba(80,28,8,0.55)" />
                  <!-- Olympus Mons -->
                  <circle cx="20" cy="26" r="1.4" fill="rgba(255,200,140,0.55)" />
                  <circle cx="20" cy="26" r="0.6" fill="rgba(120,40,8,0.7)" />
                  <!-- Thin atmosphere -->
                  <circle
                    cx="24"
                    cy="24"
                    r="13.5"
                    fill="none"
                    stroke="rgba(244,178,152,0.5)"
                    stroke-width="0.5"
                  />
                {:else if card.route === '/iss'}
                  <!-- ISS: glowing solar panels (gradient teal) + truss with depth + Earth glow at bottom -->
                  <ellipse cx="24" cy="46" rx="24" ry="6" fill="rgba(75,156,211,0.18)" />
                  <line
                    x1="6"
                    y1="22"
                    x2="42"
                    y2="22"
                    stroke="rgba(255,255,255,0.65)"
                    stroke-width="1"
                  />
                  <line
                    x1="6"
                    y1="26"
                    x2="42"
                    y2="26"
                    stroke="rgba(255,255,255,0.45)"
                    stroke-width="0.7"
                  />
                  <!-- Solar panels (glowing) -->
                  <rect
                    x="2"
                    y="18"
                    width="6"
                    height="12"
                    fill="url(#ic-panel)"
                    stroke="rgba(160,255,240,0.6)"
                    stroke-width="0.5"
                  />
                  <rect
                    x="40"
                    y="18"
                    width="6"
                    height="12"
                    fill="url(#ic-panel)"
                    stroke="rgba(160,255,240,0.6)"
                    stroke-width="0.5"
                  />
                  <line
                    x1="2"
                    y1="22"
                    x2="8"
                    y2="22"
                    stroke="rgba(15,40,38,0.6)"
                    stroke-width="0.4"
                  />
                  <line
                    x1="40"
                    y1="22"
                    x2="46"
                    y2="22"
                    stroke="rgba(15,40,38,0.6)"
                    stroke-width="0.4"
                  />
                  <line
                    x1="2"
                    y1="26"
                    x2="8"
                    y2="26"
                    stroke="rgba(15,40,38,0.6)"
                    stroke-width="0.4"
                  />
                  <line
                    x1="40"
                    y1="26"
                    x2="46"
                    y2="26"
                    stroke="rgba(15,40,38,0.6)"
                    stroke-width="0.4"
                  />
                  <!-- Pressurised modules -->
                  <rect
                    x="13"
                    y="20"
                    width="22"
                    height="8"
                    fill="rgba(255,255,255,0.18)"
                    stroke="rgba(255,255,255,0.7)"
                    stroke-width="0.8"
                  />
                  <rect
                    x="22"
                    y="12"
                    width="4"
                    height="8"
                    fill="rgba(255,255,255,0.22)"
                    stroke="rgba(255,255,255,0.7)"
                    stroke-width="0.8"
                  />
                  <rect
                    x="22"
                    y="28"
                    width="4"
                    height="8"
                    fill="rgba(255,255,255,0.22)"
                    stroke="rgba(255,255,255,0.7)"
                    stroke-width="0.8"
                  />
                  <!-- Cupola dot -->
                  <circle cx="24" cy="36" r="1.4" fill="#4ecdc4" />
                {:else if card.route === '/tiangong'}
                  <!-- Tiangong: T-shape with multi-color modules + glowing solar panels -->
                  <ellipse cx="24" cy="46" rx="24" ry="6" fill="rgba(193,68,14,0.18)" />
                  <!-- Tianhe core (vertical) -->
                  <rect
                    x="20"
                    y="6"
                    width="8"
                    height="36"
                    fill="rgba(255,200,120,0.18)"
                    stroke="rgba(255,216,160,0.85)"
                    stroke-width="0.9"
                  />
                  <line
                    x1="20"
                    y1="14"
                    x2="28"
                    y2="14"
                    stroke="rgba(255,216,160,0.5)"
                    stroke-width="0.4"
                  />
                  <line
                    x1="20"
                    y1="22"
                    x2="28"
                    y2="22"
                    stroke="rgba(255,216,160,0.5)"
                    stroke-width="0.4"
                  />
                  <line
                    x1="20"
                    y1="30"
                    x2="28"
                    y2="30"
                    stroke="rgba(255,216,160,0.5)"
                    stroke-width="0.4"
                  />
                  <line
                    x1="20"
                    y1="38"
                    x2="28"
                    y2="38"
                    stroke="rgba(255,216,160,0.5)"
                    stroke-width="0.4"
                  />
                  <!-- Wentian + Mengtian (horizontal labs in teal) -->
                  <rect
                    x="6"
                    y="20"
                    width="36"
                    height="8"
                    fill="rgba(78,205,196,0.18)"
                    stroke="#4ecdc4"
                    stroke-width="0.9"
                  />
                  <line
                    x1="14"
                    y1="20"
                    x2="14"
                    y2="28"
                    stroke="rgba(78,205,196,0.4)"
                    stroke-width="0.4"
                  />
                  <line
                    x1="34"
                    y1="20"
                    x2="34"
                    y2="28"
                    stroke="rgba(78,205,196,0.4)"
                    stroke-width="0.4"
                  />
                  <!-- Solar panel wings (gold) -->
                  <rect x="0" y="22" width="6" height="4" fill="url(#ic-panel-gold)" />
                  <rect x="42" y="22" width="6" height="4" fill="url(#ic-panel-gold)" />
                  <!-- Center docking port glow -->
                  <circle cx="24" cy="24" r="2.5" fill="url(#ic-glow-teal)" />
                  <circle cx="24" cy="24" r="1.2" fill="#4ecdc4" />
                {:else if card.route === '/science'}
                  <!-- Atomic / orbital science glyph: nucleus + 3 multi-colored electron orbits + ∆v formula -->
                  <ellipse
                    cx="24"
                    cy="24"
                    rx="20"
                    ry="7"
                    fill="none"
                    stroke="#4ecdc4"
                    stroke-width="1.2"
                  />
                  <ellipse
                    cx="24"
                    cy="24"
                    rx="20"
                    ry="7"
                    fill="none"
                    stroke="#c14ad8"
                    stroke-width="1.2"
                    transform="rotate(60 24 24)"
                  />
                  <ellipse
                    cx="24"
                    cy="24"
                    rx="20"
                    ry="7"
                    fill="none"
                    stroke="#ffc850"
                    stroke-width="1.2"
                    transform="rotate(-60 24 24)"
                  />
                  <!-- Electron / planet markers on each orbit -->
                  <circle cx="44" cy="24" r="1.6" fill="#4ecdc4" />
                  <circle cx="14" cy="14" r="1.6" fill="#c14ad8" />
                  <circle cx="34" cy="36" r="1.6" fill="#ffc850" />
                  <!-- Nucleus glow -->
                  <circle cx="24" cy="24" r="6" fill="url(#ic-sun-corona)" />
                  <circle cx="24" cy="24" r="3.2" fill="url(#ic-sun)" />
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
    /* Reduced top padding so the hero illustration sits close to the
       nav bar; breathing room added below the illustration via the
       svg's bottom margin so the wordmark doesn't crowd it. */
    padding: 24px 24px 48px;
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
    margin: 0 auto 32px;
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
      padding: 16px 16px 32px;
    }
    .wordmark {
      font-size: 48px;
      letter-spacing: 6px;
    }
    .hero-illustration {
      max-width: 100%;
      margin-bottom: 20px;
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

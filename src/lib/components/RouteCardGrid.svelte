<script lang="ts">
  /**
   * Shared big-box route-card grid.
   *
   * Extracted from the home landing (`src/routes/+page.svelte`) so the
   * `/explore` hub can render the same house-style tiles without cloning the
   * ~470 lines of hand-drawn per-route SVG. One source of truth for the icon
   * set + card styling; callers supply the card list and an href builder
   * (locale-aware) so the grid stays presentational.
   *
   * The gradient/filter `<defs>` and the per-route icon `{#if}` chain live
   * together here so the `url(#ic-*)` references resolve within the component
   * scope.
   */
  interface RouteCard {
    /** App path — used for the href, the per-card audio-stage id, and the key. */
    route: string;
    /** Display headline for the tile (e.g. the nav label "OUR SOLAR SYSTEM"). */
    name: string;
    title: string;
    desc: string;
  }

  let {
    cards,
    hrefFor,
    gridTestId = 'landing-cards',
    gridAudioStage = 'route-grid',
  }: {
    cards: RouteCard[];
    /** Build the (locale-aware) href for a card route. */
    hrefFor: (route: string) => string;
    gridTestId?: string;
    gridAudioStage?: string;
  } = $props();
</script>

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

<ul class="card-grid" data-testid={gridTestId} data-audio-stage={gridAudioStage}>
  {#each cards as card (card.route)}
    <li>
      <a
        class="card"
        href={hrefFor(card.route)}
        aria-label={`${card.name}: ${card.title}`}
        data-audio-stage="route-card-{card.route.slice(1)}"
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
              <line x1="2" y1="22" x2="8" y2="22" stroke="rgba(15,40,38,0.6)" stroke-width="0.4" />
              <line
                x1="40"
                y1="22"
                x2="46"
                y2="22"
                stroke="rgba(15,40,38,0.6)"
                stroke-width="0.4"
              />
              <line x1="2" y1="26" x2="8" y2="26" stroke="rgba(15,40,38,0.6)" stroke-width="0.4" />
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
            {:else if card.route === '/programs'}
              <!-- Programs: a mission-patch badge — gold ring, navy field, a
                   rising trajectory to a star, small agency-star markers. -->
              <circle
                cx="24"
                cy="24"
                r="17"
                fill="none"
                stroke="url(#ic-panel-gold)"
                stroke-width="2"
              />
              <circle
                cx="24"
                cy="24"
                r="13.5"
                fill="rgba(10,20,40,0.55)"
                stroke="rgba(255,255,255,0.25)"
                stroke-width="0.6"
              />
              <!-- Rising mission arc + craft -->
              <path
                d="M 13 33 Q 24 8 35 21"
                fill="none"
                stroke="url(#ic-traj)"
                stroke-width="1.6"
                stroke-dasharray="3 2"
              />
              <polygon points="33,18 39,21 33,24 35,21" fill="url(#ic-craft)" />
              <!-- Agency stars -->
              <circle cx="16" cy="16" r="1.2" fill="#ffc850" />
              <circle cx="30" cy="31" r="1.2" fill="#c14ad8" />
              <circle cx="24" cy="12.5" r="1.4" fill="url(#ic-glow-teal)" />
              <circle cx="24" cy="12.5" r="0.7" fill="#a0fff0" />
            {:else if card.route === '/essays'}
              <!-- Essays (The Long View): an open book with a star rising off
                   the page — long-form reading about the far future. -->
              <path
                d="M 24 15 C 18 12 11 12 6 14 L 6 34 C 11 32 18 32 24 35 Z"
                fill="rgba(255,255,255,0.05)"
                stroke="rgba(255,255,255,0.6)"
                stroke-width="1"
              />
              <path
                d="M 24 15 C 30 12 37 12 42 14 L 42 34 C 37 32 30 32 24 35 Z"
                fill="rgba(78,205,196,0.08)"
                stroke="#4ecdc4"
                stroke-width="1"
              />
              <line
                x1="24"
                y1="15"
                x2="24"
                y2="35"
                stroke="rgba(255,255,255,0.5)"
                stroke-width="0.8"
              />
              <!-- Text lines (left page) -->
              <line
                x1="10"
                y1="19"
                x2="20"
                y2="20"
                stroke="rgba(255,255,255,0.3)"
                stroke-width="0.6"
              />
              <line
                x1="10"
                y1="23"
                x2="20"
                y2="24"
                stroke="rgba(255,255,255,0.3)"
                stroke-width="0.6"
              />
              <line
                x1="10"
                y1="27"
                x2="18"
                y2="28"
                stroke="rgba(255,255,255,0.3)"
                stroke-width="0.6"
              />
              <!-- The long view: a star above the right page -->
              <circle cx="35" cy="11" r="3" fill="url(#ic-glow-teal)" />
              <circle cx="35" cy="11" r="1.3" fill="#ffc850" />
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
          <span class="card-name">{card.name}</span>
        </span>
        <span class="card-title">{card.title}</span>
        <span class="card-desc">{card.desc}</span>
      </a>
    </li>
  {/each}
</ul>

<style>
  .card-grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr;
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
  .card-name {
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

  @media (min-width: 768px) {
    .card-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 1024px) {
    .card-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }
  /* TV / 10-foot landscape (RFC-031 S6) — compact 3-up grid, all in view. */
  @media (hover: none) and (pointer: coarse) and (min-width: 1100px) and (max-resolution: 1.5dppx) {
    .card-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .card {
      transition: none;
    }
    .card:hover,
    .card:focus-visible {
      transform: none;
    }
  }
</style>

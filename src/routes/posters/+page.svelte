<script lang="ts">
  // STYLE PILOT — three sample posters, one per candidate style.
  //   A. JPL "Visions of the Future" — modern bold travel-poster
  //      (best for present-day planetary subjects)
  //   B. Era-matched per subject — commemorative patch / Soviet
  //      constructivist / mid-century (best for historical events)
  //   C. Engineering blueprint with color — extension of /science
  //      chapter covers (best for spacecraft + technical reference)
  //
  // Each pilot uses the subject the style suits BEST, so you see
  // what the style does at its strongest:
  //   A · Mars         → JPL travel poster
  //   B · Apollo 11    → commemorative mission patch
  //   C · Voyager      → engineering blueprint
  //
  // Once the style winner is locked, the rest of the gallery
  // (Solar System, Earth, Moon, ISS, Tiangong, Sputnik, Gagarin,
  // Sojourner, etc.) gets generated in that style. Mixing styles
  // (e.g., JPL for planets, patch for missions) is also on the table.
</script>

<svelte:head>
  <title>Gallery — style pilot · Orrery</title>
</svelte:head>

<article class="pilot">
  <header>
    <h1>GALLERY · STYLE PILOT</h1>
    <p class="lede">
      Three candidate visual directions, each shown on the subject it fits best. Pick a column. The
      full gallery (≈11 posters) gets built in the winner — mixing styles per subject is also on the
      table.
    </p>
  </header>

  <div class="grid">
    <!-- ─── Column A · JPL "Visions of the Future" · MARS ───────── -->
    <section class="col">
      <header class="col-head">
        <span class="col-tag">A</span>
        <h2>JPL "Visions of the Future"</h2>
        <p>
          Bold travel-poster. Stylised illustration, vintage-modern type, saturated palette. Best
          for present-day planetary subjects.
        </p>
      </header>
      <figure class="poster">
        <svg
          viewBox="0 0 600 900"
          role="img"
          aria-label="Mars travel-poster (JPL Visions of the Future style)"
        >
          <defs>
            <linearGradient id="ma-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1a0a2a" />
              <stop offset="40%" stop-color="#5a1a3a" />
              <stop offset="75%" stop-color="#c1440e" />
              <stop offset="100%" stop-color="#3a1408" />
            </linearGradient>
            <radialGradient id="ma-sun" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stop-color="#ffe6a0" />
              <stop offset="60%" stop-color="#ffc850" />
              <stop offset="100%" stop-color="#ff8830" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="ma-mars" cx="0.35" cy="0.35" r="0.7">
              <stop offset="0%" stop-color="#ffb088" />
              <stop offset="55%" stop-color="#c1440e" />
              <stop offset="100%" stop-color="#3a1408" />
            </radialGradient>
            <radialGradient id="ma-moon" cx="0.4" cy="0.4" r="0.6">
              <stop offset="0%" stop-color="#d8d0c8" />
              <stop offset="100%" stop-color="#5a4a40" />
            </radialGradient>
          </defs>
          <rect width="600" height="900" fill="url(#ma-sky)" />
          <circle cx="450" cy="200" r="140" fill="url(#ma-sun)" />
          <circle cx="450" cy="200" r="22" fill="#ffe6a0" />
          <circle cx="160" cy="160" r="55" fill="url(#ma-mars)" />
          <circle
            cx="160"
            cy="160"
            r="55"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            stroke-width="0.8"
          />
          <circle cx="240" cy="120" r="6" fill="url(#ma-moon)" />
          <circle cx="100" cy="240" r="4" fill="url(#ma-moon)" />
          <circle cx="80" cy="60" r="1.5" fill="#fff" opacity="0.7" />
          <circle cx="320" cy="80" r="1" fill="#fff" opacity="0.5" />
          <circle cx="540" cy="350" r="1.2" fill="#fff" opacity="0.6" />
          <circle cx="60" cy="380" r="1" fill="#fff" opacity="0.4" />
          <circle cx="380" cy="420" r="1.1" fill="#fff" opacity="0.55" />
          <!-- Foreground dunes -->
          <path
            d="M 0 700 Q 150 620 280 660 Q 420 700 600 640 L 600 900 L 0 900 Z"
            fill="#3a1408"
          />
          <path
            d="M 0 760 Q 200 700 380 750 Q 500 780 600 740 L 600 900 L 0 900 Z"
            fill="#1f0904"
          />
          <!-- Olympus Mons + Tharsis silhouette -->
          <path
            d="M 30 720 L 90 660 L 130 700 Q 160 710 180 700 L 220 660 L 280 720 Z"
            fill="#2a0e08"
          />
          <!-- Astronaut on horizon -->
          <g transform="translate(310 660)">
            <circle r="6" fill="#0a0408" />
            <rect x="-5" y="4" width="10" height="22" fill="#0a0408" />
            <rect x="-3" y="26" width="3" height="14" fill="#0a0408" />
            <rect x="0" y="26" width="3" height="14" fill="#0a0408" />
            <line x1="-5" y1="10" x2="-12" y2="20" stroke="#0a0408" stroke-width="3" />
            <line x1="5" y1="10" x2="12" y2="22" stroke="#0a0408" stroke-width="3" />
          </g>
          <!-- Title block -->
          <text
            x="300"
            y="800"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="120"
            letter-spacing="14"
            fill="#ffe6a0"
            text-anchor="middle">MARS</text
          >
          <text
            x="300"
            y="838"
            font-family="var(--font-mono), monospace"
            font-size="14"
            letter-spacing="8"
            fill="#ffc850"
            text-anchor="middle">TWO YEARS AWAY · ALWAYS WAITING</text
          >
          <text
            x="300"
            y="862"
            font-family="var(--font-mono), monospace"
            font-size="9"
            letter-spacing="3"
            fill="#ffc850"
            opacity="0.75"
            text-anchor="middle">FOURTH PLANET · 142 MILLION KM AT CLOSEST · 687-DAY YEAR</text
          >
          <!-- ORRERY signature watermark -->
          <text
            x="40"
            y="880"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="14"
            letter-spacing="4"
            fill="rgba(255,255,255,0.45)">ORRERY</text
          >
          <text
            x="560"
            y="880"
            font-family="var(--font-mono), monospace"
            font-size="9"
            letter-spacing="3"
            fill="rgba(255,255,255,0.35)"
            text-anchor="end">orrery.app</text
          >
        </svg>
      </figure>
    </section>

    <!-- ─── Column B · Era-matched · APOLLO 11 mission patch ────── -->
    <section class="col">
      <header class="col-head">
        <span class="col-tag">B</span>
        <h2>Era-matched per subject</h2>
        <p>
          Each poster gets a treatment fitting its era — Mars as JPL ad, Apollo 11 as commemorative
          patch, Sputnik as Soviet constructivist. Most expressive; gallery becomes a tour through
          space-art history.
        </p>
      </header>
      <figure class="poster">
        <svg
          viewBox="0 0 600 900"
          role="img"
          aria-label="Apollo 11 commemorative mission-patch poster"
        >
          <defs>
            <radialGradient id="ab-bg" cx="0.5" cy="0.4" r="0.6">
              <stop offset="0%" stop-color="#0a1430" />
              <stop offset="100%" stop-color="#000208" />
            </radialGradient>
            <radialGradient id="ab-earth" cx="0.4" cy="0.4" r="0.6">
              <stop offset="0%" stop-color="#a8e0ff" />
              <stop offset="50%" stop-color="#4b9cd3" />
              <stop offset="100%" stop-color="#0a1b30" />
            </radialGradient>
            <radialGradient id="ab-moon" cx="0.4" cy="0.4" r="0.6">
              <stop offset="0%" stop-color="#e8e0d8" />
              <stop offset="100%" stop-color="#3a3530" />
            </radialGradient>
          </defs>
          <rect width="600" height="900" fill="url(#ab-bg)" />
          <!-- Patch outer rope rings -->
          <circle cx="300" cy="380" r="245" fill="none" stroke="#ffc850" stroke-width="3" />
          <circle cx="300" cy="380" r="252" fill="none" stroke="#8a6818" stroke-width="0.8" />
          <circle cx="300" cy="380" r="238" fill="none" stroke="#8a6818" stroke-width="0.8" />
          <!-- Tick marks (embroidery hint) -->
          <g stroke="#8a6818" stroke-width="1.2">
            <line x1="300" y1="135" x2="300" y2="145" />
            <line x1="300" y1="615" x2="300" y2="625" />
            <line x1="55" y1="380" x2="65" y2="380" />
            <line x1="535" y1="380" x2="545" y2="380" />
          </g>
          <!-- Curved title around the top -->
          <defs>
            <path id="ab-arc-top" d="M 90 380 A 210 210 0 0 1 510 380" fill="none" />
            <path id="ab-arc-bot" d="M 510 380 A 210 210 0 0 1 90 380" fill="none" />
          </defs>
          <text
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="36"
            letter-spacing="14"
            fill="#ffc850"
          >
            <textPath href="#ab-arc-top" startOffset="50%" text-anchor="middle"
              >APOLLO ELEVEN</textPath
            >
          </text>
          <text
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="22"
            letter-spacing="8"
            fill="#ffc850"
          >
            <textPath href="#ab-arc-bot" startOffset="50%" text-anchor="middle"
              >ARMSTRONG · COLLINS · ALDRIN</textPath
            >
          </text>
          <!-- Moon (focal point) -->
          <circle cx="300" cy="380" r="160" fill="url(#ab-moon)" />
          <ellipse cx="270" cy="340" rx="20" ry="18" fill="rgba(60,55,50,0.5)" />
          <ellipse cx="340" cy="380" rx="28" ry="24" fill="rgba(60,55,50,0.5)" />
          <ellipse cx="290" cy="430" rx="14" ry="12" fill="rgba(60,55,50,0.5)" />
          <ellipse cx="240" cy="400" rx="10" ry="8" fill="rgba(60,55,50,0.5)" />
          <ellipse cx="350" cy="320" rx="8" ry="6" fill="rgba(60,55,50,0.4)" />
          <!-- Eagle silhouette descending -->
          <g transform="translate(300 380)" fill="#fff" opacity="0.95">
            <path d="M 0 -10 Q 8 -5 5 0 Q 2 8 -2 8 Q -8 5 -5 0 Q -8 -5 0 -10 Z" />
            <path d="M -5 -2 Q -45 -25 -65 -10 Q -50 -5 -10 5 Z" />
            <path d="M 5 -2 Q 45 -25 65 -10 Q 50 -5 10 5 Z" />
            <line x1="-3" y1="8" x2="-15" y2="22" stroke="#7da870" stroke-width="2" />
            <circle cx="-15" cy="22" r="3" fill="#7da870" />
            <circle cx="-12" cy="18" r="2.5" fill="#7da870" />
            <circle cx="-18" cy="20" r="2" fill="#7da870" />
          </g>
          <!-- Earth in upper-right of patch -->
          <circle cx="430" cy="280" r="40" fill="url(#ab-earth)" />
          <circle
            cx="430"
            cy="280"
            r="40"
            fill="none"
            stroke="rgba(168,224,255,0.5)"
            stroke-width="1"
          />
          <!-- Patch stars -->
          <circle cx="160" cy="240" r="1.5" fill="#fff" />
          <circle cx="450" cy="450" r="1.5" fill="#fff" />
          <circle cx="180" cy="490" r="1.2" fill="#fff" />
          <circle cx="380" cy="200" r="1.2" fill="#fff" />
          <!-- Title block bottom -->
          <text
            x="300"
            y="720"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="56"
            letter-spacing="6"
            fill="#ffffff"
            text-anchor="middle">FOOTPRINTS</text
          >
          <text
            x="300"
            y="755"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="34"
            letter-spacing="4"
            fill="#ffc850"
            text-anchor="middle">FOR A MILLION YEARS</text
          >
          <text
            x="300"
            y="800"
            font-family="var(--font-mono), monospace"
            font-size="11"
            letter-spacing="4"
            fill="rgba(255,255,255,0.55)"
            text-anchor="middle">JULY 20 · 1969 · MARE TRANQUILLITATIS</text
          >
          <text
            x="300"
            y="820"
            font-family="var(--font-mono), monospace"
            font-size="10"
            letter-spacing="3"
            fill="rgba(255,255,255,0.45)"
            text-anchor="middle">SATURN V · LM EAGLE · CSM COLUMBIA</text
          >
          <!-- ORRERY watermark -->
          <text
            x="40"
            y="880"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="14"
            letter-spacing="4"
            fill="rgba(255,255,255,0.45)">ORRERY</text
          >
          <text
            x="560"
            y="880"
            font-family="var(--font-mono), monospace"
            font-size="9"
            letter-spacing="3"
            fill="rgba(255,255,255,0.35)"
            text-anchor="end">orrery.app</text
          >
        </svg>
      </figure>
    </section>

    <!-- ─── Column C · Engineering blueprint · VOYAGER ─────────── -->
    <section class="col">
      <header class="col-head">
        <span class="col-tag">C</span>
        <h2>Engineering blueprint with color</h2>
        <p>
          Technical drawing with callouts, accent teal, mono labels. Extends the /science
          chapter-cover language. Best for spacecraft + technical-reference subjects.
        </p>
      </header>
      <figure class="poster">
        <svg viewBox="0 0 600 900" role="img" aria-label="Voyager engineering-blueprint poster">
          <rect width="600" height="900" fill="#04040c" />
          <!-- Grid background -->
          <g stroke="rgba(78,205,196,0.05)" stroke-width="0.5">
            <line x1="0" y1="100" x2="600" y2="100" />
            <line x1="0" y1="200" x2="600" y2="200" />
            <line x1="0" y1="300" x2="600" y2="300" />
            <line x1="0" y1="400" x2="600" y2="400" />
            <line x1="0" y1="500" x2="600" y2="500" />
            <line x1="0" y1="600" x2="600" y2="600" />
            <line x1="0" y1="700" x2="600" y2="700" />
            <line x1="0" y1="800" x2="600" y2="800" />
            <line x1="100" y1="0" x2="100" y2="900" />
            <line x1="200" y1="0" x2="200" y2="900" />
            <line x1="300" y1="0" x2="300" y2="900" />
            <line x1="400" y1="0" x2="400" y2="900" />
            <line x1="500" y1="0" x2="500" y2="900" />
          </g>
          <!-- Header -->
          <line x1="40" y1="60" x2="560" y2="60" stroke="#4ecdc4" stroke-width="1" />
          <line x1="40" y1="68" x2="560" y2="68" stroke="rgba(78,205,196,0.4)" stroke-width="0.5" />
          <text
            x="40"
            y="50"
            font-family="var(--font-mono), monospace"
            font-size="10"
            letter-spacing="3"
            fill="#4ecdc4">ORRERY · SPACECRAFT REFERENCE</text
          >
          <text
            x="560"
            y="50"
            font-family="var(--font-mono), monospace"
            font-size="10"
            letter-spacing="2"
            fill="rgba(255,255,255,0.5)"
            text-anchor="end">SHEET 10 / 11</text
          >

          <!-- Trajectory map (top third) -->
          <g transform="translate(0 90)">
            <text
              x="40"
              y="14"
              font-family="var(--font-mono), monospace"
              font-size="10"
              letter-spacing="3"
              fill="rgba(255,255,255,0.6)">GRAND TOUR · 1977 — INTERSTELLAR</text
            >
            <!-- Sun -->
            <circle cx="120" cy="80" r="6" fill="#ffc850" />
            <text
              x="118"
              y="100"
              font-family="var(--font-mono), monospace"
              font-size="8"
              fill="rgba(255,200,80,0.8)"
              text-anchor="middle">SOL</text
            >
            <!-- Trajectory arc through outer planets -->
            <path
              d="M 120 80 Q 200 60 290 110 Q 360 150 440 100 Q 510 70 560 130"
              fill="none"
              stroke="#4ecdc4"
              stroke-width="1.5"
              stroke-dasharray="5 3"
            />
            <!-- Flyby planets -->
            <circle cx="200" cy="80" r="4" fill="#c89968" />
            <text
              x="200"
              y="68"
              font-family="var(--font-mono), monospace"
              font-size="8"
              fill="rgba(200,153,104,0.85)"
              text-anchor="middle">JUPITER · 1979</text
            >
            <circle cx="290" cy="110" r="3.5" fill="#d8b878" />
            <text
              x="290"
              y="130"
              font-family="var(--font-mono), monospace"
              font-size="8"
              fill="rgba(216,184,120,0.85)"
              text-anchor="middle">SATURN · 1980</text
            >
            <circle cx="380" cy="120" r="3" fill="#88d4d4" />
            <text
              x="380"
              y="140"
              font-family="var(--font-mono), monospace"
              font-size="8"
              fill="rgba(136,212,212,0.85)"
              text-anchor="middle">URANUS · 1986</text
            >
            <circle cx="450" cy="100" r="3" fill="#3060c0" />
            <text
              x="450"
              y="86"
              font-family="var(--font-mono), monospace"
              font-size="8"
              fill="rgba(96,144,224,0.85)"
              text-anchor="middle">NEPTUNE · 1989</text
            >
            <circle cx="560" cy="130" r="3" fill="#c14ad8" />
            <text
              x="552"
              y="148"
              font-family="var(--font-mono), monospace"
              font-size="8"
              fill="rgba(193,74,216,0.85)"
              text-anchor="end">INTERSTELLAR</text
            >
          </g>

          <!-- Voyager spacecraft schematic (centred, side view) -->
          <g transform="translate(300 430)">
            <!-- High-Gain Antenna (3.7m dish) -->
            <ellipse
              cx="0"
              cy="-90"
              rx="120"
              ry="22"
              fill="rgba(255,255,255,0.04)"
              stroke="#fff"
              stroke-width="1.4"
            />
            <ellipse
              cx="0"
              cy="-90"
              rx="120"
              ry="22"
              fill="none"
              stroke="#fff"
              stroke-width="0.5"
              stroke-dasharray="3 2"
            />
            <ellipse
              cx="0"
              cy="-92"
              rx="40"
              ry="6"
              fill="rgba(255,255,255,0.08)"
              stroke="rgba(255,255,255,0.5)"
              stroke-width="0.5"
            />
            <!-- Bus / Electronics box -->
            <polygon
              points="-40,-65 -40,-25 40,-25 40,-65"
              fill="rgba(78,205,196,0.06)"
              stroke="#fff"
              stroke-width="1.4"
            />
            <line
              x1="-40"
              y1="-45"
              x2="40"
              y2="-45"
              stroke="rgba(255,255,255,0.4)"
              stroke-width="0.5"
            />
            <text
              x="0"
              y="-50"
              font-family="var(--font-mono), monospace"
              font-size="6"
              fill="rgba(255,255,255,0.7)"
              text-anchor="middle">BUS</text
            >
            <!-- Magnetometer boom (long, extends right) -->
            <line x1="40" y1="-45" x2="220" y2="-45" stroke="#fff" stroke-width="1" />
            <circle cx="220" cy="-45" r="3" fill="#4ecdc4" />
            <!-- Science instrument boom (left) -->
            <line x1="-40" y1="-35" x2="-160" y2="0" stroke="#fff" stroke-width="1" />
            <rect
              x="-180"
              y="-10"
              width="20"
              height="22"
              fill="rgba(255,200,80,0.08)"
              stroke="#fff"
              stroke-width="1"
            />
            <line
              x1="-180"
              y1="-5"
              x2="-160"
              y2="-5"
              stroke="rgba(255,255,255,0.5)"
              stroke-width="0.4"
            />
            <line
              x1="-180"
              y1="5"
              x2="-160"
              y2="5"
              stroke="rgba(255,255,255,0.5)"
              stroke-width="0.4"
            />
            <!-- Cameras + spectrometers -->
            <rect
              x="-178"
              y="14"
              width="16"
              height="8"
              fill="#1a1a1c"
              stroke="#4ecdc4"
              stroke-width="0.8"
            />
            <rect
              x="-160"
              y="14"
              width="14"
              height="8"
              fill="#1a1a1c"
              stroke="#4ecdc4"
              stroke-width="0.8"
            />
            <!-- RTGs (3 stacked, far-right boom) -->
            <line x1="40" y1="-35" x2="140" y2="20" stroke="#fff" stroke-width="1" />
            <g transform="translate(140 20)">
              <ellipse
                cx="0"
                cy="0"
                rx="18"
                ry="6"
                fill="rgba(193,68,14,0.18)"
                stroke="#c1440e"
                stroke-width="1"
              />
              <ellipse
                cx="0"
                cy="14"
                rx="18"
                ry="6"
                fill="rgba(193,68,14,0.18)"
                stroke="#c1440e"
                stroke-width="1"
              />
              <ellipse
                cx="0"
                cy="28"
                rx="18"
                ry="6"
                fill="rgba(193,68,14,0.18)"
                stroke="#c1440e"
                stroke-width="1"
              />
              <line x1="-18" y1="0" x2="-18" y2="28" stroke="#c1440e" stroke-width="1" />
              <line x1="18" y1="0" x2="18" y2="28" stroke="#c1440e" stroke-width="1" />
            </g>
            <!-- Golden Record (gold disc on side of bus) -->
            <circle cx="-30" cy="-45" r="6" fill="url(#vc-record)" />
            <circle cx="-30" cy="-45" r="6" fill="none" stroke="#ffc850" stroke-width="0.7" />
            <circle cx="-30" cy="-45" r="2" fill="#0a0a0c" />
            <!-- Plasma boom -->
            <line x1="0" y1="-25" x2="0" y2="40" stroke="#fff" stroke-width="0.8" />
            <circle cx="0" cy="44" r="3" fill="#4ecdc4" />
          </g>

          <defs>
            <radialGradient id="vc-record" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stop-color="#fff7c0" />
              <stop offset="100%" stop-color="#c89958" />
            </radialGradient>
          </defs>

          <!-- Callouts -->
          <line x1="180" y1="340" x2="80" y2="320" stroke="#4ecdc4" stroke-width="0.8" />
          <text
            x="40"
            y="318"
            font-family="var(--font-mono), monospace"
            font-size="10"
            fill="#4ecdc4">HIGH-GAIN ANTENNA</text
          >
          <text
            x="40"
            y="330"
            font-family="var(--font-mono), monospace"
            font-size="8"
            fill="rgba(78,205,196,0.7)">3.7 m DIA · X-BAND DOWNLINK</text
          >

          <line x1="270" y1="385" x2="120" y2="450" stroke="#4ecdc4" stroke-width="0.8" />
          <text
            x="40"
            y="448"
            font-family="var(--font-mono), monospace"
            font-size="10"
            fill="#4ecdc4">GOLDEN RECORD</text
          >
          <text
            x="40"
            y="460"
            font-family="var(--font-mono), monospace"
            font-size="8"
            fill="rgba(78,205,196,0.7)">CARL SAGAN'S MIXTAPE</text
          >

          <line x1="440" y1="450" x2="540" y2="490" stroke="#4ecdc4" stroke-width="0.8" />
          <text
            x="544"
            y="488"
            font-family="var(--font-mono), monospace"
            font-size="10"
            fill="#4ecdc4">RTG × 3</text
          >
          <text
            x="544"
            y="500"
            font-family="var(--font-mono), monospace"
            font-size="8"
            fill="rgba(78,205,196,0.7)">PLUTONIUM-238 · 470W BOL</text
          >

          <line x1="520" y1="385" x2="560" y2="380" stroke="#4ecdc4" stroke-width="0.8" />
          <text
            x="540"
            y="372"
            font-family="var(--font-mono), monospace"
            font-size="10"
            fill="#4ecdc4"
            text-anchor="end">MAG BOOM 13 m</text
          >

          <line x1="120" y1="430" x2="40" y2="560" stroke="#4ecdc4" stroke-width="0.8" />
          <text
            x="40"
            y="558"
            font-family="var(--font-mono), monospace"
            font-size="10"
            fill="#4ecdc4">IMAGING + SPECTROMETERS</text
          >
          <text
            x="40"
            y="570"
            font-family="var(--font-mono), monospace"
            font-size="8"
            fill="rgba(78,205,196,0.7)">ISS · UVS · IRIS · PPS · PLS</text
          >

          <!-- Title block bottom -->
          <line x1="40" y1="640" x2="560" y2="640" stroke="rgba(78,205,196,0.4)" stroke-width="1" />
          <text
            x="40"
            y="710"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="80"
            letter-spacing="8"
            fill="#ffffff">VOYAGER</text
          >
          <text
            x="40"
            y="755"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="34"
            letter-spacing="4"
            fill="#4ecdc4">FORTY-NINE YEARS · STILL TALKING</text
          >
          <text
            x="40"
            y="790"
            font-family="var(--font-mono), monospace"
            font-size="11"
            letter-spacing="3"
            fill="rgba(255,255,255,0.7)"
            >FARTHEST OBJECT MADE BY HUMAN HANDS · 25.0 LIGHT-HOURS · 24.7 BN KM</text
          >
          <text
            x="40"
            y="810"
            font-family="var(--font-mono), monospace"
            font-size="9"
            letter-spacing="2"
            fill="rgba(255,255,255,0.55)"
            >VOYAGER 1 · LAUNCH 1977-09-05 · FLY-BY: JUPITER 1979 · SATURN 1980</text
          >
          <text
            x="40"
            y="828"
            font-family="var(--font-mono), monospace"
            font-size="9"
            letter-spacing="2"
            fill="rgba(255,255,255,0.55)"
            >VOYAGER 2 · LAUNCH 1977-08-20 · ALSO URANUS 1986 · NEPTUNE 1989</text
          >
          <text
            x="40"
            y="846"
            font-family="var(--font-mono), monospace"
            font-size="9"
            letter-spacing="2"
            fill="rgba(255,255,255,0.55)">INTERSTELLAR SPACE: V1 SINCE 2012 · V2 SINCE 2018</text
          >
          <text
            x="560"
            y="710"
            font-family="var(--font-mono), monospace"
            font-size="10"
            letter-spacing="2"
            fill="rgba(78,205,196,0.7)"
            text-anchor="end">REV. A · 2026</text
          >
          <!-- ORRERY watermark -->
          <text
            x="40"
            y="880"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="14"
            letter-spacing="4"
            fill="rgba(255,255,255,0.45)">ORRERY</text
          >
          <text
            x="560"
            y="880"
            font-family="var(--font-mono), monospace"
            font-size="9"
            letter-spacing="3"
            fill="rgba(255,255,255,0.35)"
            text-anchor="end">orrery.app</text
          >
        </svg>
      </figure>
    </section>
  </div>

  <footer class="pilot-footer">
    <p>
      <strong>How to read this:</strong> three style directions, each shown on the subject it suits
      best. Pick a column for the full gallery, OR mix (e.g., A for planets · B for historical
      missions · C for spacecraft). Once locked, the rest get generated in batch and the footer
      <code>Gallery</code> link goes live across the app.
    </p>
    <p>
      <strong>Print / wallpaper:</strong> SVG scales infinitely. Download-as-SVG + ORRERY watermark
      are baked into every poster. Right-click any poster → <em>Save as</em> for now; a proper download
      button comes once the style is locked.
    </p>
  </footer>
</article>

<style>
  .pilot {
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px 24px 64px;
    color: var(--color-text);
  }
  header {
    text-align: center;
    margin-bottom: 32px;
  }
  h1 {
    font-family: var(--font-display);
    font-size: 36px;
    letter-spacing: 6px;
    margin: 0 0 8px;
  }
  .lede {
    font-family: var(--font-editorial), 'Crimson Pro', serif;
    font-style: italic;
    font-size: 16px;
    color: rgba(255, 255, 255, 0.75);
    max-width: 760px;
    margin: 0 auto;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .col-head {
    padding: 16px 14px;
    border: 1px solid rgba(78, 205, 196, 0.25);
    border-radius: 4px;
    background: rgba(78, 205, 196, 0.04);
    text-align: left;
    margin: 0;
  }
  .col-tag {
    display: inline-block;
    width: 28px;
    height: 28px;
    line-height: 28px;
    text-align: center;
    background: #4ecdc4;
    color: #04040c;
    font-family: var(--font-display);
    font-size: 16px;
    border-radius: 4px;
    margin-right: 10px;
    vertical-align: middle;
  }
  .col-head h2 {
    display: inline-block;
    font-family: var(--font-display);
    font-size: 16px;
    letter-spacing: 2px;
    margin: 0;
    vertical-align: middle;
  }
  .col-head p {
    font-family: var(--font-mono), monospace;
    font-size: 11px;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.65);
    margin: 8px 0 0;
  }
  .poster {
    margin: 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    background: #000;
  }
  .poster svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .pilot-footer {
    margin-top: 48px;
    padding: 20px 24px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  .pilot-footer p {
    font-family: var(--font-mono), monospace;
    font-size: 13px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 12px;
  }
  .pilot-footer p:last-child {
    margin-bottom: 0;
  }
  .pilot-footer strong {
    color: #4ecdc4;
    font-weight: normal;
    letter-spacing: 1px;
  }
  .pilot-footer code {
    background: rgba(78, 205, 196, 0.12);
    color: #4ecdc4;
    padding: 1px 6px;
    border-radius: 2px;
    font-size: 12px;
  }

  @media (max-width: 1023px) {
    .grid {
      grid-template-columns: 1fr;
      max-width: 720px;
      margin: 0 auto;
    }
  }
  @media (max-width: 767px) {
    .pilot {
      padding: 16px 16px 32px;
    }
  }
</style>

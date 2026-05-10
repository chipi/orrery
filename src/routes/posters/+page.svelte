<script lang="ts">
  // ORRERY GALLERY — 11 art-print posters, three style families:
  //   A. JPL "Visions of the Future" — bold travel-poster
  //      (Solar System, Earth, Moon, Mars)
  //   B. Era-matched / unique — single iconic motif on a mood-lit
  //      set, big bold sentence (ISS, Tiangong, Apollo 11, Gagarin)
  //   C. Indie-comic / pop-art — bold flat illustration, halftone
  //      dots, limited cream + red + blue + gold palette
  //      (Sputnik, Voyager, Sojourner)
  //
  // Every poster is 600 × 900 portrait SVG. Right-click → Save as
  // gives the user an infinitely-scalable file suitable for
  // wallpaper, T-shirt print, or Zoom background. ORRERY watermark
  // in the corner of every poster.
</script>

<svelte:head>
  <title>Gallery · Orrery</title>
</svelte:head>

<article class="gallery">
  <header>
    <h1>ORRERY GALLERY</h1>
    <p class="lede">
      Eleven posters. Free to download — set them as wallpaper, print them on a T-shirt, use them as
      a Zoom background. SVG scales infinitely, ORRERY watermark in the corner of every piece.
    </p>
  </header>

  <div class="grid">
    <!-- ═══════ A · PLANETS (JPL Visions) ════════════════════════ -->

    <!-- 1 · Solar System -->
    <figure class="poster">
      <svg viewBox="0 0 600 900" role="img" aria-label="Solar System travel-poster">
        <defs>
          <linearGradient id="ss-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0a0a1c" />
            <stop offset="50%" stop-color="#1a1a3a" />
            <stop offset="100%" stop-color="#04040c" />
          </linearGradient>
          <radialGradient id="ss-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stop-color="#fff0c0" />
            <stop offset="40%" stop-color="#ffc850" />
            <stop offset="100%" stop-color="#ff8830" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="ss-saturn" cx="0.35" cy="0.35" r="0.7">
            <stop offset="0%" stop-color="#fff0c8" />
            <stop offset="55%" stop-color="#d8b878" />
            <stop offset="100%" stop-color="#5a4a30" />
          </radialGradient>
          <radialGradient id="ss-earth" cx="0.4" cy="0.4" r="0.6">
            <stop offset="0%" stop-color="#aacef0" />
            <stop offset="60%" stop-color="#3a78b8" />
            <stop offset="100%" stop-color="#0a1a3a" />
          </radialGradient>
          <radialGradient id="ss-jupiter" cx="0.4" cy="0.4" r="0.7">
            <stop offset="0%" stop-color="#ffd8a0" />
            <stop offset="100%" stop-color="#8a5a30" />
          </radialGradient>
        </defs>
        <rect width="600" height="900" fill="url(#ss-sky)" />
        <g fill="#fff" opacity="0.6">
          <circle cx="40" cy="80" r="0.8" />
          <circle cx="160" cy="130" r="1.2" />
          <circle cx="240" cy="60" r="0.9" />
          <circle cx="350" cy="100" r="0.7" />
          <circle cx="500" cy="50" r="1" />
          <circle cx="60" cy="280" r="1.1" />
          <circle cx="180" cy="340" r="0.8" />
          <circle cx="540" cy="350" r="1" />
          <circle cx="80" cy="540" r="0.7" />
          <circle cx="350" cy="560" r="0.9" />
          <circle cx="540" cy="540" r="0.8" />
        </g>
        <!-- Sun corona top-left -->
        <circle cx="90" cy="120" r="130" fill="url(#ss-sun)" />
        <circle cx="90" cy="120" r="30" fill="#fff0c0" />
        <!-- Saturn as hero -->
        <g transform="translate(360 340)">
          <ellipse
            cx="0"
            cy="0"
            rx="170"
            ry="34"
            fill="none"
            stroke="rgba(200,168,120,0.35)"
            stroke-width="10"
          />
          <ellipse cx="0" cy="0" rx="170" ry="34" fill="none" stroke="#c8a878" stroke-width="2" />
          <circle cx="0" cy="0" r="90" fill="url(#ss-saturn)" />
          <path
            d="M -78 -22 Q 0 -10 78 -22"
            stroke="rgba(80,60,30,0.45)"
            stroke-width="3"
            fill="none"
          />
          <path d="M -84 8 Q 0 18 84 8" stroke="rgba(80,60,30,0.35)" stroke-width="4" fill="none" />
          <path
            d="M -170 0 A 170 34 0 0 0 170 0"
            fill="none"
            stroke="rgba(200,168,120,0.7)"
            stroke-width="10"
          />
          <path d="M -170 0 A 170 34 0 0 0 170 0" fill="none" stroke="#c8a878" stroke-width="2.5" />
        </g>
        <!-- Planet row -->
        <g transform="translate(0 600)">
          <circle cx="50" cy="0" r="8" fill="#9a8870" />
          <text
            x="50"
            y="22"
            font-family="var(--font-mono), monospace"
            font-size="8"
            fill="rgba(255,255,255,0.65)"
            text-anchor="middle">MERCURY</text
          >
          <circle cx="130" cy="0" r="12" fill="#e8c890" />
          <text
            x="130"
            y="24"
            font-family="var(--font-mono), monospace"
            font-size="8"
            fill="rgba(255,255,255,0.65)"
            text-anchor="middle">VENUS</text
          >
          <circle cx="220" cy="0" r="14" fill="url(#ss-earth)" />
          <text
            x="220"
            y="26"
            font-family="var(--font-mono), monospace"
            font-size="8"
            fill="rgba(75,156,211,0.85)"
            text-anchor="middle">EARTH</text
          >
          <circle cx="295" cy="0" r="10" fill="#c1440e" />
          <text
            x="295"
            y="22"
            font-family="var(--font-mono), monospace"
            font-size="8"
            fill="rgba(193,68,14,0.85)"
            text-anchor="middle">MARS</text
          >
          <circle cx="380" cy="0" r="26" fill="url(#ss-jupiter)" />
          <text
            x="380"
            y="38"
            font-family="var(--font-mono), monospace"
            font-size="8"
            fill="rgba(255,200,80,0.85)"
            text-anchor="middle">JUPITER</text
          >
          <circle cx="480" cy="0" r="13" fill="#88d4d4" />
          <text
            x="480"
            y="24"
            font-family="var(--font-mono), monospace"
            font-size="8"
            fill="rgba(136,212,212,0.85)"
            text-anchor="middle">URANUS</text
          >
          <circle cx="550" cy="0" r="13" fill="#3060c0" />
          <text
            x="550"
            y="24"
            font-family="var(--font-mono), monospace"
            font-size="8"
            fill="rgba(96,144,224,0.85)"
            text-anchor="middle">NEPTUNE</text
          >
        </g>
        <!-- Title -->
        <text
          x="300"
          y="744"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="78"
          letter-spacing="10"
          fill="#fff0c0"
          text-anchor="middle">SOLAR SYSTEM</text
        >
        <text
          x="300"
          y="784"
          font-family="var(--font-mono), monospace"
          font-size="14"
          letter-spacing="8"
          fill="#ffc850"
          text-anchor="middle">EIGHT PLANETS · ONE STAR</text
        >
        <text
          x="300"
          y="816"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,200,80,0.7)"
          text-anchor="middle">4.6 BILLION YEARS OLD · 100 000 AU ACROSS · ONE WE KNOW OF</text
        >
        <text
          x="40"
          y="876"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="14"
          letter-spacing="4"
          fill="rgba(255,255,255,0.45)">ORRERY</text
        >
        <text
          x="560"
          y="876"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,255,255,0.35)"
          text-anchor="end">orrery.app</text
        >
      </svg>
    </figure>

    <!-- 2 · Earth -->
    <figure class="poster">
      <svg viewBox="0 0 600 900" role="img" aria-label="Earth travel-poster">
        <defs>
          <linearGradient id="er-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#04040c" />
            <stop offset="60%" stop-color="#0a1432" />
            <stop offset="100%" stop-color="#04040c" />
          </linearGradient>
          <radialGradient id="er-earth" cx="0.35" cy="0.35" r="0.75">
            <stop offset="0%" stop-color="#bce0ff" />
            <stop offset="40%" stop-color="#4b9cd3" />
            <stop offset="80%" stop-color="#1a3a78" />
            <stop offset="100%" stop-color="#04081e" />
          </radialGradient>
          <radialGradient id="er-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="55%" stop-color="rgba(75,156,211,0)" />
            <stop offset="100%" stop-color="rgba(75,156,211,0.35)" />
          </radialGradient>
          <radialGradient id="er-moon" cx="0.35" cy="0.35" r="0.7">
            <stop offset="0%" stop-color="#d8d0c8" />
            <stop offset="100%" stop-color="#3a342e" />
          </radialGradient>
        </defs>
        <rect width="600" height="900" fill="url(#er-sky)" />
        <g fill="#fff" opacity="0.55">
          <circle cx="60" cy="80" r="0.9" />
          <circle cx="140" cy="50" r="1.2" />
          <circle cx="240" cy="100" r="0.8" />
          <circle cx="380" cy="60" r="1" />
          <circle cx="500" cy="120" r="0.9" />
          <circle cx="540" cy="40" r="1.3" />
          <circle cx="40" cy="200" r="0.7" />
          <circle cx="120" cy="640" r="0.8" />
          <circle cx="540" cy="600" r="1" />
        </g>
        <!-- Moon in distance, upper-right -->
        <g transform="translate(490 130)">
          <circle cx="0" cy="0" r="30" fill="url(#er-moon)" />
          <circle cx="-8" cy="-6" r="3" fill="rgba(60,55,48,0.6)" />
          <circle cx="6" cy="4" r="4" fill="rgba(60,55,48,0.55)" />
          <circle cx="-4" cy="10" r="2.5" fill="rgba(60,55,48,0.5)" />
        </g>
        <!-- Earth hero. Defs for clip + terminator gradient kept local to
             this group so other posters' ids are unaffected. -->
        <defs>
          <clipPath id="er-globe-clip">
            <circle cx="0" cy="0" r="220" />
          </clipPath>
          <radialGradient id="er-terminator" cx="0.25" cy="0.4" r="0.85">
            <stop offset="40%" stop-color="rgba(0,0,0,0)" />
            <stop offset="80%" stop-color="rgba(0,0,0,0.35)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0.7)" />
          </radialGradient>
        </defs>
        <g transform="translate(300 370)">
          <circle cx="0" cy="0" r="280" fill="url(#er-glow)" />
          <circle cx="0" cy="0" r="220" fill="url(#er-earth)" />
        </g>
        <g clip-path="url(#er-globe-clip)" transform="translate(300 370)">
          <!-- Africa-like landmass -->
          <path
            d="M -10 -90 Q 20 -100 40 -70 Q 50 -30 35 10 Q 25 60 -5 90 Q -25 60 -30 20 Q -28 -30 -25 -60 Q -20 -85 -10 -90 Z"
            fill="rgba(120,180,90,0.6)"
          />
          <!-- Eurasia-like landmass -->
          <path
            d="M -90 -120 Q -40 -140 30 -130 Q 90 -120 130 -100 Q 100 -70 30 -70 Q -30 -75 -90 -90 Q -110 -110 -90 -120 Z"
            fill="rgba(120,180,90,0.55)"
          />
          <!-- Americas-like sliver on left limb -->
          <path
            d="M -180 -40 Q -160 -60 -140 -30 Q -130 30 -150 80 Q -180 100 -190 60 Q -200 0 -180 -40 Z"
            fill="rgba(120,180,90,0.5)"
          />
          <!-- Australia-like blob -->
          <ellipse cx="130" cy="70" rx="30" ry="16" fill="rgba(180,150,90,0.55)" />
          <!-- Antarctica hint at the south pole, clipped by the disc -->
          <ellipse cx="0" cy="190" rx="200" ry="42" fill="rgba(240,240,250,0.55)" />
          <!-- Cloud swirls (soft, broken bands) -->
          <ellipse cx="-120" cy="-30" rx="80" ry="14" fill="rgba(255,255,255,0.18)" />
          <ellipse
            cx="100"
            cy="-110"
            rx="60"
            ry="12"
            fill="rgba(255,255,255,0.2)"
            transform="rotate(-12 100 -110)"
          />
          <ellipse
            cx="20"
            cy="120"
            rx="90"
            ry="14"
            fill="rgba(255,255,255,0.15)"
            transform="rotate(8 20 120)"
          />
          <!-- Soft terminator: radial darkening that wraps the right limb,
               replacing the harsh triangular path. Light source = upper-left. -->
          <rect x="-220" y="-220" width="440" height="440" fill="url(#er-terminator)" />
        </g>
        <!-- Atmospheric rim highlight (drawn on top, outside the clip) -->
        <circle
          cx="300"
          cy="370"
          r="220"
          fill="none"
          stroke="rgba(180,220,255,0.35)"
          stroke-width="2"
        />
        <!-- Title -->
        <text
          x="300"
          y="780"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="120"
          letter-spacing="14"
          fill="#bce0ff"
          text-anchor="middle">EARTH</text
        >
        <text
          x="300"
          y="818"
          font-family="var(--font-mono), monospace"
          font-size="14"
          letter-spacing="8"
          fill="#4b9cd3"
          text-anchor="middle">ONE PLANET · NO BACKUP</text
        >
        <text
          x="300"
          y="842"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(75,156,211,0.75)"
          text-anchor="middle">THE ONLY KNOWN HARBOUR · 8 BILLION ROOMMATES · 365.25 DAYS</text
        >
        <text
          x="40"
          y="876"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="14"
          letter-spacing="4"
          fill="rgba(255,255,255,0.45)">ORRERY</text
        >
        <text
          x="560"
          y="876"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,255,255,0.35)"
          text-anchor="end">orrery.app</text
        >
      </svg>
    </figure>

    <!-- 3 · Moon -->
    <figure class="poster">
      <svg viewBox="0 0 600 900" role="img" aria-label="Moon travel-poster">
        <defs>
          <linearGradient id="mn-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#04040a" />
            <stop offset="100%" stop-color="#080812" />
          </linearGradient>
          <radialGradient id="mn-moon" cx="0.32" cy="0.32" r="0.78">
            <stop offset="0%" stop-color="#f8f4ee" />
            <stop offset="40%" stop-color="#cac4ba" />
            <stop offset="80%" stop-color="#5a564e" />
            <stop offset="100%" stop-color="#1a1814" />
          </radialGradient>
          <radialGradient id="mn-mare" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stop-color="#3a342e" />
            <stop offset="100%" stop-color="#6a625a" />
          </radialGradient>
          <radialGradient id="mn-earth" cx="0.4" cy="0.4" r="0.7">
            <stop offset="0%" stop-color="#aacef0" />
            <stop offset="60%" stop-color="#3a78b8" />
            <stop offset="100%" stop-color="#0a1a3a" />
          </radialGradient>
        </defs>
        <rect width="600" height="900" fill="url(#mn-sky)" />
        <g fill="#fff" opacity="0.55">
          <circle cx="40" cy="60" r="0.8" />
          <circle cx="200" cy="40" r="1.1" />
          <circle cx="320" cy="80" r="0.7" />
          <circle cx="500" cy="50" r="1" />
          <circle cx="560" cy="120" r="0.9" />
          <circle cx="60" cy="180" r="0.7" />
          <circle cx="540" cy="240" r="1.2" />
          <circle cx="100" cy="660" r="0.8" />
          <circle cx="530" cy="630" r="0.9" />
        </g>
        <!-- Earthrise: small Earth upper-left -->
        <defs>
          <clipPath id="mn-earth-clip">
            <circle cx="0" cy="0" r="38" />
          </clipPath>
          <radialGradient id="mn-earth-term" cx="0.25" cy="0.4" r="0.85">
            <stop offset="40%" stop-color="rgba(0,0,0,0)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0.55)" />
          </radialGradient>
        </defs>
        <g transform="translate(110 130)">
          <circle cx="0" cy="0" r="38" fill="url(#mn-earth)" />
        </g>
        <g clip-path="url(#mn-earth-clip)" transform="translate(110 130)">
          <ellipse cx="-6" cy="-2" rx="14" ry="6" fill="rgba(120,180,90,0.55)" />
          <ellipse cx="8" cy="14" rx="10" ry="6" fill="rgba(180,150,90,0.45)" />
          <ellipse cx="-12" cy="14" rx="8" ry="4" fill="rgba(120,180,90,0.45)" />
          <rect x="-40" y="-40" width="80" height="80" fill="url(#mn-earth-term)" />
        </g>
        <circle
          cx="110"
          cy="130"
          r="38"
          fill="none"
          stroke="rgba(180,220,255,0.3)"
          stroke-width="1.2"
        />
        <text
          x="110"
          y="190"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(75,156,211,0.6)"
          text-anchor="middle">EARTHRISE</text
        >
        <!-- Moon hero -->
        <g transform="translate(360 380)">
          <circle cx="0" cy="0" r="210" fill="url(#mn-moon)" />
          <!-- Maria -->
          <ellipse cx="-30" cy="-50" rx="60" ry="40" fill="url(#mn-mare)" opacity="0.7" />
          <ellipse cx="50" cy="20" rx="50" ry="35" fill="url(#mn-mare)" opacity="0.6" />
          <ellipse cx="-70" cy="60" rx="40" ry="30" fill="url(#mn-mare)" opacity="0.65" />
          <ellipse cx="40" cy="100" rx="35" ry="22" fill="url(#mn-mare)" opacity="0.5" />
          <!-- Crater impressions -->
          <g fill="rgba(40,36,30,0.45)" stroke="rgba(200,192,180,0.3)" stroke-width="0.6">
            <circle cx="80" cy="-80" r="10" />
            <circle cx="-100" cy="-20" r="7" />
            <circle cx="100" cy="-30" r="5" />
            <circle cx="-30" cy="120" r="9" />
            <circle cx="120" cy="60" r="6" />
            <circle cx="-130" cy="100" r="5" />
            <circle cx="60" cy="150" r="4" />
            <circle cx="160" cy="-10" r="4" />
            <circle cx="-160" cy="40" r="4" />
          </g>
          <!-- Tycho ray (faint) -->
          <line
            x1="-50"
            y1="100"
            x2="-180"
            y2="180"
            stroke="rgba(220,212,200,0.18)"
            stroke-width="2"
          />
          <line
            x1="-50"
            y1="100"
            x2="120"
            y2="180"
            stroke="rgba(220,212,200,0.18)"
            stroke-width="2"
          />
          <!-- Apollo landing markers -->
          <g fill="#ffc850">
            <circle cx="40" cy="0" r="2.5" />
            <circle cx="-60" cy="40" r="2" />
            <circle cx="-20" cy="-30" r="2" />
            <circle cx="60" cy="50" r="2" />
            <circle cx="-30" cy="60" r="2" />
            <circle cx="-100" cy="-50" r="2" />
          </g>
        </g>
        <!-- Soft terminator overlay clipped to the moon disc.
             Replaces the harsh triangular path; light source upper-left. -->
        <defs>
          <clipPath id="mn-globe-clip">
            <circle cx="360" cy="380" r="210" />
          </clipPath>
          <radialGradient id="mn-terminator" cx="0.22" cy="0.32" r="0.9">
            <stop offset="35%" stop-color="rgba(0,0,0,0)" />
            <stop offset="80%" stop-color="rgba(0,0,0,0.4)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0.75)" />
          </radialGradient>
        </defs>
        <rect
          x="150"
          y="170"
          width="420"
          height="420"
          fill="url(#mn-terminator)"
          clip-path="url(#mn-globe-clip)"
        />
        <!-- Title -->
        <text
          x="300"
          y="780"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="120"
          letter-spacing="14"
          fill="#f8f4ee"
          text-anchor="middle">MOON</text
        >
        <text
          x="300"
          y="818"
          font-family="var(--font-mono), monospace"
          font-size="14"
          letter-spacing="8"
          fill="#cac4ba"
          text-anchor="middle">TWELVE FOOTPRINTS · ONE GIANT LEAP</text
        >
        <text
          x="300"
          y="842"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(202,196,186,0.7)"
          text-anchor="middle">384 400 KM · TIDALLY LOCKED · 4.5 BILLION YEARS GREY</text
        >
        <text
          x="40"
          y="876"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="14"
          letter-spacing="4"
          fill="rgba(255,255,255,0.45)">ORRERY</text
        >
        <text
          x="560"
          y="876"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,255,255,0.35)"
          text-anchor="end">orrery.app</text
        >
      </svg>
    </figure>

    <!-- 4 · Mars (JPL Visions) -->
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
        <path d="M 0 700 Q 150 620 280 660 Q 420 700 600 640 L 600 900 L 0 900 Z" fill="#3a1408" />
        <path d="M 0 760 Q 200 700 380 750 Q 500 780 600 740 L 600 900 L 0 900 Z" fill="#1f0904" />
        <path
          d="M 30 720 L 90 660 L 130 700 Q 160 710 180 700 L 220 660 L 280 720 Z"
          fill="#2a0e08"
        />
        <g transform="translate(310 660)">
          <circle r="6" fill="#0a0408" />
          <rect x="-5" y="4" width="10" height="22" fill="#0a0408" />
          <rect x="-3" y="26" width="3" height="14" fill="#0a0408" />
          <rect x="0" y="26" width="3" height="14" fill="#0a0408" />
          <line x1="-5" y1="10" x2="-12" y2="20" stroke="#0a0408" stroke-width="3" />
          <line x1="5" y1="10" x2="12" y2="22" stroke="#0a0408" stroke-width="3" />
        </g>
        <text
          x="300"
          y="780"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="120"
          letter-spacing="14"
          fill="#ffe6a0"
          text-anchor="middle">MARS</text
        >
        <text
          x="300"
          y="818"
          font-family="var(--font-mono), monospace"
          font-size="14"
          letter-spacing="8"
          fill="#ffc850"
          text-anchor="middle">TWO YEARS AWAY · ALWAYS WAITING</text
        >
        <text
          x="300"
          y="842"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="#ffc850"
          opacity="0.75"
          text-anchor="middle">FOURTH PLANET · 142 MILLION KM AT CLOSEST · 687-DAY YEAR</text
        >
        <text
          x="40"
          y="876"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="14"
          letter-spacing="4"
          fill="rgba(255,255,255,0.45)">ORRERY</text
        >
        <text
          x="560"
          y="876"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,255,255,0.35)"
          text-anchor="end">orrery.app</text
        >
      </svg>
    </figure>

    <!-- ═══════ B · STATIONS & MISSIONS (era-matched) ═════════════ -->

    <!-- 5 · ISS — fifteen partner-nation flag colours circling the station -->
    <figure class="poster">
      <svg
        viewBox="0 0 600 900"
        role="img"
        aria-label="ISS poster — partner-nation flag colours circling the station"
      >
        <defs>
          <radialGradient id="is-bg" cx="0.5" cy="0.45" r="0.7">
            <stop offset="0%" stop-color="#0a1a3a" />
            <stop offset="60%" stop-color="#04081e" />
            <stop offset="100%" stop-color="#02040c" />
          </radialGradient>
          <radialGradient id="is-earth-limb" cx="0.5" cy="1" r="0.6">
            <stop offset="0%" stop-color="rgba(75,156,211,0.55)" />
            <stop offset="100%" stop-color="rgba(75,156,211,0)" />
          </radialGradient>
        </defs>
        <rect width="600" height="900" fill="url(#is-bg)" />
        <!-- Stars -->
        <g fill="#fff" opacity="0.55">
          <circle cx="60" cy="80" r="0.9" />
          <circle cx="200" cy="60" r="1.1" />
          <circle cx="380" cy="40" r="0.7" />
          <circle cx="520" cy="100" r="1" />
          <circle cx="80" cy="600" r="0.8" />
          <circle cx="500" cy="640" r="1" />
          <circle cx="260" cy="650" r="0.7" />
        </g>
        <!-- Earth limb at bottom -->
        <ellipse cx="300" cy="900" rx="500" ry="200" fill="url(#is-earth-limb)" />
        <ellipse cx="300" cy="940" rx="500" ry="180" fill="#1a3a78" />

        <!-- Ring of partner-nation flag colours.
             15 ISS partners (the 5 founding agencies cover 15 countries):
             NASA (US), Roscosmos (RU), JAXA (JP), CSA (CA), ESA (11 ESA
             members). Render 15 short coloured bars arranged in a circle
             around the station — a stylised "flag wreath." Letter codes
             ride below each bar. -->
        <g transform="translate(300 380)">
          <circle
            cx="0"
            cy="0"
            r="200"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="1"
          />
          <!-- 15 flags. The hex per nation is a representative dominant colour. -->
          <g>
            <!-- USA -->
            <g transform="rotate(0)">
              <rect x="-10" y="-216" width="20" height="14" fill="#bf0a30" />
              <rect x="-10" y="-208" width="20" height="6" fill="#fff" />
              <rect x="-10" y="-216" width="9" height="8" fill="#002868" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle">USA</text
              >
            </g>
            <!-- Russia -->
            <g transform="rotate(24)">
              <rect x="-10" y="-216" width="20" height="14" fill="#fff" />
              <rect x="-10" y="-211" width="20" height="5" fill="#0039a6" />
              <rect x="-10" y="-206" width="20" height="4" fill="#d52b1e" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-24, 0, -184)">RUS</text
              >
            </g>
            <!-- Japan -->
            <g transform="rotate(48)">
              <rect x="-10" y="-216" width="20" height="14" fill="#fff" />
              <circle cx="0" cy="-209" r="4" fill="#bc002d" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-48, 0, -184)">JPN</text
              >
            </g>
            <!-- Canada -->
            <g transform="rotate(72)">
              <rect x="-10" y="-216" width="6" height="14" fill="#d52b1e" />
              <rect x="-4" y="-216" width="8" height="14" fill="#fff" />
              <rect x="4" y="-216" width="6" height="14" fill="#d52b1e" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-72, 0, -184)">CAN</text
              >
            </g>
            <!-- Germany -->
            <g transform="rotate(96)">
              <rect x="-10" y="-216" width="20" height="5" fill="#000" />
              <rect x="-10" y="-211" width="20" height="5" fill="#dd0000" />
              <rect x="-10" y="-206" width="20" height="4" fill="#ffce00" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-96, 0, -184)">DEU</text
              >
            </g>
            <!-- France -->
            <g transform="rotate(120)">
              <rect x="-10" y="-216" width="7" height="14" fill="#0055a4" />
              <rect x="-3" y="-216" width="6" height="14" fill="#fff" />
              <rect x="3" y="-216" width="7" height="14" fill="#ef4135" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-120, 0, -184)">FRA</text
              >
            </g>
            <!-- Italy -->
            <g transform="rotate(144)">
              <rect x="-10" y="-216" width="7" height="14" fill="#009246" />
              <rect x="-3" y="-216" width="6" height="14" fill="#fff" />
              <rect x="3" y="-216" width="7" height="14" fill="#ce2b37" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-144, 0, -184)">ITA</text
              >
            </g>
            <!-- Spain -->
            <g transform="rotate(168)">
              <rect x="-10" y="-216" width="20" height="4" fill="#aa151b" />
              <rect x="-10" y="-212" width="20" height="6" fill="#f1bf00" />
              <rect x="-10" y="-206" width="20" height="4" fill="#aa151b" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-168, 0, -184)">ESP</text
              >
            </g>
            <!-- Netherlands -->
            <g transform="rotate(192)">
              <rect x="-10" y="-216" width="20" height="5" fill="#ae1c28" />
              <rect x="-10" y="-211" width="20" height="5" fill="#fff" />
              <rect x="-10" y="-206" width="20" height="4" fill="#21468b" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-192, 0, -184)">NLD</text
              >
            </g>
            <!-- Belgium -->
            <g transform="rotate(216)">
              <rect x="-10" y="-216" width="7" height="14" fill="#000" />
              <rect x="-3" y="-216" width="6" height="14" fill="#fdda24" />
              <rect x="3" y="-216" width="7" height="14" fill="#ef3340" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-216, 0, -184)">BEL</text
              >
            </g>
            <!-- Denmark -->
            <g transform="rotate(240)">
              <rect x="-10" y="-216" width="20" height="14" fill="#c8102e" />
              <rect x="-2" y="-216" width="3" height="14" fill="#fff" />
              <rect x="-10" y="-211" width="20" height="3" fill="#fff" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-240, 0, -184)">DNK</text
              >
            </g>
            <!-- Norway -->
            <g transform="rotate(264)">
              <rect x="-10" y="-216" width="20" height="14" fill="#ed2939" />
              <rect x="-2" y="-216" width="3" height="14" fill="#fff" />
              <rect x="-10" y="-211" width="20" height="3" fill="#fff" />
              <rect x="-1" y="-216" width="1.5" height="14" fill="#002868" />
              <rect x="-10" y="-210" width="20" height="1.5" fill="#002868" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-264, 0, -184)">NOR</text
              >
            </g>
            <!-- Sweden -->
            <g transform="rotate(288)">
              <rect x="-10" y="-216" width="20" height="14" fill="#006aa7" />
              <rect x="-2" y="-216" width="3" height="14" fill="#fecc00" />
              <rect x="-10" y="-211" width="20" height="3" fill="#fecc00" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-288, 0, -184)">SWE</text
              >
            </g>
            <!-- Switzerland -->
            <g transform="rotate(312)">
              <rect x="-10" y="-216" width="20" height="14" fill="#d52b1e" />
              <rect x="-2" y="-212" width="4" height="6" fill="#fff" />
              <rect x="-5" y="-211" width="10" height="4" fill="#fff" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-312, 0, -184)">CHE</text
              >
            </g>
            <!-- United Kingdom -->
            <g transform="rotate(336)">
              <rect x="-10" y="-216" width="20" height="14" fill="#012169" />
              <line x1="-10" y1="-216" x2="10" y2="-202" stroke="#fff" stroke-width="2" />
              <line x1="-10" y1="-202" x2="10" y2="-216" stroke="#fff" stroke-width="2" />
              <rect x="-1" y="-216" width="2" height="14" fill="#fff" />
              <rect x="-10" y="-210" width="20" height="2" fill="#fff" />
              <rect x="-0.5" y="-216" width="1" height="14" fill="#c8102e" />
              <rect x="-10" y="-209.5" width="20" height="1" fill="#c8102e" />
              <text
                x="0"
                y="-184"
                font-family="var(--font-mono), monospace"
                font-size="8"
                fill="#f0e6c8"
                text-anchor="middle"
                transform="rotate(-336, 0, -184)">GBR</text
              >
            </g>
          </g>

          <!-- ISS rendering (small but recognisable) in center -->
          <g>
            <!-- Solar array wings -->
            <rect
              x="-180"
              y="-12"
              width="140"
              height="24"
              fill="#1a2855"
              stroke="#4b9cd3"
              stroke-width="1"
            />
            <g stroke="rgba(180,210,255,0.4)" stroke-width="0.5">
              <line x1="-180" y1="-6" x2="-40" y2="-6" />
              <line x1="-180" y1="0" x2="-40" y2="0" />
              <line x1="-180" y1="6" x2="-40" y2="6" />
              <line x1="-160" y1="-12" x2="-160" y2="12" />
              <line x1="-130" y1="-12" x2="-130" y2="12" />
              <line x1="-100" y1="-12" x2="-100" y2="12" />
              <line x1="-70" y1="-12" x2="-70" y2="12" />
            </g>
            <rect
              x="40"
              y="-12"
              width="140"
              height="24"
              fill="#1a2855"
              stroke="#4b9cd3"
              stroke-width="1"
            />
            <g stroke="rgba(180,210,255,0.4)" stroke-width="0.5">
              <line x1="40" y1="-6" x2="180" y2="-6" />
              <line x1="40" y1="0" x2="180" y2="0" />
              <line x1="40" y1="6" x2="180" y2="6" />
              <line x1="60" y1="-12" x2="60" y2="12" />
              <line x1="90" y1="-12" x2="90" y2="12" />
              <line x1="120" y1="-12" x2="120" y2="12" />
              <line x1="150" y1="-12" x2="150" y2="12" />
            </g>
            <!-- Central truss -->
            <line x1="-180" y1="0" x2="180" y2="0" stroke="#ccc" stroke-width="2.5" />
            <!-- Pressurised modules (cylinder chain) -->
            <rect
              x="-30"
              y="-18"
              width="60"
              height="36"
              fill="#e0e0e8"
              stroke="#fff"
              stroke-width="1"
            />
            <rect
              x="-12"
              y="-44"
              width="24"
              height="26"
              fill="#d8d8e0"
              stroke="#fff"
              stroke-width="1"
            />
            <rect
              x="-12"
              y="18"
              width="24"
              height="26"
              fill="#d8d8e0"
              stroke="#fff"
              stroke-width="1"
            />
            <rect
              x="-50"
              y="-12"
              width="20"
              height="24"
              fill="#e0e0e8"
              stroke="#fff"
              stroke-width="1"
            />
            <rect
              x="30"
              y="-12"
              width="20"
              height="24"
              fill="#e0e0e8"
              stroke="#fff"
              stroke-width="1"
            />
            <!-- Radiators -->
            <rect
              x="-30"
              y="-60"
              width="60"
              height="14"
              fill="#888"
              stroke="#aaa"
              stroke-width="0.5"
            />
            <rect
              x="-30"
              y="46"
              width="60"
              height="14"
              fill="#888"
              stroke="#aaa"
              stroke-width="0.5"
            />
            <!-- Cupola hint -->
            <circle cx="0" cy="44" r="6" fill="#0a1432" stroke="#fff" stroke-width="1" />
          </g>
        </g>

        <!-- Title -->
        <text
          x="300"
          y="700"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="100"
          letter-spacing="14"
          fill="#ffffff"
          text-anchor="middle">ISS</text
        >
        <text
          x="300"
          y="740"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="32"
          letter-spacing="6"
          fill="#4b9cd3"
          text-anchor="middle">FIFTEEN NATIONS · ONE OUTPOST</text
        >
        <text
          x="300"
          y="784"
          font-family="var(--font-mono), monospace"
          font-size="11"
          letter-spacing="3"
          fill="rgba(255,255,255,0.65)"
          text-anchor="middle">CONTINUOUSLY CREWED SINCE NOVEMBER 2000</text
        >
        <text
          x="300"
          y="810"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,255,255,0.5)"
          text-anchor="middle">400 KM ALTITUDE · 7.66 KM/S · 16 SUNRISES A DAY</text
        >
        <text
          x="300"
          y="832"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,255,255,0.45)"
          text-anchor="middle">NASA · ROSCOSMOS · JAXA · CSA · ESA-11</text
        >
        <text
          x="40"
          y="876"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="14"
          letter-spacing="4"
          fill="rgba(255,255,255,0.45)">ORRERY</text
        >
        <text
          x="560"
          y="876"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,255,255,0.35)"
          text-anchor="end">orrery.app</text
        >
      </svg>
    </figure>

    <!-- 6 · Tiangong — panda + heavenly palace -->
    <figure class="poster">
      <svg
        viewBox="0 0 600 900"
        role="img"
        aria-label="Tiangong poster — panda in spacesuit, heavenly-palace pagoda silhouette, bamboo"
      >
        <defs>
          <linearGradient id="tg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3a0a18" />
            <stop offset="50%" stop-color="#1a0410" />
            <stop offset="100%" stop-color="#04020a" />
          </linearGradient>
          <radialGradient id="tg-moon" cx="0.3" cy="0.3" r="0.7">
            <stop offset="0%" stop-color="#ffe6a0" />
            <stop offset="100%" stop-color="#b88830" />
          </radialGradient>
          <radialGradient id="tg-earth" cx="0.4" cy="0.4" r="0.7">
            <stop offset="0%" stop-color="#aacef0" />
            <stop offset="60%" stop-color="#3a78b8" />
            <stop offset="100%" stop-color="#0a1a3a" />
          </radialGradient>
        </defs>
        <rect width="600" height="900" fill="url(#tg-sky)" />
        <!-- Stars -->
        <g fill="#ffe6a0" opacity="0.6">
          <circle cx="40" cy="60" r="0.9" />
          <circle cx="160" cy="40" r="1.1" />
          <circle cx="280" cy="80" r="0.7" />
          <circle cx="440" cy="50" r="1" />
          <circle cx="540" cy="130" r="0.9" />
          <circle cx="60" cy="220" r="0.8" />
          <circle cx="540" cy="280" r="1.1" />
        </g>
        <!-- Full moon (Chinese mid-autumn cue) -->
        <circle cx="480" cy="140" r="50" fill="url(#tg-moon)" />
        <circle cx="465" cy="125" r="4" fill="rgba(140,100,30,0.5)" />
        <circle cx="495" cy="155" r="3" fill="rgba(140,100,30,0.45)" />
        <circle cx="470" cy="155" r="2.5" fill="rgba(140,100,30,0.4)" />

        <!-- Stylised pagoda silhouette ("Heavenly Palace") at lower-left -->
        <g transform="translate(60 540)" fill="#0a020a" opacity="0.85">
          <rect x="20" y="40" width="40" height="60" />
          <polygon points="10,40 70,40 60,28 20,28" />
          <rect x="24" y="0" width="32" height="40" />
          <polygon points="14,0 66,0 56,-12 24,-12" />
          <rect x="28" y="-32" width="24" height="20" />
          <polygon points="16,-32 64,-32 52,-46 28,-46" />
        </g>
        <g
          stroke="rgba(255,200,80,0.45)"
          stroke-width="1"
          fill="none"
          transform="translate(60 540)"
        >
          <line x1="40" y1="-50" x2="40" y2="-58" />
          <circle cx="40" cy="-62" r="3" fill="#ffc850" stroke="none" />
        </g>

        <!-- Bamboo stalks on right edge -->
        <g stroke="#1a5a2a" stroke-width="6" fill="none" stroke-linecap="round">
          <line x1="556" y1="500" x2="556" y2="900" />
          <line x1="572" y1="450" x2="572" y2="900" />
          <line x1="540" y1="540" x2="540" y2="900" />
        </g>
        <g stroke="#0a3a1a" stroke-width="6" stroke-linecap="round">
          <line x1="556" y1="540" x2="556" y2="542" />
          <line x1="556" y1="620" x2="556" y2="622" />
          <line x1="556" y1="700" x2="556" y2="702" />
          <line x1="572" y1="500" x2="572" y2="502" />
          <line x1="572" y1="580" x2="572" y2="582" />
          <line x1="572" y1="660" x2="572" y2="662" />
          <line x1="540" y1="580" x2="540" y2="582" />
          <line x1="540" y1="660" x2="540" y2="662" />
        </g>
        <!-- Bamboo leaves -->
        <g fill="#2a7a3a" opacity="0.85">
          <path d="M 556 500 Q 540 490 530 478 Q 545 488 556 500 Z" />
          <path d="M 572 460 Q 590 450 600 440 Q 585 458 572 460 Z" />
          <path d="M 540 540 Q 524 530 514 518 Q 530 530 540 540 Z" />
        </g>

        <!-- Tiangong station silhouette upper-center -->
        <g transform="translate(300 200)">
          <line x1="-100" y1="0" x2="100" y2="0" stroke="#e0e0e8" stroke-width="3" />
          <rect
            x="-18"
            y="-12"
            width="36"
            height="24"
            fill="#e0e0e8"
            stroke="#fff"
            stroke-width="1"
          />
          <rect
            x="-10"
            y="-30"
            width="20"
            height="18"
            fill="#d8d8e0"
            stroke="#fff"
            stroke-width="1"
          />
          <rect
            x="-10"
            y="12"
            width="20"
            height="18"
            fill="#d8d8e0"
            stroke="#fff"
            stroke-width="1"
          />
          <!-- Solar arrays -->
          <rect
            x="-100"
            y="-10"
            width="60"
            height="20"
            fill="#1a2855"
            stroke="#ffc850"
            stroke-width="1"
          />
          <rect
            x="40"
            y="-10"
            width="60"
            height="20"
            fill="#1a2855"
            stroke="#ffc850"
            stroke-width="1"
          />
          <g stroke="rgba(255,200,80,0.4)" stroke-width="0.5">
            <line x1="-100" y1="-3" x2="-40" y2="-3" />
            <line x1="-100" y1="3" x2="-40" y2="3" />
            <line x1="40" y1="-3" x2="100" y2="-3" />
            <line x1="40" y1="3" x2="100" y2="3" />
          </g>
        </g>

        <!-- Panda astronaut floating, hero element -->
        <g transform="translate(300 420)">
          <!-- Spacesuit body -->
          <ellipse
            cx="0"
            cy="20"
            rx="55"
            ry="62"
            fill="#f8f4ee"
            stroke="#04040c"
            stroke-width="3"
          />
          <!-- Chest control panel -->
          <rect
            x="-14"
            y="14"
            width="28"
            height="18"
            fill="#d63622"
            stroke="#04040c"
            stroke-width="2"
          />
          <circle cx="-7" cy="23" r="2" fill="#ffc850" />
          <circle cx="7" cy="23" r="2" fill="#88d4d4" />
          <!-- Helmet -->
          <circle cx="0" cy="-44" r="42" fill="#f8f4ee" stroke="#04040c" stroke-width="3" />
          <!-- Visor (gold-tinted, with Earth reflection) -->
          <path
            d="M -28 -50 Q -32 -60 -20 -68 Q 0 -76 20 -68 Q 32 -60 28 -50 Q 24 -32 0 -32 Q -24 -32 -28 -50 Z"
            fill="#1a3a78"
            stroke="#04040c"
            stroke-width="2"
          />
          <ellipse cx="-2" cy="-52" rx="10" ry="6" fill="#4b9cd3" />
          <ellipse cx="-3" cy="-54" rx="4" ry="2" fill="rgba(120,180,90,0.7)" />
          <!-- Panda eye patches (peeking above visor) -->
          <ellipse
            cx="-14"
            cy="-70"
            rx="10"
            ry="14"
            fill="#04040c"
            transform="rotate(-15 -14 -70)"
          />
          <ellipse cx="14" cy="-70" rx="10" ry="14" fill="#04040c" transform="rotate(15 14 -70)" />
          <!-- Panda ears -->
          <circle cx="-32" cy="-78" r="10" fill="#04040c" stroke="#04040c" stroke-width="1" />
          <circle cx="32" cy="-78" r="10" fill="#04040c" stroke="#04040c" stroke-width="1" />
          <!-- Tiny nose visible -->
          <ellipse cx="0" cy="-42" rx="3" ry="2" fill="#04040c" />
          <!-- Arms -->
          <ellipse
            cx="-58"
            cy="20"
            rx="14"
            ry="32"
            fill="#f8f4ee"
            stroke="#04040c"
            stroke-width="3"
            transform="rotate(-20 -58 20)"
          />
          <ellipse
            cx="58"
            cy="20"
            rx="14"
            ry="32"
            fill="#f8f4ee"
            stroke="#04040c"
            stroke-width="3"
            transform="rotate(20 58 20)"
          />
          <!-- Tether / hose to station -->
          <path
            d="M 0 -86 Q -80 -180 100 -220"
            stroke="#04040c"
            stroke-width="2"
            fill="none"
            stroke-dasharray="6 4"
          />
        </g>

        <!-- Title -->
        <text
          x="300"
          y="740"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="100"
          letter-spacing="14"
          fill="#ffc850"
          text-anchor="middle">TIANGONG</text
        >
        <text
          x="300"
          y="772"
          font-family="var(--font-mono), monospace"
          font-size="20"
          letter-spacing="10"
          fill="#d63622"
          text-anchor="middle">天宫</text
        >
        <text
          x="300"
          y="798"
          font-family="var(--font-mono), monospace"
          font-size="13"
          letter-spacing="6"
          fill="#ffc850"
          text-anchor="middle">ABOVE THE BAMBOO FOREST</text
        >
        <text
          x="300"
          y="822"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,200,80,0.7)"
          text-anchor="middle">CHINA MANNED SPACE · CONTINUOUSLY CREWED SINCE JUNE 2022</text
        >
        <text
          x="300"
          y="842"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,200,80,0.55)"
          text-anchor="middle">389 KM ALTITUDE · TIANHE · WENTIAN · MENGTIAN</text
        >
        <text
          x="40"
          y="876"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="14"
          letter-spacing="4"
          fill="rgba(255,200,80,0.55)">ORRERY</text
        >
        <text
          x="560"
          y="876"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,200,80,0.45)"
          text-anchor="end">orrery.app</text
        >
      </svg>
    </figure>

    <!-- 7 · Apollo 11 — bootprint on the Moon -->
    <figure class="poster">
      <svg
        viewBox="0 0 600 900"
        role="img"
        aria-label="Apollo 11 bootprint on the lunar surface, with Earth visible in the black sky above the Moon's horizon"
      >
        <defs>
          <linearGradient id="apb-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#000000" />
            <stop offset="100%" stop-color="#020205" />
          </linearGradient>
          <linearGradient id="apb-regolith" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3a3531" />
            <stop offset="40%" stop-color="#26221f" />
            <stop offset="100%" stop-color="#0c0a08" />
          </linearGradient>
          <radialGradient id="apb-spot" cx="0.5" cy="0.6" r="0.5">
            <stop offset="0%" stop-color="#5a5249" stop-opacity="0.45" />
            <stop offset="60%" stop-color="#2a2622" stop-opacity="0.15" />
            <stop offset="100%" stop-color="#0a0908" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="apb-earth" cx="0.4" cy="0.4" r="0.6">
            <stop offset="0%" stop-color="#aacef0" />
            <stop offset="55%" stop-color="#3a78b8" />
            <stop offset="100%" stop-color="#0a1a3a" />
          </radialGradient>
          <radialGradient id="apb-earth-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="60%" stop-color="rgba(75,156,211,0)" />
            <stop offset="100%" stop-color="rgba(75,156,211,0.18)" />
          </radialGradient>
          <linearGradient id="apb-print" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#020202" />
            <stop offset="100%" stop-color="#000000" />
          </linearGradient>
          <radialGradient id="apb-print-rim" cx="0.5" cy="0.5" r="0.6">
            <stop offset="80%" stop-color="rgba(160,150,138,0)" />
            <stop offset="100%" stop-color="rgba(160,150,138,0.55)" />
          </radialGradient>
          <clipPath id="apb-ground">
            <path d="M 0 320 Q 300 240 600 320 L 600 900 L 0 900 Z" />
          </clipPath>
        </defs>
        <rect width="600" height="900" fill="url(#apb-sky)" />
        <g fill="#f0ece4">
          <circle cx="60" cy="60" r="1.4" />
          <circle cx="180" cy="40" r="0.9" />
          <circle cx="280" cy="90" r="1.1" />
          <circle cx="360" cy="50" r="0.7" />
          <circle cx="520" cy="40" r="1.2" />
          <circle cx="580" cy="120" r="0.8" />
          <circle cx="40" cy="170" r="0.9" />
          <circle cx="160" cy="200" r="0.6" />
          <circle cx="240" cy="160" r="1" />
          <circle cx="380" cy="180" r="0.7" />
          <circle cx="460" cy="220" r="0.9" />
          <circle cx="540" cy="190" r="0.6" />
          <circle cx="100" cy="280" r="0.8" />
          <circle cx="320" cy="260" r="0.7" />
          <circle cx="500" cy="270" r="0.9" />
        </g>
        <g transform="translate(450 130)">
          <circle cx="0" cy="0" r="58" fill="url(#apb-earth-glow)" />
          <circle cx="0" cy="0" r="42" fill="url(#apb-earth)" />
          <path
            d="M -22 -8 Q -10 -14 4 -10 Q 16 -4 12 8 Q 0 14 -10 8 Q -22 4 -22 -8 Z"
            fill="rgba(255,255,255,0.25)"
          />
          <path
            d="M 8 14 Q 18 12 24 18 Q 22 28 12 28 Q 4 24 8 14 Z"
            fill="rgba(255,255,255,0.18)"
          />
          <path
            d="M 18 -38 Q 42 -10 38 30 Q 34 38 30 40 L 0 0 Z"
            fill="rgba(0,0,0,0.45)"
            opacity="0.85"
          />
        </g>
        <path
          d="M 0 320 Q 300 240 600 320"
          fill="none"
          stroke="rgba(180,170,155,0.55)"
          stroke-width="1.2"
        />
        <g clip-path="url(#apb-ground)">
          <rect x="0" y="240" width="600" height="660" fill="url(#apb-regolith)" />
          <ellipse cx="300" cy="500" rx="320" ry="220" fill="url(#apb-spot)" />
          <ellipse
            cx="80"
            cy="312"
            rx="40"
            ry="6"
            fill="rgba(0,0,0,0.45)"
            stroke="rgba(180,170,155,0.3)"
            stroke-width="0.5"
          />
          <ellipse
            cx="500"
            cy="316"
            rx="48"
            ry="7"
            fill="rgba(0,0,0,0.4)"
            stroke="rgba(180,170,155,0.28)"
            stroke-width="0.5"
          />
          <ellipse
            cx="220"
            cy="340"
            rx="60"
            ry="9"
            fill="rgba(0,0,0,0.3)"
            stroke="rgba(180,170,155,0.22)"
            stroke-width="0.4"
          />
          <g fill="rgba(220,210,195,0.22)">
            <circle cx="80" cy="380" r="1.1" />
            <circle cx="140" cy="420" r="0.7" />
            <circle cx="220" cy="370" r="0.9" />
            <circle cx="320" cy="400" r="0.6" />
            <circle cx="420" cy="380" r="1.2" />
            <circle cx="500" cy="430" r="0.8" />
            <circle cx="60" cy="490" r="1" />
            <circle cx="180" cy="510" r="0.5" />
            <circle cx="540" cy="500" r="0.9" />
            <circle cx="100" cy="580" r="1.1" />
            <circle cx="500" cy="600" r="0.7" />
            <circle cx="80" cy="660" r="0.9" />
            <circle cx="540" cy="670" r="1.2" />
            <circle cx="160" cy="700" r="0.6" />
            <circle cx="440" cy="710" r="0.7" />
          </g>
          <g fill="rgba(240,232,215,0.4)">
            <circle cx="200" cy="450" r="0.9" />
            <circle cx="430" cy="470" r="0.7" />
            <circle cx="120" cy="600" r="1" />
            <circle cx="510" cy="590" r="0.8" />
            <circle cx="350" cy="700" r="0.9" />
          </g>
          <g transform="translate(300 500) rotate(14)">
            <path
              d="M -68 -150 Q -78 -130 -76 -110 L -76 110 Q -80 135 -64 145 L 64 145 Q 80 135 76 110 L 76 -110 Q 78 -130 68 -150 Z"
              fill="url(#apb-print-rim)"
            />
            <path
              d="M -64 -146 Q -73 -128 -71 -108 L -71 105 Q -74 130 -60 140 L 60 140 Q 74 130 71 105 L 71 -108 Q 73 -128 64 -146 Z"
              fill="url(#apb-print)"
            />
            <g stroke="rgba(140,128,114,0.6)" stroke-width="2.2" stroke-linecap="round">
              <line x1="-58" y1="-110" x2="58" y2="-110" />
              <line x1="-60" y1="-85" x2="60" y2="-85" />
              <line x1="-62" y1="-60" x2="62" y2="-60" />
              <line x1="-64" y1="-35" x2="64" y2="-35" />
              <line x1="-65" y1="-10" x2="65" y2="-10" />
              <line x1="-65" y1="15" x2="65" y2="15" />
              <line x1="-64" y1="40" x2="64" y2="40" />
              <line x1="-62" y1="65" x2="62" y2="65" />
              <line x1="-58" y1="90" x2="58" y2="90" />
              <line x1="-52" y1="115" x2="52" y2="115" />
            </g>
            <ellipse cx="0" cy="135" rx="32" ry="6" fill="rgba(0,0,0,0.85)" />
          </g>
        </g>
        <text
          x="300"
          y="715"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="120"
          letter-spacing="14"
          fill="#ffffff"
          text-anchor="middle">FOOTPRINTS</text
        >
        <text
          x="300"
          y="763"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="40"
          letter-spacing="6"
          fill="#a8a09c"
          text-anchor="middle">FOR A MILLION YEARS</text
        >
        <text
          x="300"
          y="810"
          font-family="var(--font-mono), monospace"
          font-size="12"
          letter-spacing="6"
          fill="rgba(255,255,255,0.6)"
          text-anchor="middle">APOLLO 11 · MARE TRANQUILLITATIS · JULY 20 · 1969</text
        >
        <text
          x="300"
          y="832"
          font-family="var(--font-mono), monospace"
          font-size="10"
          letter-spacing="4"
          fill="rgba(255,255,255,0.45)"
          text-anchor="middle">NO ATMOSPHERE · NO WIND · NO ERASURE</text
        >
        <text
          x="40"
          y="876"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="14"
          letter-spacing="4"
          fill="rgba(255,255,255,0.45)">ORRERY</text
        >
        <text
          x="560"
          y="876"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,255,255,0.35)"
          text-anchor="end">orrery.app</text
        >
      </svg>
    </figure>

    <!-- 8 · Gagarin — helmet visor with Earth reflection -->
    <figure class="poster">
      <svg
        viewBox="0 0 600 900"
        role="img"
        aria-label="Yuri Gagarin poster — SK-1 helmet visor with Earth reflected in the gold-tinted glass"
      >
        <defs>
          <linearGradient id="ga-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2a0204" />
            <stop offset="50%" stop-color="#3a0a0c" />
            <stop offset="100%" stop-color="#08000a" />
          </linearGradient>
          <radialGradient id="ga-spot" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0%" stop-color="rgba(255,200,80,0.18)" />
            <stop offset="100%" stop-color="rgba(255,200,80,0)" />
          </radialGradient>
          <radialGradient id="ga-helmet" cx="0.32" cy="0.28" r="1">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="70%" stop-color="#e8e4d8" />
            <stop offset="100%" stop-color="#a89880" />
          </radialGradient>
          <radialGradient id="ga-visor" cx="0.4" cy="0.4" r="0.7">
            <stop offset="0%" stop-color="#0a1432" />
            <stop offset="60%" stop-color="#04081e" />
            <stop offset="100%" stop-color="#020208" />
          </radialGradient>
          <radialGradient id="ga-earth-reflect" cx="0.4" cy="0.5" r="0.5">
            <stop offset="0%" stop-color="#aacef0" />
            <stop offset="60%" stop-color="#3a78b8" />
            <stop offset="100%" stop-color="#1a3a78" />
          </radialGradient>
          <clipPath id="ga-visor-clip">
            <ellipse cx="0" cy="-20" rx="108" ry="136" />
          </clipPath>
        </defs>
        <rect width="600" height="900" fill="url(#ga-bg)" />
        <ellipse cx="300" cy="380" rx="350" ry="320" fill="url(#ga-spot)" />
        <!-- Sparse stars in the deep -->
        <g fill="rgba(255,200,80,0.45)">
          <circle cx="40" cy="60" r="0.9" />
          <circle cx="540" cy="80" r="1.1" />
          <circle cx="80" cy="220" r="0.7" />
          <circle cx="520" cy="250" r="0.9" />
          <circle cx="60" cy="640" r="0.8" />
          <circle cx="540" cy="620" r="1" />
        </g>

        <!-- SK-1 helmet, hero -->
        <g transform="translate(300 400)">
          <!-- Helmet shell — bright off-white so it reads against the red bg -->
          <ellipse
            cx="0"
            cy="0"
            rx="220"
            ry="240"
            fill="url(#ga-helmet)"
            stroke="#04040c"
            stroke-width="3"
          />
          <!-- Soviet "CCCP" red band on the upper surface of the helmet -->
          <path
            d="M -180 -150 Q 0 -260 180 -150 Q 0 -218 -180 -150 Z"
            fill="#d52b1e"
            stroke="#04040c"
            stroke-width="2"
          />
          <text
            x="0"
            y="-188"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="34"
            letter-spacing="14"
            fill="#fff8e8"
            text-anchor="middle">СССР</text
          >
          <!-- Tonal shading on right side of helmet -->
          <path
            d="M 60 -230 Q 200 -120 220 0 Q 210 140 60 230 Q 80 100 80 -20 Q 80 -130 60 -230 Z"
            fill="rgba(60,40,20,0.28)"
          />
          <!-- Visor opening — smaller than helmet so the shell stays visible -->
          <ellipse
            cx="0"
            cy="-20"
            rx="110"
            ry="138"
            fill="url(#ga-visor)"
            stroke="#04040c"
            stroke-width="3"
          />
          <!-- Earth reflected in the visor -->
          <g clip-path="url(#ga-visor-clip)">
            <ellipse cx="-6" cy="30" rx="70" ry="52" fill="url(#ga-earth-reflect)" />
            <path
              d="M -42 24 Q -16 16 8 26 Q 0 44 -24 44 Q -46 38 -42 24 Z"
              fill="rgba(120,180,90,0.6)"
            />
            <ellipse cx="22" cy="50" rx="22" ry="14" fill="rgba(180,150,90,0.5)" />
            <ellipse cx="-50" cy="58" rx="20" ry="12" fill="rgba(120,180,90,0.5)" />
            <!-- Sun glint -->
            <circle cx="-42" cy="-58" r="20" fill="#fff8e8" opacity="0.55" />
            <circle cx="-42" cy="-58" r="9" fill="#fff8e8" opacity="0.85" />
          </g>
          <!-- Visor rim highlight -->
          <ellipse
            cx="0"
            cy="-20"
            rx="110"
            ry="138"
            fill="none"
            stroke="rgba(255,200,80,0.45)"
            stroke-width="2"
          />
          <!-- Bottom neck ring -->
          <path
            d="M -180 180 Q 0 240 180 180 L 180 220 Q 0 280 -180 220 Z"
            fill="#4a4a4a"
            stroke="#04040c"
            stroke-width="2"
          />
          <line
            x1="-160"
            y1="200"
            x2="160"
            y2="200"
            stroke="rgba(255,255,255,0.3)"
            stroke-width="0.6"
          />
        </g>

        <!-- Title -->
        <text
          x="300"
          y="700"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="100"
          letter-spacing="14"
          fill="#fff8e8"
          text-anchor="middle">GAGARIN</text
        >
        <text
          x="300"
          y="740"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="32"
          letter-spacing="10"
          fill="#d52b1e"
          text-anchor="middle">ПОЕХАЛИ</text
        >
        <text
          x="300"
          y="772"
          font-family="var(--font-mono), monospace"
          font-size="13"
          letter-spacing="6"
          fill="#ffc850"
          text-anchor="middle">ONE HUNDRED EIGHT MINUTES</text
        >
        <text
          x="300"
          y="804"
          font-family="var(--font-mono), monospace"
          font-size="10"
          letter-spacing="3"
          fill="rgba(255,255,255,0.65)"
          text-anchor="middle">VOSTOK 1 · BAIKONUR · APRIL 12 · 1961</text
        >
        <text
          x="300"
          y="826"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,255,255,0.5)"
          text-anchor="middle">FIRST HUMAN IN SPACE · ONE ORBIT · ALWAYS THE FIRST</text
        >
        <text
          x="40"
          y="876"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="14"
          letter-spacing="4"
          fill="rgba(255,255,255,0.45)">ORRERY</text
        >
        <text
          x="560"
          y="876"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,255,255,0.35)"
          text-anchor="end">orrery.app</text
        >
      </svg>
    </figure>

    <!-- ═══════ C · SPACECRAFT (indie-comic / pop-art) ═══════════ -->

    <!-- 9 · Sputnik — Soviet pop-art, beep beep beep -->
    <figure class="poster">
      <svg
        viewBox="0 0 600 900"
        role="img"
        aria-label="Sputnik 1 poster — Soviet pop-art with beep-beep-beep speech bubbles"
      >
        <defs>
          <linearGradient id="sp-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1a0408" />
            <stop offset="50%" stop-color="#2a060c" />
            <stop offset="100%" stop-color="#0a0204" />
          </linearGradient>
          <pattern id="sp-halftone" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="rgba(240,230,200,0.07)" />
          </pattern>
          <radialGradient id="sp-sphere" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0%" stop-color="#fff8e8" />
            <stop offset="50%" stop-color="#c8c0b0" />
            <stop offset="100%" stop-color="#4a4238" />
          </radialGradient>
        </defs>
        <rect width="600" height="900" fill="url(#sp-sky)" />
        <rect width="600" height="900" fill="url(#sp-halftone)" />
        <!-- Chunky stars -->
        <g fill="#f0e6c8">
          <path d="M 60 80 L 64 88 L 72 92 L 64 96 L 60 104 L 56 96 L 48 92 L 56 88 Z" />
          <path
            d="M 540 110 L 543 116 L 549 119 L 543 122 L 540 128 L 537 122 L 531 119 L 537 116 Z"
          />
          <path d="M 90 460 L 93 466 L 99 469 L 93 472 L 90 478 L 87 472 L 81 469 L 87 466 Z" />
          <path
            d="M 510 480 L 513 486 L 519 489 L 513 492 L 510 498 L 507 492 L 501 489 L 507 486 Z"
          />
        </g>
        <g fill="rgba(240,230,200,0.55)">
          <circle cx="200" cy="60" r="1.2" />
          <circle cx="320" cy="120" r="1" />
          <circle cx="460" cy="200" r="0.8" />
          <circle cx="100" cy="200" r="0.9" />
          <circle cx="270" cy="540" r="1.1" />
          <circle cx="430" cy="560" r="0.8" />
        </g>

        <!-- Header tag -->
        <text
          x="40"
          y="62"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="26"
          letter-spacing="6"
          fill="#d52b1e">CCCP · СПУТНИК-1</text
        >
        <text
          x="40"
          y="84"
          font-family="var(--font-mono), monospace"
          font-size="10"
          letter-spacing="3"
          fill="rgba(240,230,200,0.7)">4 OCTOBER 1957 · THE WORLD LOOKED UP</text
        >

        <!-- Earth limb arc lower-right (suggests orbit) -->
        <path
          d="M 80 800 Q 300 700 580 760"
          fill="none"
          stroke="rgba(240,230,200,0.18)"
          stroke-width="1"
          stroke-dasharray="6 6"
        />
        <ellipse cx="300" cy="1100" rx="500" ry="350" fill="#1a3a78" />
        <ellipse
          cx="300"
          cy="940"
          rx="450"
          ry="80"
          fill="none"
          stroke="rgba(75,156,211,0.4)"
          stroke-width="2"
        />

        <!-- Sputnik sphere with 4 antennas, hero -->
        <g transform="translate(300 360)">
          <!-- Antennas — 2 swept back, 2 trailing -->
          <g stroke="#04040c" stroke-width="3" stroke-linecap="round">
            <line x1="-80" y1="-60" x2="-220" y2="-180" />
            <line x1="80" y1="-60" x2="220" y2="-180" />
            <line x1="-60" y1="80" x2="-200" y2="200" />
            <line x1="60" y1="80" x2="200" y2="200" />
          </g>
          <!-- Sphere -->
          <circle
            cx="0"
            cy="0"
            r="100"
            fill="url(#sp-sphere)"
            stroke="#04040c"
            stroke-width="3.5"
          />
          <!-- Equatorial seam -->
          <line
            x1="-100"
            y1="0"
            x2="100"
            y2="0"
            stroke="#04040c"
            stroke-width="1.5"
            stroke-dasharray="3 3"
          />
          <!-- Specular highlight -->
          <ellipse cx="-30" cy="-40" rx="22" ry="14" fill="rgba(255,255,255,0.45)" />
          <!-- Latch -->
          <rect x="-10" y="-3" width="20" height="6" fill="#04040c" />
        </g>

        <!-- "BEEP BEEP BEEP" speech bubbles -->
        <g transform="translate(70 260) rotate(-12)">
          <path
            d="M 0 0 L 100 0 L 100 36 L 80 36 L 60 48 L 70 36 L 0 36 Z"
            fill="#fff8e8"
            stroke="#04040c"
            stroke-width="2.5"
          />
          <text
            x="50"
            y="24"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="22"
            letter-spacing="3"
            fill="#d52b1e"
            text-anchor="middle">BEEP!</text
          >
        </g>
        <g transform="translate(420 240) rotate(8)">
          <path
            d="M 0 0 L 100 0 L 100 36 L 20 36 L 0 50 L 12 36 L 0 36 Z"
            fill="#fff8e8"
            stroke="#04040c"
            stroke-width="2.5"
          />
          <text
            x="50"
            y="24"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="22"
            letter-spacing="3"
            fill="#d52b1e"
            text-anchor="middle">BEEP!</text
          >
        </g>
        <g transform="translate(440 460) rotate(-6)">
          <path
            d="M 0 0 L 100 0 L 100 36 L 40 36 L 20 50 L 30 36 L 0 36 Z"
            fill="#d52b1e"
            stroke="#04040c"
            stroke-width="2.5"
          />
          <text
            x="50"
            y="24"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="22"
            letter-spacing="3"
            fill="#fff8e8"
            text-anchor="middle">BEEP!</text
          >
        </g>

        <!-- Title -->
        <text
          x="304"
          y="694"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="100"
          letter-spacing="14"
          fill="#d52b1e"
          text-anchor="middle">SPUTNIK</text
        >
        <text
          x="300"
          y="690"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="100"
          letter-spacing="14"
          fill="#f0e6c8"
          text-anchor="middle">SPUTNIK</text
        >
        <text
          x="300"
          y="734"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="30"
          letter-spacing="6"
          fill="#ffc850"
          text-anchor="middle">THE WORLD LOOKED UP</text
        >
        <text
          x="300"
          y="772"
          font-family="var(--font-mono), monospace"
          font-size="11"
          letter-spacing="3"
          fill="rgba(240,230,200,0.85)"
          text-anchor="middle">FIRST ARTIFICIAL SATELLITE · 21 DAYS OF SIGNAL</text
        >
        <text
          x="300"
          y="800"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="2"
          fill="rgba(240,230,200,0.6)"
          text-anchor="middle">BAIKONUR · 4 OCT 1957 · ALTITUDE 215–939 KM · 96 MIN ORBIT</text
        >
        <text
          x="300"
          y="822"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="2"
          fill="rgba(240,230,200,0.55)"
          text-anchor="middle">83.6 KG · 4 ANTENNAS · 20.005 + 40.002 MHZ</text
        >
        <text
          x="40"
          y="876"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="14"
          letter-spacing="4"
          fill="rgba(240,230,200,0.55)">ORRERY</text
        >
        <text
          x="560"
          y="876"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(240,230,200,0.45)"
          text-anchor="end">orrery.app</text
        >
      </svg>
    </figure>

    <!-- 10 · Voyager — bicentennial pop-art -->
    <figure class="poster">
      <svg viewBox="0 0 600 900" role="img" aria-label="Voyager indie-comic / pop-art poster">
        <defs>
          <linearGradient id="vy-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0a1230" />
            <stop offset="50%" stop-color="#1a2855" />
            <stop offset="100%" stop-color="#070a22" />
          </linearGradient>
          <pattern id="vy-halftone" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="rgba(240,230,200,0.07)" />
          </pattern>
          <radialGradient id="vy-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stop-color="#fff7c0" />
            <stop offset="100%" stop-color="#ffc850" />
          </radialGradient>
          <radialGradient id="vy-record" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stop-color="#fff7c0" />
            <stop offset="100%" stop-color="#c89958" />
          </radialGradient>
        </defs>
        <rect width="600" height="900" fill="url(#vy-sky)" />
        <rect width="600" height="900" fill="url(#vy-halftone)" />
        <g fill="#f0e6c8">
          <path d="M 60 90 L 64 98 L 72 102 L 64 106 L 60 114 L 56 106 L 48 102 L 56 98 Z" />
          <path d="M 540 70 L 543 76 L 549 79 L 543 82 L 540 88 L 537 82 L 531 79 L 537 76 Z" />
          <path
            d="M 320 40 L 322.5 45 L 327 47.5 L 322.5 50 L 320 55 L 317.5 50 L 313 47.5 L 317.5 45 Z"
          />
          <path
            d="M 100 320 L 103 326 L 109 329 L 103 332 L 100 338 L 97 332 L 91 329 L 97 326 Z"
          />
          <path
            d="M 510 380 L 513 386 L 519 389 L 513 392 L 510 398 L 507 392 L 501 389 L 507 386 Z"
          />
        </g>
        <g fill="rgba(240,230,200,0.6)">
          <circle cx="180" cy="50" r="1.4" />
          <circle cx="240" cy="120" r="1" />
          <circle cx="380" cy="80" r="1.2" />
          <circle cx="460" cy="140" r="1" />
          <circle cx="40" cy="250" r="1.1" />
          <circle cx="270" cy="290" r="1.3" />
          <circle cx="555" cy="290" r="1" />
          <circle cx="80" cy="430" r="0.9" />
          <circle cx="540" cy="450" r="1.2" />
          <circle cx="200" cy="555" r="1" />
          <circle cx="430" cy="560" r="0.9" />
        </g>
        <text
          x="40"
          y="62"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="26"
          letter-spacing="6"
          fill="#d63622">THE GRAND TOUR</text
        >
        <text
          x="40"
          y="84"
          font-family="var(--font-mono), monospace"
          font-size="10"
          letter-spacing="3"
          fill="rgba(240,230,200,0.7)">LAUNCHED 1977 · BICENTENNIAL CHILD</text
        >
        <g transform="translate(80 200)">
          <circle cx="0" cy="0" r="22" fill="url(#vy-sun)" stroke="#04040c" stroke-width="3" />
          <g stroke="#ffc850" stroke-width="3" stroke-linecap="round">
            <line x1="0" y1="-30" x2="0" y2="-42" />
            <line x1="21" y1="-21" x2="30" y2="-30" />
            <line x1="30" y1="0" x2="42" y2="0" />
            <line x1="21" y1="21" x2="30" y2="30" />
            <line x1="0" y1="30" x2="0" y2="42" />
            <line x1="-21" y1="21" x2="-30" y2="30" />
            <line x1="-30" y1="0" x2="-42" y2="0" />
            <line x1="-21" y1="-21" x2="-30" y2="-30" />
          </g>
          <text
            x="0"
            y="62"
            font-family="var(--font-mono), monospace"
            font-size="9"
            letter-spacing="3"
            fill="#ffc850"
            text-anchor="middle">SOL</text
          >
        </g>
        <path
          d="M 110 210 Q 200 150 280 220 Q 370 290 470 200 Q 540 160 580 240"
          fill="none"
          stroke="#d63622"
          stroke-width="5"
          stroke-linecap="round"
          stroke-dasharray="14 10"
        />
        <g stroke="#04040c" stroke-width="3">
          <circle cx="200" cy="170" r="16" fill="#c89968" />
          <ellipse cx="280" cy="220" rx="26" ry="6" fill="#04040c" />
          <ellipse cx="280" cy="220" rx="22" ry="4" fill="#0a1230" stroke="none" />
          <circle cx="280" cy="220" r="13" fill="#d8b878" />
          <circle cx="370" cy="270" r="11" fill="#88d4d4" />
          <circle cx="470" cy="200" r="11" fill="#3060c0" />
        </g>
        <g
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="2"
          fill="#f0e6c8"
          text-anchor="middle"
        >
          <text x="200" y="146">JUPITER · '79</text>
          <text x="280" y="252">SATURN · '80</text>
          <text x="370" y="296">URANUS · '86</text>
          <text x="470" y="180">NEPTUNE · '89</text>
        </g>
        <g transform="translate(300 460)">
          <ellipse
            cx="0"
            cy="-60"
            rx="120"
            ry="22"
            fill="#f0e6c8"
            stroke="#04040c"
            stroke-width="3.5"
          />
          <ellipse
            cx="0"
            cy="-62"
            rx="48"
            ry="9"
            fill="#d63622"
            stroke="#04040c"
            stroke-width="2.5"
          />
          <line x1="0" y1="-70" x2="0" y2="-30" stroke="#04040c" stroke-width="2.5" />
          <polygon
            points="-34,-26 -34,16 34,16 34,-26"
            fill="#f0e6c8"
            stroke="#04040c"
            stroke-width="3.5"
          />
          <line x1="-34" y1="-4" x2="34" y2="-4" stroke="#04040c" stroke-width="2" />
          <line x1="34" y1="-4" x2="200" y2="-4" stroke="#04040c" stroke-width="3" />
          <circle cx="200" cy="-4" r="6" fill="#4b9cd3" stroke="#04040c" stroke-width="2.5" />
          <line x1="-34" y1="6" x2="-150" y2="40" stroke="#04040c" stroke-width="3" />
          <rect
            x="-172"
            y="32"
            width="22"
            height="22"
            fill="#4b9cd3"
            stroke="#04040c"
            stroke-width="2.5"
          />
          <rect
            x="-172"
            y="56"
            width="22"
            height="9"
            fill="#04040c"
            stroke="#04040c"
            stroke-width="1"
          />
          <line x1="34" y1="0" x2="120" y2="48" stroke="#04040c" stroke-width="3" />
          <g transform="translate(120 48)">
            <ellipse
              cx="0"
              cy="0"
              rx="20"
              ry="7"
              fill="#d63622"
              stroke="#04040c"
              stroke-width="2.5"
            />
            <ellipse
              cx="0"
              cy="14"
              rx="20"
              ry="7"
              fill="#d63622"
              stroke="#04040c"
              stroke-width="2.5"
            />
            <ellipse
              cx="0"
              cy="28"
              rx="20"
              ry="7"
              fill="#d63622"
              stroke="#04040c"
              stroke-width="2.5"
            />
          </g>
          <circle cx="-14" cy="-4" r="9" fill="url(#vy-record)" stroke="#04040c" stroke-width="2" />
          <circle cx="-14" cy="-4" r="2" fill="#04040c" />
        </g>
        <g transform="translate(40 510)">
          <path
            d="M 0 0 L 122 0 L 122 36 L 32 36 L 22 48 L 26 36 L 0 36 Z"
            fill="#d63622"
            stroke="#04040c"
            stroke-width="2.5"
          />
          <text
            x="61"
            y="16"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="14"
            letter-spacing="2"
            fill="#f0e6c8"
            text-anchor="middle">GOLDEN RECORD</text
          >
          <text
            x="61"
            y="30"
            font-family="var(--font-mono), monospace"
            font-size="8"
            letter-spacing="1"
            fill="#f0e6c8"
            text-anchor="middle">CARL SAGAN'S MIXTAPE</text
          >
        </g>
        <line x1="162" y1="546" x2="276" y2="460" stroke="#04040c" stroke-width="2" />
        <g transform="translate(440 360)">
          <path
            d="M 0 0 L 122 0 L 122 36 L 90 36 L 78 48 L 84 36 L 0 36 Z"
            fill="#4b9cd3"
            stroke="#04040c"
            stroke-width="2.5"
          />
          <text
            x="61"
            y="16"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="14"
            letter-spacing="2"
            fill="#f0e6c8"
            text-anchor="middle">3.7 m DISH</text
          >
          <text
            x="61"
            y="30"
            font-family="var(--font-mono), monospace"
            font-size="8"
            letter-spacing="1"
            fill="#f0e6c8"
            text-anchor="middle">STILL POINTED HOME</text
          >
        </g>
        <line x1="518" y1="408" x2="412" y2="402" stroke="#04040c" stroke-width="2" />
        <text
          x="304"
          y="724"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="120"
          letter-spacing="14"
          fill="#d63622"
          text-anchor="middle">VOYAGER</text
        >
        <text
          x="300"
          y="720"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="120"
          letter-spacing="14"
          fill="#f0e6c8"
          text-anchor="middle">VOYAGER</text
        >
        <text
          x="300"
          y="766"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="32"
          letter-spacing="4"
          fill="#ffc850"
          text-anchor="middle">FORTY-NINE YEARS · STILL TALKING</text
        >
        <text
          x="300"
          y="800"
          font-family="var(--font-mono), monospace"
          font-size="11"
          letter-spacing="3"
          fill="rgba(240,230,200,0.85)"
          text-anchor="middle">FARTHEST OBJECT MADE BY HUMAN HANDS · 25 LIGHT-HOURS OUT</text
        >
        <text
          x="300"
          y="822"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="2"
          fill="rgba(240,230,200,0.6)"
          text-anchor="middle">V1 LAUNCH 1977-09-05 · INTERSTELLAR SINCE 2012</text
        >
        <text
          x="300"
          y="838"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="2"
          fill="rgba(240,230,200,0.6)"
          text-anchor="middle">V2 LAUNCH 1977-08-20 · INTERSTELLAR SINCE 2018</text
        >
        <text
          x="40"
          y="876"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="14"
          letter-spacing="4"
          fill="rgba(240,230,200,0.55)">ORRERY</text
        >
        <text
          x="560"
          y="876"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(240,230,200,0.45)"
          text-anchor="end">orrery.app</text
        >
      </svg>
    </figure>

    <!-- 11 · Sojourner — indie comic, first wheels on Mars -->
    <figure class="poster">
      <svg
        viewBox="0 0 600 900"
        role="img"
        aria-label="Sojourner rover poster — indie-comic style, first wheels on Mars"
      >
        <defs>
          <linearGradient id="sj-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3a1a08" />
            <stop offset="50%" stop-color="#c1440e" />
            <stop offset="100%" stop-color="#8a3010" />
          </linearGradient>
          <pattern id="sj-halftone" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.2" fill="rgba(255,200,80,0.12)" />
          </pattern>
          <linearGradient id="sj-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#5a2010" />
            <stop offset="100%" stop-color="#1a0604" />
          </linearGradient>
          <radialGradient id="sj-sun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stop-color="#fff7c0" />
            <stop offset="100%" stop-color="#ffc850" />
          </radialGradient>
        </defs>
        <rect width="600" height="900" fill="url(#sj-sky)" />
        <rect width="600" height="900" fill="url(#sj-halftone)" />
        <!-- Header tag -->
        <text
          x="40"
          y="62"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="26"
          letter-spacing="6"
          fill="#04040c">FIRST WHEELS</text
        >
        <text
          x="40"
          y="84"
          font-family="var(--font-mono), monospace"
          font-size="10"
          letter-spacing="3"
          fill="rgba(255,200,80,0.85)">MARS PATHFINDER · JULY 1997</text
        >
        <text
          x="560"
          y="62"
          font-family="var(--font-mono), monospace"
          font-size="10"
          letter-spacing="2"
          fill="rgba(255,200,80,0.6)"
          text-anchor="end">№ 5 OF 11</text
        >
        <!-- Distant sun -->
        <g transform="translate(120 150)">
          <circle cx="0" cy="0" r="22" fill="url(#sj-sun)" stroke="#04040c" stroke-width="3" />
          <g stroke="#ffc850" stroke-width="3" stroke-linecap="round">
            <line x1="0" y1="-30" x2="0" y2="-42" />
            <line x1="21" y1="-21" x2="30" y2="-30" />
            <line x1="30" y1="0" x2="42" y2="0" />
            <line x1="21" y1="21" x2="30" y2="30" />
            <line x1="0" y1="30" x2="0" y2="42" />
            <line x1="-21" y1="21" x2="-30" y2="30" />
            <line x1="-30" y1="0" x2="-42" y2="0" />
            <line x1="-21" y1="-21" x2="-30" y2="-30" />
          </g>
        </g>
        <!-- Distant mountains -->
        <path
          d="M 0 440 L 80 380 L 160 410 L 240 360 L 320 400 L 420 350 L 520 400 L 600 380 L 600 460 L 0 460 Z"
          fill="#7a2810"
          stroke="#04040c"
          stroke-width="2.5"
        />
        <path
          d="M 0 470 L 100 440 L 200 460 L 320 430 L 440 450 L 560 430 L 600 460 L 600 490 L 0 490 Z"
          fill="#4a1408"
          stroke="#04040c"
          stroke-width="2.5"
        />
        <!-- Ground -->
        <rect x="0" y="490" width="600" height="210" fill="url(#sj-ground)" />
        <!-- Wheel-track in the dust -->
        <g
          stroke="#04040c"
          stroke-width="2.5"
          stroke-dasharray="6 4"
          stroke-linecap="round"
          fill="none"
        >
          <path d="M 80 690 Q 200 620 380 580" />
          <path d="M 100 700 Q 220 630 400 590" />
        </g>
        <!-- Rocks -->
        <g fill="#1a0604" stroke="#04040c" stroke-width="2">
          <ellipse cx="120" cy="660" rx="22" ry="10" />
          <ellipse cx="460" cy="640" rx="28" ry="12" />
          <ellipse cx="540" cy="700" rx="18" ry="8" />
        </g>

        <!-- Sojourner rover — bold flat, hero -->
        <g transform="translate(330 540)">
          <!-- Solar panel top (rectangle with cell grid) -->
          <rect
            x="-70"
            y="-30"
            width="140"
            height="36"
            fill="#1a3a78"
            stroke="#04040c"
            stroke-width="3"
          />
          <g stroke="rgba(255,200,80,0.55)" stroke-width="0.8">
            <line x1="-70" y1="-21" x2="70" y2="-21" />
            <line x1="-70" y1="-12" x2="70" y2="-12" />
            <line x1="-70" y1="-3" x2="70" y2="-3" />
            <line x1="-50" y1="-30" x2="-50" y2="6" />
            <line x1="-30" y1="-30" x2="-30" y2="6" />
            <line x1="-10" y1="-30" x2="-10" y2="6" />
            <line x1="10" y1="-30" x2="10" y2="6" />
            <line x1="30" y1="-30" x2="30" y2="6" />
            <line x1="50" y1="-30" x2="50" y2="6" />
          </g>
          <!-- Body underneath -->
          <rect
            x="-60"
            y="6"
            width="120"
            height="22"
            fill="#f0e6c8"
            stroke="#04040c"
            stroke-width="3"
          />
          <!-- Camera mast / APXS arm -->
          <line x1="-50" y1="-30" x2="-50" y2="-48" stroke="#04040c" stroke-width="3" />
          <rect
            x="-58"
            y="-58"
            width="16"
            height="10"
            fill="#d63622"
            stroke="#04040c"
            stroke-width="2.5"
          />
          <!-- Wheels (6 — rocker-bogie) -->
          <g fill="#04040c">
            <circle cx="-46" cy="36" r="12" stroke="#f0e6c8" stroke-width="2" />
            <circle cx="-46" cy="36" r="5" fill="#f0e6c8" stroke="none" />
            <circle cx="0" cy="36" r="12" stroke="#f0e6c8" stroke-width="2" />
            <circle cx="0" cy="36" r="5" fill="#f0e6c8" stroke="none" />
            <circle cx="46" cy="36" r="12" stroke="#f0e6c8" stroke-width="2" />
            <circle cx="46" cy="36" r="5" fill="#f0e6c8" stroke="none" />
          </g>
          <!-- US flag decal on side -->
          <rect
            x="-58"
            y="10"
            width="14"
            height="9"
            fill="#bf0a30"
            stroke="#04040c"
            stroke-width="1.5"
          />
          <rect x="-58" y="10" width="6" height="5" fill="#002868" />
          <line x1="-44" y1="13" x2="-58" y2="13" stroke="#fff" stroke-width="0.6" />
          <line x1="-44" y1="16" x2="-58" y2="16" stroke="#fff" stroke-width="0.6" />
        </g>

        <!-- Comic speech bubble: "HELLO MARS!" -->
        <g transform="translate(70 480) rotate(-6)">
          <path
            d="M 0 0 L 142 0 L 142 36 L 60 36 L 40 52 L 50 36 L 0 36 Z"
            fill="#fff8e8"
            stroke="#04040c"
            stroke-width="2.5"
          />
          <text
            x="71"
            y="22"
            font-family="var(--font-display), 'Bebas Neue', sans-serif"
            font-size="22"
            letter-spacing="3"
            fill="#c1440e"
            text-anchor="middle">HELLO, MARS!</text
          >
        </g>

        <!-- Title -->
        <text
          x="304"
          y="744"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="90"
          letter-spacing="10"
          fill="#04040c"
          text-anchor="middle">SOJOURNER</text
        >
        <text
          x="300"
          y="740"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="90"
          letter-spacing="10"
          fill="#fff8e8"
          text-anchor="middle">SOJOURNER</text
        >
        <text
          x="300"
          y="778"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="28"
          letter-spacing="4"
          fill="#ffc850"
          text-anchor="middle">TWELVE WEEKS · ONE OASIS</text
        >
        <text
          x="300"
          y="806"
          font-family="var(--font-mono), monospace"
          font-size="11"
          letter-spacing="3"
          fill="rgba(255,248,232,0.85)"
          text-anchor="middle">FIRST WHEELED VEHICLE ON ANOTHER PLANET</text
        >
        <text
          x="300"
          y="826"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="2"
          fill="rgba(255,248,232,0.6)"
          text-anchor="middle">ARES VALLIS · 04 JULY 1997 · 11.5 KG · 100 m TOTAL ODOMETRY</text
        >
        <text
          x="40"
          y="876"
          font-family="var(--font-display), 'Bebas Neue', sans-serif"
          font-size="14"
          letter-spacing="4"
          fill="rgba(255,248,232,0.65)">ORRERY</text
        >
        <text
          x="560"
          y="876"
          font-family="var(--font-mono), monospace"
          font-size="9"
          letter-spacing="3"
          fill="rgba(255,248,232,0.55)"
          text-anchor="end">orrery.app</text
        >
      </svg>
    </figure>
  </div>

  <footer class="gallery-footer">
    <p>
      <strong>Free to download.</strong> Right-click any poster → <em>Save image as…</em>. SVG
      scales infinitely — set as wallpaper, print on a T-shirt, or use as a Zoom background. ORRERY
      watermark is baked into every piece.
    </p>
    <p>
      <strong>Style families.</strong> JPL Visions of the Future (Solar System, Earth, Moon, Mars) ·
      Era-matched single iconic motif (ISS, Tiangong, Apollo 11, Gagarin) · Indie-comic / pop-art (Sputnik,
      Voyager, Sojourner).
    </p>
  </footer>
</article>

<style>
  .gallery {
    max-width: 1400px;
    margin: 0 auto;
    padding: 32px 24px 64px;
    color: var(--color-text);
  }
  header {
    text-align: center;
    margin-bottom: 36px;
  }
  h1 {
    font-family: var(--font-display);
    font-size: 42px;
    letter-spacing: 10px;
    margin: 0 0 12px;
  }
  .lede {
    font-family: var(--font-editorial), 'Crimson Pro', serif;
    font-style: italic;
    font-size: 17px;
    color: rgba(255, 255, 255, 0.75);
    max-width: 760px;
    margin: 0 auto;
    line-height: 1.55;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .poster {
    margin: 0;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;
    background: #000;
    transition:
      border-color 0.2s,
      transform 0.2s;
  }
  .poster:hover {
    border-color: rgba(78, 205, 196, 0.4);
    transform: translateY(-2px);
  }
  .poster svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .gallery-footer {
    margin-top: 48px;
    padding: 20px 24px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
  }
  .gallery-footer p {
    font-family: var(--font-mono), monospace;
    font-size: 12px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.7);
    margin: 0 0 10px;
  }
  .gallery-footer p:last-child {
    margin-bottom: 0;
  }
  .gallery-footer strong {
    color: #4ecdc4;
    font-weight: normal;
    letter-spacing: 1px;
  }
  .gallery-footer em {
    color: rgba(255, 255, 255, 0.85);
    font-style: italic;
  }
  @media (max-width: 1023px) {
    .grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (max-width: 639px) {
    .gallery {
      padding: 16px 16px 32px;
    }
    .grid {
      grid-template-columns: 1fr;
      max-width: 480px;
      margin: 0 auto;
    }
    h1 {
      font-size: 32px;
      letter-spacing: 6px;
    }
  }
</style>

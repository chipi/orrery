<!-- Shared gradient defs for the RouteGlyph icons (the `url(#ic-*)` ids). Mount once per page,
     before the cards. An invisible 0x0 SVG keeps the layout untouched while making these ids
     reachable from every later <svg> in the document. -->
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
      <stop offset="0%" style:stop-color="var(--color-accent-hover)" />
      <stop offset="50%" style:stop-color="var(--color-accent)" />
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
    <radialGradient id="ic-venus" cx="0.35" cy="0.35" r="0.7">
      <stop offset="0%" stop-color="#fbe6c0" />
      <stop offset="50%" stop-color="#d9a441" />
      <stop offset="100%" stop-color="#5a3a12" />
    </radialGradient>
    <radialGradient id="ic-glow-gold" cx="0.5" cy="0.5" r="0.5">
      <stop offset="40%" stop-color="#e6b84a" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#e6b84a" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="ic-craft" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" style:stop-color="var(--color-accent-hover)" />
      <stop offset="60%" style:stop-color="var(--color-accent)" />
      <stop offset="100%" style:stop-color="color-mix(in srgb, var(--color-accent) 45%, #04040c)" />
    </radialGradient>
    <radialGradient id="ic-glow-blue" cx="0.5" cy="0.5" r="0.5">
      <stop offset="40%" style:stop-color="var(--color-accent)" stop-opacity="0.45" />
      <stop offset="100%" style:stop-color="var(--color-accent)" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="ic-glow-red" cx="0.5" cy="0.5" r="0.5">
      <stop offset="40%" stop-color="#c1440e" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#c1440e" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="ic-glow-accent" cx="0.5" cy="0.5" r="0.5">
      <stop offset="40%" style:stop-color="var(--color-accent)" stop-opacity="0.5" />
      <stop offset="100%" style:stop-color="var(--color-accent)" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="ic-glow-magenta" cx="0.5" cy="0.5" r="0.5">
      <stop offset="40%" stop-color="#c14ad8" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#c14ad8" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="ic-traj" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" style:stop-color="var(--color-accent)" stop-opacity="0.2" />
      <stop offset="60%" style:stop-color="var(--color-accent)" stop-opacity="1" />
      <stop offset="100%" stop-color="#c14ad8" stop-opacity="0.7" />
    </linearGradient>
    <linearGradient id="ic-panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" style:stop-color="var(--color-accent-hover)" />
      <stop offset="100%" style:stop-color="var(--color-accent)" />
    </linearGradient>
    <linearGradient id="ic-panel-gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffd87a" />
      <stop offset="100%" stop-color="#9a6818" />
    </linearGradient>
  </defs>
</svg>

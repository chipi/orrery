<!-- The Explore scale-level glyphs (Solar System → Cosmic Web), one per level: the home grid and
     the /explore hub draw the same icon for the same level. SVG children only; the caller owns the
     <svg viewBox="0 0 48 48"> and the ic-* gradient defs. `idSuffix` is appended to every gradient
     id it references: the home grid and hub use the page-wide defs (no suffix); ScaleGlyphIcon
     draws its own, uniquely suffixed, so a glyph never depends on a sibling's <defs>. -->
<svelte:options namespace="svg" />

<script lang="ts" module>
  export const SCALE_GLYPHS = new Set([
    'solar-system',
    'neighborhood',
    'milky-way',
    'local-group',
    'local-sheet',
    'virgo',
    'laniakea',
    'cosmic-web',
  ]);
</script>

<script lang="ts">
  let { glyph, idSuffix = '' }: { glyph: string; idSuffix?: string } = $props();
</script>

{#if glyph === 'solar-system'}
  <!-- Nested scale-shells: a bright solar-system core zooming OUT
     through the galaxy and Local Group to the faint cosmic web at
     the rim — the 8-shell ladder /explore now is. Warm core → cool
     rim; a few web-node dots on the outer shells. -->
  <circle cx="24" cy="24" r="15" fill="url(#ic-sun-corona{idSuffix})" opacity="0.5" />
  <!-- Shell 4 — the cosmic web (faint, dashed, with node dots) -->
  <circle
    cx="24"
    cy="24"
    r="21"
    fill="none"
    stroke="rgba(193,74,216,0.4)"
    stroke-width="0.7"
    stroke-dasharray="1.5 2.5"
  />
  <circle cx="24" cy="3" r="1.1" fill="rgba(193,74,216,0.8)" />
  <circle cx="43" cy="30" r="0.9" fill="rgba(193,74,216,0.6)" />
  <circle cx="7" cy="18" r="0.9" fill="rgba(120,169,255,0.6)" />
  <!-- Shell 3 — the Local Group -->
  <circle
    cx="24"
    cy="24"
    r="15.5"
    fill="none"
    stroke="rgba(120,169,255,0.45)"
    stroke-width="0.8"
    stroke-dasharray="3 2"
  />
  <!-- Shell 2 — the galaxy -->
  <circle cx="24" cy="24" r="10" fill="none" stroke="var(--color-accent-strong)" stroke-width="1" />
  <!-- Shell 1 — the solar system -->
  <circle cx="24" cy="24" r="5.5" fill="none" stroke="rgba(255,216,120,0.75)" stroke-width="1.1" />
  <!-- Core: the Sun -->
  <circle cx="24" cy="24" r="4.5" fill="url(#ic-sun-corona{idSuffix})" />
  <circle cx="24" cy="24" r="2.4" fill="url(#ic-sun{idSuffix})" />
{:else if glyph === 'neighborhood'}
  <!-- Stellar neighborhood — a field of nearby stars, the Sun
     highlighted at centre, with faint constellation lines. -->
  <circle cx="24" cy="24" r="3" fill="url(#ic-glow-accent{idSuffix})" />
  <circle cx="24" cy="24" r="1.6" fill="#fff7e0" />
  <circle cx="10" cy="12" r="1" fill="rgba(255,255,255,0.8)" />
  <circle cx="38" cy="10" r="1.2" fill="rgba(200,220,255,0.85)" />
  <circle cx="41" cy="30" r="0.9" fill="rgba(255,255,255,0.6)" />
  <circle cx="12" cy="36" r="1.1" fill="rgba(255,230,200,0.8)" />
  <circle cx="31" cy="38" r="0.8" fill="rgba(255,255,255,0.55)" />
  <circle cx="15" cy="23" r="0.7" fill="rgba(255,255,255,0.5)" />
  <circle cx="34" cy="20" r="0.9" fill="rgba(200,220,255,0.7)" />
  <line x1="10" y1="12" x2="15" y2="23" stroke="rgba(120,169,255,0.28)" stroke-width="0.5" />
  <line x1="38" y1="10" x2="34" y2="20" stroke="rgba(120,169,255,0.28)" stroke-width="0.5" />
{:else if glyph === 'milky-way'}
  <!-- Milky Way — a face-on spiral: bright bar core + two arms. -->
  <circle cx="24" cy="24" r="13" fill="url(#ic-glow-blue{idSuffix})" opacity="0.35" />
  <path
    d="M 24 24 Q 35 21 40 29 Q 42 35 33 37"
    fill="none"
    stroke="rgba(180,205,255,0.6)"
    stroke-width="1.4"
  />
  <path
    d="M 24 24 Q 13 27 8 19 Q 6 13 15 11"
    fill="none"
    stroke="rgba(180,205,255,0.6)"
    stroke-width="1.4"
  />
  <ellipse
    cx="24"
    cy="24"
    rx="5"
    ry="2.3"
    fill="url(#ic-sun-corona{idSuffix})"
    transform="rotate(-25 24 24)"
  />
  <ellipse cx="24" cy="24" rx="3" ry="1.4" fill="#ffd87a" transform="rotate(-25 24 24)" />
  <circle cx="37" cy="31" r="0.7" fill="#fff" />
  <circle cx="11" cy="16" r="0.7" fill="#fff" />
{:else if glyph === 'local-group'}
  <!-- Local Group — galaxies bound together: Milky Way + Andromeda
     + a couple of dwarfs, inside a faint binding halo. -->
  <circle
    cx="24"
    cy="24"
    r="18"
    fill="none"
    stroke="rgba(120,169,255,0.16)"
    stroke-width="0.6"
    stroke-dasharray="2 3"
  />
  <ellipse
    cx="18"
    cy="20"
    rx="7"
    ry="2.6"
    fill="rgba(108,169,255,0.2)"
    stroke="rgba(108,169,255,0.6)"
    stroke-width="0.8"
    transform="rotate(-20 18 20)"
  />
  <circle cx="18" cy="20" r="1.4" fill="#ffd87a" />
  <ellipse
    cx="32"
    cy="30"
    rx="6"
    ry="2.2"
    fill="rgba(255,200,120,0.18)"
    stroke="rgba(255,216,160,0.6)"
    stroke-width="0.8"
    transform="rotate(30 32 30)"
  />
  <circle cx="32" cy="30" r="1.2" fill="#fff2d0" />
  <circle cx="34" cy="14" r="2" fill="rgba(180,205,255,0.3)" />
  <circle cx="34" cy="14" r="0.9" fill="#cfe0ff" />
  <circle cx="12" cy="34" r="1.6" fill="rgba(180,205,255,0.25)" />
  <circle cx="12" cy="34" r="0.7" fill="#cfe0ff" />
{:else if glyph === 'local-sheet'}
  <!-- Local Sheet — a thin, near-flat slab of galaxy groups, seen
       slightly edge-on: dots scattered in a shallow band. -->
  <ellipse
    cx="24"
    cy="24"
    rx="20"
    ry="5"
    fill="rgba(120,169,255,0.08)"
    stroke="rgba(120,169,255,0.3)"
    stroke-width="0.7"
    transform="rotate(-12 24 24)"
  />
  <g transform="rotate(-12 24 24)">
    <circle cx="24" cy="24" r="1.6" fill="var(--color-accent)" />
    <circle cx="10" cy="23" r="1.3" fill="#dfe8ff" />
    <circle cx="16" cy="26" r="1" fill="#cfe0ff" />
    <circle cx="32" cy="22" r="1.4" fill="#ffe6c0" />
    <circle cx="38" cy="25" r="1.1" fill="#dfe8ff" />
    <circle cx="20" cy="22" r="0.8" fill="#cfe0ff" />
    <circle cx="29" cy="26" r="0.9" fill="#cfe0ff" />
  </g>
{:else if glyph === 'virgo'}
  <!-- Virgo Supercluster — a dominant warm central cluster + the
       accent blue "you are here" group + scattered smaller groups. -->
  <circle cx="28" cy="22" r="9" fill="url(#ic-glow-gold{idSuffix})" />
  <circle cx="28" cy="22" r="4" fill="url(#ic-sun-corona{idSuffix})" />
  <circle cx="28" cy="22" r="2" fill="#ffd87a" />
  <circle cx="13" cy="32" r="3" fill="url(#ic-glow-accent{idSuffix})" />
  <circle cx="13" cy="32" r="1.4" fill="var(--color-accent)" />
  <circle cx="16" cy="14" r="1.2" fill="#dfe8ff" />
  <circle cx="38" cy="34" r="1.3" fill="#dfe8ff" />
  <circle cx="40" cy="16" r="1" fill="#cfe0ff" />
  <circle cx="22" cy="36" r="1" fill="#cfe0ff" />
{:else if glyph === 'laniakea'}
  <!-- Laniakea — a basin of flows: streamlines curving inward to a
       bright focus (the Great Attractor), our group on the rim. -->
  <circle cx="30" cy="26" r="7" fill="url(#ic-glow-gold{idSuffix})" />
  <circle cx="30" cy="26" r="2.4" fill="#ffcf6a" />
  <path
    d="M 6 10 Q 20 18 29 24"
    fill="none"
    stroke="color-mix(in srgb, var(--color-accent) 55%, transparent)"
    stroke-width="1"
  />
  <path
    d="M 8 38 Q 22 32 29 27"
    fill="none"
    stroke="color-mix(in srgb, var(--color-accent) 50%, transparent)"
    stroke-width="1"
  />
  <path d="M 44 12 Q 36 18 31 24" fill="none" stroke="rgba(180,205,255,0.45)" stroke-width="0.9" />
  <circle cx="6" cy="10" r="2" fill="url(#ic-glow-accent{idSuffix})" />
  <circle cx="6" cy="10" r="1" fill="var(--color-accent)" />
{:else if glyph === 'cosmic-web'}
  <!-- Cosmic Web — nodes joined by faint filaments around a dark
       void: the largest-scale foam. -->
  <circle
    cx="26"
    cy="24"
    r="9"
    fill="none"
    stroke="rgba(255,255,255,0.08)"
    stroke-width="0.6"
    stroke-dasharray="2 3"
  />
  <g stroke="rgba(180,205,255,0.3)" stroke-width="0.7" fill="none">
    <path d="M 8 12 L 20 20 L 34 10 L 42 20" />
    <path d="M 10 36 L 22 30 L 36 38" />
    <path d="M 20 20 L 22 30" />
    <path d="M 34 10 L 36 38" />
    <path d="M 8 12 L 10 36" />
  </g>
  <circle cx="20" cy="20" r="1.6" fill="#dfe8ff" />
  <circle cx="34" cy="10" r="1.4" fill="#ffe6c0" />
  <circle cx="36" cy="38" r="1.5" fill="#dfe8ff" />
  <circle cx="22" cy="30" r="1.2" fill="#cfe0ff" />
  <circle cx="42" cy="20" r="1" fill="#cfe0ff" />
  <circle cx="8" cy="12" r="1.1" fill="#cfe0ff" />
{/if}

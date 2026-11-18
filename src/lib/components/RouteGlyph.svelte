<!-- Every route-card glyph (the 48x48 icons on the home grid and the section hubs) in ONE place.
     SVG children only: the caller owns the <svg viewBox="0 0 48 48"> and mounts RouteGlyphDefs once
     per page for the ic-* gradients these shapes reference. The Explore scale-level glyphs are
     ScaleGlyph's; this draws the rest, keyed by glyph id.
     `variant` picks between the two drawings that exist for earth, programs, live and essays: 'home'
     is the home grid's, 'hub' the section hubs' (RouteCardGrid). Every other glyph is one drawing. -->
<svelte:options namespace="svg" />

<script lang="ts" module>
  export const ROUTE_GLYPHS = new Set([
    'earth',
    'moon',
    'mars',
    'venus',
    'missions',
    'fleet',
    'plan',
    'fly',
    'iss',
    'tiangong',
    'science',
    'programs',
    'live',
    'essays',
    'lab',
  ]);
</script>

<script lang="ts">
  import ScaleGlyph, { SCALE_GLYPHS } from './ScaleGlyph.svelte';

  let { glyph, variant = 'home' }: { glyph: string; variant?: 'home' | 'hub' } = $props();
</script>

{#if SCALE_GLYPHS.has(glyph)}
  <ScaleGlyph {glyph} />
{:else if variant === 'hub' && glyph === 'earth'}
  <!-- Earth: blue gradient + atmosphere halo + ISS orbit + GPS dot -->
  <circle cx="24" cy="24" r="16" fill="url(#ic-glow-blue)" />
  <circle cx="24" cy="24" r="11" fill="url(#ic-earth)" />
  <!-- Continent hint -->
  <path d="M 18 22 Q 22 18 26 22 Q 28 26 24 28 Q 20 26 18 22 Z" fill="rgba(140,180,120,0.55)" />
  <path d="M 28 26 Q 31 24 32 27" fill="none" stroke="rgba(140,180,120,0.45)" stroke-width="1" />
  <!-- Atmosphere ring -->
  <circle
    cx="24"
    cy="24"
    r="11.5"
    fill="none"
    style:stroke="color-mix(in srgb, var(--color-accent) 45%, transparent)"
    stroke-width="0.6"
  />
  <!-- ISS orbit -->
  <ellipse
    cx="24"
    cy="24"
    rx="18"
    ry="6"
    fill="none"
    style:stroke="var(--color-accent)"
    stroke-width="1"
    stroke-dasharray="2 2"
  />
  <circle cx="42" cy="24" r="2" fill="url(#ic-glow-accent)" />
  <circle cx="42" cy="24" r="1.2" style:fill="var(--color-accent)" />
{:else if glyph === 'earth'}
  <!-- Earth: blue gradient + atmosphere halo + ISS orbit + GPS dot -->
  <circle cx="24" cy="24" r="16" fill="url(#ic-glow-blue)" />
  <circle cx="24" cy="24" r="11" fill="url(#ic-earth)" />
  <path d="M 18 22 Q 22 18 26 22 Q 28 26 24 28 Q 20 26 18 22 Z" fill="rgba(140,180,120,0.55)" />
  <circle
    cx="24"
    cy="24"
    r="11.5"
    fill="none"
    style:stroke="color-mix(in srgb, var(--color-accent) 45%, transparent)"
    stroke-width="0.6"
  />
  <ellipse
    cx="24"
    cy="24"
    rx="18"
    ry="6"
    fill="none"
    style:stroke="var(--color-accent)"
    stroke-width="1"
    stroke-dasharray="2 2"
  />
  <circle cx="42" cy="24" r="2" fill="url(#ic-glow-accent)" />
  <circle cx="42" cy="24" r="1.2" style:fill="var(--color-accent)" />
{:else if glyph === 'moon'}
  <!-- Moon: grey disc + craters + Apollo flag marker -->
  <circle
    cx="22"
    cy="24"
    r="16"
    style:fill="color-mix(in srgb, var(--color-accent) 18%, transparent)"
  />
  <circle cx="22" cy="24" r="13" fill="url(#ic-moon)" />
  <ellipse cx="18" cy="20" rx="2.4" ry="2.2" fill="rgba(60,55,50,0.7)" />
  <ellipse cx="18.5" cy="19.5" rx="1.8" ry="1.6" fill="rgba(168,160,156,0.7)" />
  <ellipse cx="27" cy="26" rx="3" ry="2.6" fill="rgba(60,55,50,0.65)" />
  <ellipse cx="27.5" cy="25.5" rx="2.4" ry="2" fill="rgba(168,160,156,0.7)" />
  <ellipse cx="20" cy="30" rx="1.6" ry="1.4" fill="rgba(60,55,50,0.6)" />
  <line x1="25" y1="22" x2="25" y2="17" stroke="rgba(255,255,255,0.7)" stroke-width="0.6" />
  <polygon points="25,17 28,18 25,19" fill="#c1440e" />
{:else if glyph === 'mars'}
  <!-- Mars: red gradient + polar caps + Olympus Mons hint -->
  <circle cx="24" cy="24" r="16" fill="url(#ic-glow-red)" />
  <circle cx="24" cy="24" r="13" fill="url(#ic-mars)" />
  <ellipse cx="24" cy="12.5" rx="5" ry="2" fill="rgba(255,255,255,0.85)" />
  <ellipse cx="24" cy="35.5" rx="4" ry="1.6" fill="rgba(245,235,225,0.78)" />
  <ellipse cx="19" cy="22" rx="2.6" ry="1.5" fill="rgba(80,28,8,0.55)" />
  <ellipse cx="29" cy="27" rx="2" ry="1.2" fill="rgba(80,28,8,0.55)" />
  <circle cx="20" cy="26" r="1.4" fill="rgba(255,200,140,0.55)" />
  <circle cx="20" cy="26" r="0.6" fill="rgba(120,40,8,0.7)" />
  <circle cx="24" cy="24" r="13.5" fill="none" stroke="rgba(244,178,152,0.5)" stroke-width="0.5" />
{:else if glyph === 'venus'}
  <!-- Venus: cream-gold disc under an opaque cloud deck -->
  <circle cx="24" cy="24" r="16" fill="url(#ic-glow-gold)" />
  <circle cx="24" cy="24" r="13" fill="url(#ic-venus)" />
  <path d="M 12 20 Q 24 17 36 21" fill="none" stroke="rgba(255,240,210,0.4)" stroke-width="1.2" />
  <path d="M 12 25 Q 24 28 36 24" fill="none" stroke="rgba(210,160,90,0.45)" stroke-width="1.4" />
  <path d="M 14 30 Q 24 32 34 29" fill="none" stroke="rgba(255,240,210,0.32)" stroke-width="1" />
  <circle cx="24" cy="24" r="13.6" fill="none" stroke="rgba(255,236,190,0.55)" stroke-width="0.9" />
{:else if glyph === 'missions'}
  <!-- Capsule with engine glow on a rising trajectory + planet horizon -->
  <path d="M 0 44 Q 24 36 48 44 L 48 48 L 0 48 Z" style:fill="var(--color-accent-edge)" />
  <path
    d="M 0 44 Q 24 36 48 44"
    fill="none"
    style:stroke="var(--color-accent-strong)"
    stroke-width="0.8"
  />
  <path
    d="M 6 38 Q 24 6 42 18"
    fill="none"
    stroke="url(#ic-traj)"
    stroke-width="1.6"
    stroke-dasharray="3 2"
  />
  <circle cx="24" cy="16" r="5" fill="url(#ic-glow-accent)" />
  <ellipse cx="24" cy="16" rx="2" ry="3" fill="url(#ic-craft)" />
  <ellipse cx="24" cy="22" rx="1.6" ry="1.6" fill="#ffc850" opacity="0.85" />
{:else if glyph === 'fleet'}
  <!-- Three spacecraft silhouettes, layered with depth (back row dim, front bright accent blue) -->
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
    <rect x="3" y="10" width="3" height="4" style:fill="var(--color-accent-strong)" />
    <rect x="18" y="10" width="3" height="4" style:fill="var(--color-accent-strong)" />
  </g>
  <g>
    <rect
      x="20"
      y="20"
      width="20"
      height="9"
      rx="1.2"
      style:fill="color-mix(in srgb, var(--color-accent) 18%, transparent)"
      style:stroke="var(--color-accent)"
      stroke-width="1.2"
    />
    <rect x="15" y="22" width="5" height="5" fill="url(#ic-panel)" />
    <rect x="40" y="22" width="5" height="5" fill="url(#ic-panel)" />
    <circle cx="30" cy="24.5" r="1.2" style:fill="var(--color-accent-hover)" />
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
{:else if glyph === 'plan'}
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
  <!-- Row 1 (bottom = cheapest, brightest accent blue lobe in middle) -->
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
  <rect x="21" y="21" width="6.8" height="6.8" style:fill="var(--color-accent)" />
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
{:else if glyph === 'fly'}
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
  <circle cx="24" cy="14" r="4" fill="url(#ic-glow-accent)" />
  <polygon points="20,14 28,18 20,22 22,18" fill="url(#ic-craft)" />
{:else if glyph === 'iss'}
  <!-- ISS: glowing solar panels (gradient accent blue) + truss with depth + Earth glow at bottom -->
  <ellipse
    cx="24"
    cy="46"
    rx="24"
    ry="6"
    style:fill="color-mix(in srgb, var(--color-accent) 18%, transparent)"
  />
  <line x1="6" y1="22" x2="42" y2="22" stroke="rgba(255,255,255,0.65)" stroke-width="1" />
  <line x1="6" y1="26" x2="42" y2="26" stroke="rgba(255,255,255,0.45)" stroke-width="0.7" />
  <!-- Solar panels (glowing) -->
  <rect
    x="2"
    y="18"
    width="6"
    height="12"
    fill="url(#ic-panel)"
    style:stroke="var(--color-accent-strong)"
    stroke-width="0.5"
  />
  <rect
    x="40"
    y="18"
    width="6"
    height="12"
    fill="url(#ic-panel)"
    style:stroke="var(--color-accent-strong)"
    stroke-width="0.5"
  />
  <line x1="2" y1="22" x2="8" y2="22" stroke="rgba(15,40,38,0.6)" stroke-width="0.4" />
  <line x1="40" y1="22" x2="46" y2="22" stroke="rgba(15,40,38,0.6)" stroke-width="0.4" />
  <line x1="2" y1="26" x2="8" y2="26" stroke="rgba(15,40,38,0.6)" stroke-width="0.4" />
  <line x1="40" y1="26" x2="46" y2="26" stroke="rgba(15,40,38,0.6)" stroke-width="0.4" />
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
  <circle cx="24" cy="36" r="1.4" style:fill="var(--color-accent)" />
{:else if glyph === 'tiangong'}
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
  <line x1="20" y1="14" x2="28" y2="14" stroke="rgba(255,216,160,0.5)" stroke-width="0.4" />
  <line x1="20" y1="22" x2="28" y2="22" stroke="rgba(255,216,160,0.5)" stroke-width="0.4" />
  <line x1="20" y1="30" x2="28" y2="30" stroke="rgba(255,216,160,0.5)" stroke-width="0.4" />
  <line x1="20" y1="38" x2="28" y2="38" stroke="rgba(255,216,160,0.5)" stroke-width="0.4" />
  <!-- Wentian + Mengtian (horizontal labs in accent blue) -->
  <rect
    x="6"
    y="20"
    width="36"
    height="8"
    style:fill="color-mix(in srgb, var(--color-accent) 18%, transparent)"
    style:stroke="var(--color-accent)"
    stroke-width="0.9"
  />
  <line
    x1="14"
    y1="20"
    x2="14"
    y2="28"
    style:stroke="var(--color-accent-edge)"
    stroke-width="0.4"
  />
  <line
    x1="34"
    y1="20"
    x2="34"
    y2="28"
    style:stroke="var(--color-accent-edge)"
    stroke-width="0.4"
  />
  <!-- Solar panel wings (gold) -->
  <rect x="0" y="22" width="6" height="4" fill="url(#ic-panel-gold)" />
  <rect x="42" y="22" width="6" height="4" fill="url(#ic-panel-gold)" />
  <!-- Center docking port glow -->
  <circle cx="24" cy="24" r="2.5" fill="url(#ic-glow-accent)" />
  <circle cx="24" cy="24" r="1.2" style:fill="var(--color-accent)" />
{:else if glyph === 'science'}
  <!-- Atomic / orbital science glyph: nucleus + 3 multi-colored electron orbits + ∆v formula -->
  <ellipse
    cx="24"
    cy="24"
    rx="20"
    ry="7"
    fill="none"
    style:stroke="var(--color-accent)"
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
  <circle cx="44" cy="24" r="1.6" style:fill="var(--color-accent)" />
  <circle cx="14" cy="14" r="1.6" fill="#c14ad8" />
  <circle cx="34" cy="36" r="1.6" fill="#ffc850" />
  <!-- Nucleus glow -->
  <circle cx="24" cy="24" r="6" fill="url(#ic-sun-corona)" />
  <circle cx="24" cy="24" r="3.2" fill="url(#ic-sun)" />
{:else if variant === 'hub' && glyph === 'programs'}
  <!-- Programs: a mission-patch badge — gold ring, navy field, a
     rising trajectory to a star, small agency-star markers. -->
  <circle cx="24" cy="24" r="17" fill="none" stroke="url(#ic-panel-gold)" stroke-width="2" />
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
  <circle cx="24" cy="12.5" r="1.4" fill="url(#ic-glow-accent)" />
  <circle cx="24" cy="12.5" r="0.7" style:fill="var(--color-accent-hover)" />
{:else if glyph === 'programs'}
  <!-- Programs — an era spine: a vertical timeline with program-era
   dots (each a different agency accent) + a small pennant. -->
  <line x1="14" y1="6" x2="14" y2="42" stroke="rgba(255,255,255,0.35)" stroke-width="1" />
  <polygon points="14,7 30,10 14,13" style:fill="var(--color-accent-strong)" />
  <circle cx="14" cy="12" r="2.4" style:fill="var(--color-accent)" />
  <circle cx="14" cy="22" r="2.4" fill="#ffc850" />
  <circle cx="14" cy="32" r="2.4" fill="#c14ad8" />
  <circle cx="14" cy="40" r="2.4" fill="#6aa9ff" />
  <line x1="18" y1="22" x2="34" y2="22" stroke="rgba(255,200,80,0.5)" stroke-width="0.7" />
  <line x1="18" y1="32" x2="30" y2="32" stroke="rgba(193,74,216,0.5)" stroke-width="0.7" />
{:else if variant === 'hub' && glyph === 'live'}
  <!-- Live-broadcast glyph: a signal dot radiating concentric arcs -->
  <circle cx="24" cy="24" r="4" fill="#c62f2f" />
  <path
    d="M 33 15 A 13 13 0 0 1 33 33"
    fill="none"
    stroke="#ff6b6b"
    stroke-width="1.6"
    stroke-linecap="round"
  />
  <path
    d="M 15 33 A 13 13 0 0 1 15 15"
    fill="none"
    stroke="#ff6b6b"
    stroke-width="1.6"
    stroke-linecap="round"
  />
  <path
    d="M 38 10 A 20 20 0 0 1 38 38"
    fill="none"
    stroke="rgba(255,107,107,0.5)"
    stroke-width="1.4"
    stroke-linecap="round"
  />
  <path
    d="M 10 38 A 20 20 0 0 1 10 10"
    fill="none"
    stroke="rgba(255,107,107,0.5)"
    stroke-width="1.4"
    stroke-linecap="round"
  />
{:else if glyph === 'live'}
  <!-- Live — a broadcast: concentric signal arcs + a red REC dot. -->
  <circle cx="18" cy="30" r="2.6" fill="#e23b3b" />
  <path
    d="M 23 30 A 7 7 0 0 1 23 24"
    fill="none"
    stroke="rgba(226,59,59,0.7)"
    stroke-width="1.4"
    transform="rotate(-45 18 30)"
  />
  <path
    d="M 12 22 A 12 12 0 0 1 30 22"
    fill="none"
    stroke="rgba(255,255,255,0.5)"
    stroke-width="1.2"
  />
  <path
    d="M 8 20 A 18 18 0 0 1 36 20"
    fill="none"
    stroke="rgba(255,255,255,0.28)"
    stroke-width="1"
  />
  <path
    d="M 4 18 A 24 24 0 0 1 42 18"
    fill="none"
    style:stroke="var(--color-accent-edge)"
    stroke-width="0.8"
    stroke-dasharray="2 2"
  />
{:else if variant === 'hub' && glyph === 'essays'}
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
    style:fill="color-mix(in srgb, var(--color-accent) 8%, transparent)"
    style:stroke="var(--color-accent)"
    stroke-width="1"
  />
  <line x1="24" y1="15" x2="24" y2="35" stroke="rgba(255,255,255,0.5)" stroke-width="0.8" />
  <!-- Text lines (left page) -->
  <line x1="10" y1="19" x2="20" y2="20" stroke="rgba(255,255,255,0.3)" stroke-width="0.6" />
  <line x1="10" y1="23" x2="20" y2="24" stroke="rgba(255,255,255,0.3)" stroke-width="0.6" />
  <line x1="10" y1="27" x2="18" y2="28" stroke="rgba(255,255,255,0.3)" stroke-width="0.6" />
  <!-- The long view: a star above the right page -->
  <circle cx="35" cy="11" r="3" fill="url(#ic-glow-accent)" />
  <circle cx="35" cy="11" r="1.3" fill="#ffc850" />
{:else if glyph === 'essays'}
  <!-- Essays — an open book: two facing pages with text lines + a
   bookmark ribbon. -->
  <path
    d="M 24 12 Q 14 9 6 12 L 6 36 Q 14 33 24 36 Z"
    style:fill="var(--color-accent-soft)"
    style:stroke="var(--color-accent)"
    stroke-width="1"
  />
  <path
    d="M 24 12 Q 34 9 42 12 L 42 36 Q 34 33 24 36 Z"
    fill="rgba(255,255,255,0.04)"
    stroke="rgba(255,255,255,0.5)"
    stroke-width="1"
  />
  <line x1="24" y1="13" x2="24" y2="35" stroke="rgba(255,255,255,0.4)" />
  <g style:stroke="color-mix(in srgb, var(--color-accent) 50%, transparent)" stroke-width="0.7">
    <line x1="10" y1="17" x2="20" y2="16" />
    <line x1="10" y1="21" x2="20" y2="20" />
    <line x1="10" y1="25" x2="19" y2="24" />
  </g>
  <g stroke="rgba(255,255,255,0.4)" stroke-width="0.7">
    <line x1="28" y1="16" x2="38" y2="17" />
    <line x1="28" y1="20" x2="38" y2="21" />
    <line x1="29" y1="24" x2="37" y2="25" />
  </g>
  <polygon points="34,12 38,12 38,20 36,18 34,20" fill="#ffc850" />
{:else if glyph === 'lab'}
  <!-- Lab: a notebook page ruled with a grid, a thrown-body parabola (dashed, the trajectory
     gradient) ending in a glowing gold marker, and a thrust arrow at the launch point. -->
  <rect
    x="9"
    y="5"
    width="30"
    height="38"
    rx="2"
    fill="rgba(255,255,255,0.05)"
    stroke="rgba(255,255,255,0.55)"
    stroke-width="1"
  />
  <g stroke="rgba(255,255,255,0.14)" stroke-width="0.5">
    <line x1="9" y1="15" x2="39" y2="15" />
    <line x1="9" y1="25" x2="39" y2="25" />
    <line x1="9" y1="35" x2="39" y2="35" />
    <line x1="19" y1="5" x2="19" y2="43" />
    <line x1="29" y1="5" x2="29" y2="43" />
  </g>
  <line x1="13" y1="39" x2="36" y2="39" stroke="rgba(255,255,255,0.45)" stroke-width="0.8" />
  <path
    d="M 14 39 Q 24 5 35 33"
    fill="none"
    stroke="url(#ic-traj)"
    stroke-width="1.6"
    stroke-dasharray="3 2"
  />
  <circle cx="24" cy="22" r="4.5" fill="url(#ic-glow-accent)" />
  <circle cx="24" cy="22" r="1.8" fill="#ffc850" />
  <polygon
    points="14,31 17.5,35.5 14.8,35.5 14.8,39 13.2,39 13.2,35.5 10.5,35.5"
    style:fill="var(--color-accent)"
  />
{/if}
